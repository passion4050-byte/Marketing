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

    from src.storage.models import Tenant as _Tenant

    summary = {"tenants": 0, "drafts": 0, "published": 0, "errors": 0}
    default_channels = ["schema_org", "blog_html", "naver_blog", "instagram"]

    # Round 28 (2026-05-30): 로테이션 정책
    #   - 매일 자사 1편 + 파트너 1편 (총 2편) 만 발행 → Pollinations 부담·운영 검수량 절감
    #   - 각 set 에서 last_run_at 가장 오래된 tenant 1개 선택 → 자연 로테이션
    #   - last_run_at NULL 인 신규 tenant 가 가장 먼저 발행됨
    with session_factory() as s:
        active_settings = (
            s.query(AutoContentSetting)
            .filter(AutoContentSetting.enabled == True)  # noqa: E712
            .order_by(
                AutoContentSetting.last_run_at.asc().nullsfirst(),
                AutoContentSetting.tenant_id.asc(),
            )
            .all()
        )
        self_settings = []
        partner_settings = []
        for st in active_settings:
            tenant = s.get(_Tenant, st.tenant_id)
            if tenant is None:
                continue
            bm = (getattr(tenant, "business_model", "") or "").strip().lower()
            ps = (getattr(tenant, "partner_slug", "") or "").strip().lower()
            is_self = bm == "self" or ps == "medimap-self"
            if is_self:
                self_settings.append(st)
            else:
                partner_settings.append(st)

        # 각 set 에서 1개씩만 선택 (last_run_at ASC 이미 정렬됨 → [0] 이 가장 오래된 것)
        rotated = []
        if self_settings:
            rotated.append(self_settings[0])
        if partner_settings:
            rotated.append(partner_settings[0])

        plans = [
            (
                st.tenant_id,
                int(st.daily_count or 1),
                list(st.channels) if st.channels else list(default_channels),
                bool(getattr(st, "auto_publish", False)),
            )
            for st in rotated
        ]
        logger.info(
            "scheduler.rotation_selected",
            self_tenants=[st.tenant_id for st in self_settings],
            partner_tenants=[st.tenant_id for st in partner_settings],
            rotated_today=[st.tenant_id for st in rotated],
        )

    for tenant_id, daily_count, channels, auto_publish in plans:
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
                final_status = _generate_draft(
                    session_factory, tenant_id, keyword_text, channel,
                    auto_publish=auto_publish,
                )
                if final_status == "published":
                    summary["published"] += 1
                else:
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


