"""APScheduler 기반 자동 수집 — Phase 4-T2.3.

매일 02:00 KST 에 모든 활성 Keyword 에 대해 collect_for_keyword 를 실행한다.
Streamlit 컨테이너 안에서 동작 (BackgroundScheduler) — 컨테이너 재시작 시 작업 유실은
정의서 명시 한계 (Celery+Redis 는 Phase 6+).

API:
- ``start_scheduler(SessionLocal)`` — 멱등. 이미 시작돼 있으면 같은 인스턴스 반환.
- ``stop_scheduler()`` — 종료 (테스트 cleanup 용)
- ``daily_measurement_job(SessionLocal)`` — 작업 본체. 외부에서 직접 호출도 가능.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_DEFAULT_CRON_HOUR = int(os.getenv("MEASUREMENT_CRON_HOUR", "2"))
_DEFAULT_CRON_MIN = int(os.getenv("MEASUREMENT_CRON_MIN", "0"))
_DEFAULT_TZ = os.getenv("MEASUREMENT_TZ", "Asia/Seoul")
_JOB_ID = "daily_measurement"

# 자동 콘텐츠 큐 — 새벽 3시 (측정 1시간 후) 활성 키워드 × N 채널 → status="draft"
_CONTENT_CRON_HOUR = int(os.getenv("AUTO_CONTENT_CRON_HOUR", "3"))
_CONTENT_CRON_MIN = int(os.getenv("AUTO_CONTENT_CRON_MIN", "0"))
_CONTENT_JOB_ID = "daily_auto_content"

_scheduler: Any = None  # BackgroundScheduler 인스턴스 (lazy init)


def daily_measurement_job(session_factory) -> dict:
    """모든 tenant 의 활성 keyword 에 대해 수집 실행.

    동기 함수 — 내부에서 asyncio.run 으로 collector 호출. 한 keyword 가 다음 keyword 를
    블로킹하므로 직렬 실행 (concurrency 는 keyword 안에서만 적용).
    """
    from src.collector.collect import collect_for_keyword
    from src.engines import get_engine
    from src.storage.models import Keyword

    engine = get_engine()
    summary = {"keywords": 0, "success": 0, "failed": 0, "mentions": 0}

    with session_factory() as s:
        active_keywords = s.query(Keyword).filter(Keyword.is_active == True).all()  # noqa: E712
        # detach — 다음 with 블록에서 expire 될까봐 dict 로 dump
        kw_data = [(k.id, k.tenant_id, k.text, k.target_brand) for k in active_keywords]

    summary["keywords"] = len(kw_data)
    logger.info("scheduler.run", n_keywords=len(kw_data), engine=engine.name)

    for kid, tid, _text, _brand in kw_data:
        with session_factory() as s:
            kw = s.get(Keyword, kid)
            if kw is None:
                continue
            try:
                result = asyncio.run(collect_for_keyword(
                    session_factory, tid, kw, engine, n_samples=30, concurrency=5,
                ))
                summary["success"] += result.n_success
                summary["failed"] += result.n_failed
                summary["mentions"] += result.n_mentions
                if result.guardrail_stopped:
                    logger.warning("scheduler.guardrail", tenant_id=tid, keyword_id=kid)
                    break  # 한도 초과 → 더 진행하지 않음
            except Exception as e:  # pragma: no cover
                logger.error("scheduler.error", error=str(e), tenant_id=tid, keyword_id=kid)
                summary["failed"] += 1

    logger.info("scheduler.run_complete", **summary)
    return summary


def start_scheduler(session_factory) -> Any:
    """BackgroundScheduler 시작 + daily 작업 등록 (멱등).

    이미 시작돼 있으면 같은 인스턴스 반환. Streamlit 의 ``_bootstrap()`` 끝에서
    한 번만 호출하면 충분.
    """
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError as e:  # pragma: no cover
        logger.warning("scheduler.apscheduler_unavailable", error=str(e))
        return None

    if _scheduler is not None and _scheduler.running:
        logger.info("scheduler.already_running")
        return _scheduler

    sched = BackgroundScheduler(timezone=_DEFAULT_TZ)
    sched.add_job(
        func=daily_measurement_job,
        args=[session_factory],
        trigger=CronTrigger(hour=_DEFAULT_CRON_HOUR, minute=_DEFAULT_CRON_MIN),
        id=_JOB_ID,
        name="Daily AI mention measurement",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    sched.add_job(
        func=daily_auto_content_job,
        args=[session_factory],
        trigger=CronTrigger(hour=_CONTENT_CRON_HOUR, minute=_CONTENT_CRON_MIN),
        id=_CONTENT_JOB_ID,
        name="Daily auto content draft generation",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    sched.start()
    _scheduler = sched
    logger.info(
        "scheduler.started",
        hour=_DEFAULT_CRON_HOUR,
        minute=_DEFAULT_CRON_MIN,
        tz=_DEFAULT_TZ,
    )
    return sched


def daily_auto_content_job(session_factory) -> dict:
    """활성 ``AutoContentSetting`` 마다 ``daily_count`` 만큼 ``draft`` 콘텐츠 생성.

    - tenant 의 모든 활성 ``Keyword`` × ``AutoContentSetting.channels`` 를 (keyword, channel)
      쌍으로 round-robin 하여 daily_count 슬롯을 채운다. 키워드/채널이 충분히 다양하면
      매일 서로 다른 조합이 생성되고, 어느 한쪽이 1개여도 안전하게 동작한다.
    - 결과물은 ``GeneratedContent.status="draft"`` — 사용자가 임시 저장함에서 검수 후 publish
    """
    from datetime import datetime as _dt, timezone as _tz

    from src.storage.models import (
        AutoContentSetting,
        Keyword,
    )

    summary = {"tenants": 0, "drafts": 0, "errors": 0}
    default_channels = ["schema_org", "blog_html", "naver_blog", "instagram"]

    with session_factory() as s:
        settings = s.query(AutoContentSetting).filter(
            AutoContentSetting.enabled == True  # noqa: E712
        ).all()
        plans = [
            (
                st.tenant_id,
                int(st.daily_count or 1),
                list(st.channels) if st.channels else list(default_channels),
            )
            for st in settings
        ]

    for tenant_id, daily_count, channels in plans:
        with session_factory() as s:
            kws = (
                s.query(Keyword)
                .filter(Keyword.tenant_id == tenant_id, Keyword.is_active == True)  # noqa: E712
                .order_by(Keyword.id)
                .all()
            )
            keyword_texts = [k.text for k in kws]
        if not keyword_texts:
            continue

        summary["tenants"] += 1
        ch_cycle = channels or default_channels
        for i in range(daily_count):
            keyword_text = keyword_texts[i % len(keyword_texts)]
            channel = ch_cycle[i % len(ch_cycle)]
            try:
                _generate_draft(session_factory, tenant_id, keyword_text, channel)
                summary["drafts"] += 1
            except Exception as e:  # pragma: no cover
                logger.error(
                    "scheduler.auto_content_error",
                    tenant_id=tenant_id,
                    keyword=keyword_text,
                    channel=channel,
                    error=str(e),
                )
                summary["errors"] += 1

        with session_factory() as s:
            st_row = (
                s.query(AutoContentSetting)
                .filter(AutoContentSetting.tenant_id == tenant_id)
                .first()
            )
            if st_row is not None:
                st_row.last_run_at = _dt.now(_tz.utc)
                s.commit()

    logger.info("scheduler.auto_content_complete", **summary)
    return summary


def _generate_draft(session_factory, tenant_id: int, keyword: str, channel: str) -> None:
    """1건 자동 생성 → status='draft' 로 저장. 실패 시 raise.

    generator 가 default status='published' 로 저장하므로 직후 update 한다.
    """
    from src.content.generator import (
        generate_blog_post,
        generate_faq_content,
        generate_instagram_content,
        generate_naver_blog_content,
    )
    from src.storage.models import GeneratedContent

    saved_id: int | None = None
    with session_factory() as s:
        if channel == "schema_org":
            r = generate_faq_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        elif channel == "blog_html":
            r = generate_blog_post(s, tenant_id=tenant_id, keyword=keyword, save=True)
        elif channel == "naver_blog":
            r = generate_naver_blog_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        elif channel == "instagram":
            r = generate_instagram_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        else:
            return
        saved_id = getattr(r, "saved_id", None)

    if saved_id is not None:
        with session_factory() as s:
            obj = s.get(GeneratedContent, saved_id)
            if obj is not None:
                obj.status = "draft"
                s.commit()


def stop_scheduler() -> None:
    """BackgroundScheduler 종료. 멱등."""
    global _scheduler
    if _scheduler is None:
        return
    try:
        if _scheduler.running:
            _scheduler.shutdown(wait=False)
    except Exception:  # pragma: no cover
        pass
    _scheduler = None


def get_scheduled_jobs() -> list[dict]:
    """현재 등록된 작업 정보 (UI 표시용)."""
    if _scheduler is None or not _scheduler.running:
        return []
    return [
        {
            "id": j.id,
            "name": j.name,
            "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
        }
        for j in _scheduler.get_jobs()
    ]
