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
    sched.start()
    _scheduler = sched
    logger.info(
        "scheduler.started",
        hour=_DEFAULT_CRON_HOUR,
        minute=_DEFAULT_CRON_MIN,
        tz=_DEFAULT_TZ,
    )
    return sched


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