def _generate_draft(
    session_factory,
    tenant_id: int,
    keyword: str,
    channel: str,
    *,
    auto_publish: bool = False,
) -> str:
    """1건 자동 생성. ``auto_publish=True`` + compliance_status='pass' 면 즉시 published.

    Returns:
        실제 저장된 status ('published' | 'draft' | '').

    의료법 가드: warn / fail 콘텐츠는 auto_publish 와 무관하게 ``draft`` 로 저장 —
    사용자가 임시저장함에서 검수 후 수동 승격해야 안전.
    """
    from src.content.generator import (
        generate_blog_post,
        generate_faq_content,
        generate_instagram_content,
        generate_naver_blog_content,
    )
    from src.storage.models import GeneratedContent

    # 2026-05-28 Round 22 — content_settings 로 발행 정책 주입.
    # DB 미설정/조회 실패 시 DEFAULTS 가 동일 정책으로 채워짐.
    try:
        from src.content.content_settings import get_settings
        settings = get_settings()
        blog_target_chars = settings.length_max
    except Exception:  # noqa: BLE001
        settings = None
        blog_target_chars = 2000  # 기존 default 보존

    saved_id: int | None = None
    with session_factory() as s:
        if channel == "schema_org":
            r = generate_faq_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        elif channel == "blog_html":
            r = generate_blog_post(
                s,
                tenant_id=tenant_id,
                keyword=keyword,
                save=True,
                target_chars=blog_target_chars,
            )
        elif channel == "naver_blog":
            r = generate_naver_blog_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        elif channel == "instagram":
            r = generate_instagram_content(s, tenant_id=tenant_id, keyword=keyword, save=True)
        else:
            return ""
        saved_id = getattr(r, "saved_id", None)

    if saved_id is None:
        return ""

    with session_factory() as s:
        obj = s.get(GeneratedContent, saved_id)
        if obj is None:
            return ""

        # Round 24 (2026-05-29): 자사 tenant 발행 시 blog_category 자동 할당.
        # posts.ts getAllPosts() 가 blog_category=NULL 글을 제외하므로 자사 cron
        # 글이 /blog 에 안 보였던 이슈 해결. 키워드 기반 매핑.
        if channel == "blog_html" and hasattr(obj, "blog_category"):
            cur_cat = (getattr(obj, "blog_category", None) or "").strip()
            if not cur_cat:
                try:
                    from src.storage.models import Tenant as _Tenant
                    _t = s.get(_Tenant, tenant_id)
                    _is_self = bool(_t) and (
                        getattr(_t, "business_model", "") == "self"
                        or getattr(_t, "partner_slug", "") == "medimap-self"
                    )
                    if _is_self:
                        obj.blog_category = _map_blog_category(keyword)
                except Exception:  # noqa: BLE001
                    pass  # 매핑 실패는 발행 차단 사유 아님

        # 의료법 통과 + auto_publish 일 때만 즉시 발행 — 그 외엔 draft 유지.
        if auto_publish and obj.compliance_status == "pass":
            obj.status = "published"
            # blog_html 이고 slug 비어있으면 keyword + id 로 자동 채움 (medimap-blog
            # /blog/{slug} URL 노출 안전성 확보). 사용자가 어드민에서 직접 편집한
            # slug 는 절대 덮어쓰지 않음.
            if channel == "blog_html" and hasattr(obj, "slug"):
                cur = (getattr(obj, "slug", None) or "").strip()
                if not cur:
                    obj.slug = _make_slug(keyword, obj.id)
            if hasattr(obj, "published_at") and getattr(obj, "published_at", None) is None:
                from datetime import datetime as _dt2, timezone as _tz2
                obj.published_at = _dt2.now(_tz2.utc)
        else:
            obj.status = "draft"
        s.commit()

        # 2026-05-24: blog_html 자동 발행 시 Pollinations.AI 일러스트 자동 첨부.
        # 2026-05-28 Round 22: cover 1장 + 본문 N장 (content_settings.image_count_total - 1).
        # IMAGE_GEN_ENABLED=true 일 때만. 실패해도 발행 자체는 진행 (graceful).
        # Round 30 (2026-05-30) fix: status='draft' 도 이미지 생성. Round 28 검수 단계 cron
        #   (auto_publish=false) 으로 인해 draft 만 저장 → 옛 'published' 조건으로는 cover 가
        #   비어있는 채 draft 가 검수 큐에 도착. 운영자가 검수 화면에서 미리 cover 확인하도록.
        if obj.status in ("published", "draft") and channel == "blog_html":
            try:
                from src.content.image_picker import (
                    generate_image_for_content,
                    inject_body_illustrations,
                    is_enabled,
                )
                if is_enabled():
                    # Round 29: 자사 tenant 면 Unsplash 우선 + 실사 톤
                    _is_self_for_image = False
                    try:
                        from src.storage.models import Tenant as _TenantImg
                        _ti = s.get(_TenantImg, tenant_id)
                        _is_self_for_image = bool(_ti) and (
                            (getattr(_ti, "business_model", "") or "") == "self"
                            or (getattr(_ti, "partner_slug", "") or "") == "medimap-self"
                        )
                    except Exception:  # noqa: BLE001
                        pass
                    img = generate_image_for_content(
                        keyword, obj.title, is_self_tenant=_is_self_for_image
                    )
                    if img:
                        from sqlalchemy import text as _sql_text
                        s.execute(
                            _sql_text(
                                "UPDATE generated_contents SET "
                                "cover_image_url=:url, cover_image_alt=:alt, "
                                "cover_image_prompt=:prompt, cover_image_generated_at=NOW() "
                                "WHERE id=:id"
                            ),
                            {
                                "url": img["url"],
                                "alt": img["alt"],
                                "prompt": img["prompt"][:1000],
                                "id": obj.id,
                            },
                        )
                        s.commit()

                    # 본문 H2 앞에 body 일러스트 N 장 삽입 — Round 17 SQL 패턴 동등.
                    body_count = settings.body_image_count() if settings else 4
                    if body_count > 0 and obj.body:
                        new_body = inject_body_illustrations(
                            obj.body, keyword, max_count=body_count
                        )
                        if new_body != obj.body:
                            from sqlalchemy import text as _sql_text2
                            s.execute(
                                _sql_text2(
                                    "UPDATE generated_contents SET body=:b, "
                                    "updated_at=NOW() WHERE id=:id"
                                ),
                                {"b": new_body, "id": obj.id},
                            )
                            s.commit()
            except Exception:
                # 이미지 실패는 발행 차단 사유 아님 — silent log only
                pass

        return obj.status


def _map_blog_category(keyword: str) -> str:
    """자사 인사이트 키워드 → blog_category slug 매핑.

    medimap-blog/src/lib/posts.ts BLOG_CATEGORY_SLUGS 와 동일:
        content_marketing | ai_trend | hospital_marketing

    매칭 우선순위 (Round 25, 2026-05-29 수정):
        1. 의료법/광고/마케팅/병원 운영 → hospital_marketing (가장 구체적)
        2. 콘텐츠/포스팅/블로그 → content_marketing
        3. GEO/AEO/AI 트렌드 → ai_trend (마케팅 단어 없을 때만)
        4. default → hospital_marketing

    Round 24 의 우선순위는 'GEO' 가 위였으나 "병원 마케팅 GEO" 가 ai_trend 로
    분류되어 사용자 의도(hospital_marketing)와 충돌. 마케팅/광고/의료법이 더
    구체적 의도이므로 GEO 보다 먼저 매칭.
    """
    k = (keyword or "").strip()
    if not k:
        return "hospital_marketing"
    # 1) 의료법/광고/마케팅/병원 운영 — 가장 구체적 → 먼저
    if any(t in k for t in ["의료법", "광고", "마케팅", "SEO", "병원 운영", "병원 마케팅"]):
        return "hospital_marketing"
    # 2) 콘텐츠 운영 관련
    if any(t in k for t in ["콘텐츠", "포스팅", "블로그 글", "키워드 전략"]):
        return "content_marketing"
    # 3) AI/검색엔진 트렌드 (의료법·마케팅 단어 없을 때만)
    if any(t in k for t in ["GEO", "AEO", "AI 검색", "AI검색", "Perplexity", "ChatGPT", "Gemini", "Claude", "LLM"]):
        return "ai_trend"
    # 4) default
    return "hospital_marketing"


# Round 29 (2026-05-30): 자주 쓰는 한글 키워드 → 영문 slug 매핑
# AEO/GEO 측면에서 영문 URL 이 더 안정 (Perplexity·ChatGPT 가 한글 URL 잘못 파싱).
KEYWORD_SLUG_MAP: dict[str, str] = {
    # 자사 인사이트
    "의료 GEO 최적화": "medical-geo-optimization",
    "의료법 광고 가이드": "medical-law-advertising-guide",
    "병원 마케팅 GEO": "hospital-marketing-geo",
    "AI 검색 노출": "ai-search-visibility",
    "병원 운영": "hospital-operation",
    # 파트너 (자주 쓰는 의료 키워드)
    "잠실 노안교정": "jamsil-presbyopia-correction",
    "강남 모발이식 회복": "gangnam-hair-transplant-recovery",
    "강남 리쥬란 힐러": "gangnam-rejuran-healer",
    "한방 다이어트 한약": "korean-medicine-diet",
    "여드름 흉터 치료": "acne-scar-treatment",
    "부산 라식": "busan-lasik",
    "잠실 라식": "jamsil-lasik",
    "강남 라식": "gangnam-lasik",
    "강남 라섹": "gangnam-lasek",
    "스마일라식": "smile-lasik",
    "백내장": "cataract",
    "노안교정": "presbyopia-correction",
    "모발이식": "hair-transplant",
    "임플란트": "dental-implant",
}


def _romanize_korean(text: str) -> str:
    """한글 → 로마자 음역 (간단 매핑).

    Round 29: 매핑에 없는 키워드 fallback. 정확한 음역 아니지만 영문 URL 화.
    """
    import re as _re
    # 한글 제거 + 영문/숫자만 남김
    cleaned = _re.sub(r"[가-힣]+", "", text or "").strip()
    return cleaned


def _make_slug(keyword: str, content_id: int) -> str:
    """한글/영문 키워드를 URL-safe slug 로 변환. 항상 -{id} suffix 로 충돌 0.

    Round 29 (2026-05-30): 한글 키워드 → 영문 slug 매핑 우선 적용.
    매핑에 없으면 한글 제거 + 영문/숫자만 사용. id suffix 로 충돌 0.
    """
    import re as _re
    k = (keyword or "").strip()

    # 1) 정확 매칭 — KEYWORD_SLUG_MAP
    if k in KEYWORD_SLUG_MAP:
        return f"{KEYWORD_SLUG_MAP[k]}-{content_id}"

    # 2) 부분 매칭 — keyword 안에 매핑 키가 포함되면 그것 사용
    for ko, en in KEYWORD_SLUG_MAP.items():
        if ko in k:
            return f"{en}-{content_id}"

    # 3) Fallback — 영문/숫자만 추출
    base = _re.sub(r"[^a-zA-Z0-9\-\s]+", "", k).strip().lower()
    base = _re.sub(r"[\s_]+", "-", base).strip("-")
    if not base:
        # 한글만 있는 경우 — id 만 사용
        base = "post"
    base = base[:40]
    return f"{base}-{content_id}"


def _make_slug_LEGACY(keyword: str, content_id: int) -> str:
    """LEGACY — Round 29 이전 한글 slug. 참고용으로 보존.
    한글은 그대로 보존(Next.js URL 인코딩 OK), 공백/특수문자는 하이픈으로.
    """
    import re as _re
    base = (keyword or "").strip().lower()
    # 영숫자/한글/하이픈/공백만 남김
    base = _re.sub(r"[^\w가-힣\s-]+", "", base, flags=_re.UNICODE)
    base = _re.sub(r"[\s_]+", "-", base).strip("-")
    if not base:
        base = "post"
    base = base[:40]  # 너무 길면 자름
    return f"{base}-{content_id}"


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
