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
        # Phase 3b — active 상품(tenant_products) 기준 게이팅.
        #   ⚠️ 백워드 안전: tenant_products 미도입(행 0) 상태에서 국내 측정이 멈추면 안 됨.
        #   규칙: 국내(market=domestic 또는 lang=ko)는 항상 측정(legacy).
        #         해외(lang!=ko)는 active tenant_product 있는 (tenant,market,lang) 만 측정(비용통제).
        from sqlalchemy import text as _sql_text
        try:
            _prod_rows = s.execute(_sql_text(
                "SELECT tenant_id, market, lang FROM tenant_products WHERE status = 'active'"
            )).fetchall()
            active_products = {(r[0], r[1], r[2]) for r in _prod_rows}
        except Exception:  # pragma: no cover — 테이블 부재 등
            active_products = set()

        def _measure_ok(k) -> bool:
            lang = (getattr(k, "lang", "ko") or "ko")
            market = (getattr(k, "market", "domestic") or "domestic")
            if market == "domestic" or lang == "ko":
                return True
            return (k.tenant_id, market, lang) in active_products

        # Round 173 (2026-08-23) — measure_eligible 로 측정 전용 스코프를 분리.
        #   getattr 폴백: 컬럼 미배포 환경에서도 기존 동작 유지.
        active_keywords = [
            k for k in s.query(Keyword).filter(Keyword.is_active == True).all()  # noqa: E712
            if _measure_ok(k) and getattr(k, "measure_eligible", True) is not False
        ]
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


def _heal_partner_tags(session_factory) -> int:
    """파트너 태깅 자가치유 백필 (idempotent) — Round 125 도입, Round 132 함수화.

    발행 시점 태깅(Round 82/86)이 예외로 조용히 빠지는 케이스 실측(#176/#181/#186).
    daily_auto_content_job 의 시작·종료 양쪽에서 호출 — 종료 호출이 당일 발행분의
    /with-partners 즉시 노출을 보장한다. 제외 목록에 wecircle-self 추가 (Round 132).
    """
    try:
        from sqlalchemy import text as _sql_heal
        with session_factory() as s:
            _healed = s.execute(
                _sql_heal(
                    "UPDATE generated_contents gc SET "
                    "is_partner_content = true, "
                    "partner_category = COALESCE(NULLIF(gc.partner_category, ''), m.cat) "
                    "FROM (SELECT t.id AS tid, CASE trim(t.domain_category) "
                    "  WHEN '안과' THEN 'eyeclinic' WHEN '피부과' THEN 'derma' "
                    "  WHEN '성형외과' THEN 'plastic' WHEN '치과' THEN 'dental' "
                    "  WHEN '내과' THEN 'internal' WHEN '모발이식' THEN 'hair' "
                    "  WHEN '한방의원' THEN 'oriental' WHEN '한방' THEN 'oriental' "
                    "  ELSE NULL END AS cat "
                    "  FROM tenants t WHERE t.partner_slug IS NOT NULL "
                    "  AND lower(t.partner_slug) NOT IN "
                    "    ('medimap','medimap-self','wecircle','wecircle-self') "
                    "  AND lower(COALESCE(t.business_model,'')) <> 'self') m "
                    "WHERE gc.tenant_id = m.tid AND gc.status = 'published' "
                    "AND gc.channel = 'blog_html' AND m.cat IS NOT NULL "
                    "AND (gc.is_partner_content IS DISTINCT FROM true "
                    "     OR gc.partner_category IS NULL)"
                )
            )
            s.commit()
            n = int(_healed.rowcount or 0)
            if n:
                logger.warning("scheduler.partner_tag_healed", n=n)
            return n
    except Exception as _heal_err:  # noqa: BLE001
        logger.warning("scheduler.partner_tag_heal_failed", error=str(_heal_err))
        return 0


def daily_auto_content_job(
    session_factory,
    target_tenant_id: int | None = None,
    target_keyword: str | None = None,
    market_only: str | None = None,
    lang_only: str | None = None,
) -> dict:
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

    # Round 125 (2026-07-05) — 파트너 태깅 자가치유 백필 (시작 시).
    # Round 132 (2026-07-09) — 함수화 + 잡 종료 시에도 호출: 당일 발행분이 다음 cron 까지
    #   /with-partners 미노출되던 갭(#186 실측) 근본 해소.
    _heal_partner_tags(session_factory)

    # Round 145 (2026-08-14) — 키워드 자동 발굴 (루프의 맨 앞 닫기).
    #   AI 가 인용하는 경쟁 URL 슬러그 → 키워드 풀 자동 추가. 실패해도 발행 진행.
    #   가드레일(테넌트당 2개/실행·총량 30·상품 게이팅)은 모듈 내부.
    try:
        from src.collector.keyword_discovery import discover_keywords_from_citations
        _kd = discover_keywords_from_citations(session_factory)
        if _kd.get("inserted"):
            logger.info("scheduler.keyword_discovery", inserted=_kd["inserted"])
    except Exception as _kd_err:  # noqa: BLE001
        logger.warning("scheduler.keyword_discovery_failed", error=str(_kd_err))

    # Round 120 (2026-07-03) — admin 즉시발행 타깃 실행 (publish-now → workflow_dispatch).
    #   target_tenant_id 지정 시: 로테이션·plan 요일 필터 무시, 해당 tenant 1편만 생성.
    #   last_run_at 은 갱신하지 않음 — 일반 cron 로테이션 순서에 영향 주지 않기 위해.
    #   채널은 blog_html 우선 (즉시발행 목적 = 검수 큐 등장 + /with-partners 라이브).
    if target_tenant_id is not None:
        from src.storage.models import AutoContentSetting as _ACS, Keyword as _Kw

        with session_factory() as s:
            st = (
                s.query(_ACS)
                .filter(_ACS.tenant_id == target_tenant_id)
                .first()
            )
            channels = (
                list(st.channels) if (st is not None and st.channels) else list(default_channels)
            )
            auto_publish = bool(getattr(st, "auto_publish", False)) if st is not None else False
            _tgt_lang, _tgt_market = "ko", "domestic"  # Phase 3b — 기본 국내
            if target_keyword:
                keyword_text = target_keyword.strip()
                _row = (
                    s.query(_Kw)
                    .filter(_Kw.tenant_id == target_tenant_id, _Kw.text == keyword_text)
                    .first()
                )
                if _row is not None:
                    _tgt_lang = getattr(_row, "lang", "ko") or "ko"
                    _tgt_market = getattr(_row, "market", "domestic") or "domestic"
            else:
                kws = (
                    s.query(_Kw)
                    .filter(_Kw.tenant_id == target_tenant_id, _Kw.is_active == True)  # noqa: E712
                    .order_by(_Kw.id)
                    .all()
                )
                # Round 164b (2026-08-17) — 🔴 타깃 경로가 LANG_ONLY/MARKET_ONLY 를 무시하던
                #   버그 수정. 실사고: daily-brighteye-all-langs 첫 실행이 5개 언어 대신
                #   ko 첫 키워드('라식')만 5회 중복 생성·발행. 타깃 경로에서도 필터 적용 +
                #   kws[0] 고착 대신 날짜 로테이션 (Round 145 원칙과 동일).
                if lang_only is not None:
                    kws = [k for k in kws if (getattr(k, "lang", "ko") or "ko") == lang_only]
                if market_only is not None:
                    kws = [
                        k for k in kws
                        if (getattr(k, "market", "domestic") or "domestic") == market_only
                    ]
                # Round 182c (2026-09-01) - the target path ignored content_eligible
                #   and purpose. Incident: 2026-09-01 01:05 a post for the keyword
                #   '\ub77c\uc2dd' (purpose=competitor_landscape, content_eligible=false)
                #   was published for gangnamyonsei. Round 173 removed head terms from
                #   publishing and Round 164b fixed lang/market here, but both gates
                #   lived only on the normal rotation path - the same door as 164b.
                #   NOTE: the ORM Keyword model has no purpose / experiment_arm column,
                #   so getattr always returns the default and cannot filter. Use raw SQL.
                from sqlalchemy import text as _sql_tgt
                try:
                    _ok_rows = s.execute(
                        _sql_tgt(
                            "SELECT k.id, COALESCE(k.experiment_arm,'') AS arm, "
                            "       (SELECT count(*) FROM generated_contents g "
                            "          WHERE g.tenant_id = k.tenant_id AND g.keyword_text = k.text "
                            "            AND g.status = 'published' AND g.channel = 'blog_html') AS pub "
                            "  FROM keywords k "
                            " WHERE k.tenant_id = :tid AND k.is_active "
                            "   AND COALESCE(k.content_eligible, true) = true "
                            "   AND COALESCE(k.purpose, 'own') = 'own'"
                        ),
                        {"tid": target_tenant_id},
                    ).fetchall()
                except Exception:  # pragma: no cover - column not deployed
                    _ok_rows = []
                if _ok_rows:
                    _ok_ids = {r[0] for r in _ok_rows}
                    kws = [k for k in kws if k.id in _ok_ids]
                    # While an experiment runs, the target path drains unpublished
                    #   experiment keywords first; otherwise one dispatch muddies the
                    #   A/B publishing window.
                    _exp_ids = {r[0] for r in _ok_rows if r[1] and int(r[2] or 0) == 0}
                    if _exp_ids and lang_only in (None, "ko") and market_only in (None, "domestic"):
                        _k_exp = [k for k in kws if k.id in _exp_ids]
                        if _k_exp:
                            kws = _k_exp
                if not kws:
                    logger.error(
                        "scheduler.target_no_keyword", tenant_id=target_tenant_id,
                        lang_only=lang_only, market_only=market_only,
                    )
                    summary["errors"] += 1
                    return summary
                import datetime as _dt_tgt
                _tgt_off = (_dt_tgt.date.today().toordinal() + target_tenant_id) % len(kws)
                keyword_text = kws[_tgt_off].text
                _tgt_lang = getattr(kws[_tgt_off], "lang", "ko") or "ko"
                _tgt_market = getattr(kws[_tgt_off], "market", "domestic") or "domestic"
        channel = "blog_html" if "blog_html" in channels else channels[0]
        summary["tenants"] = 1
        logger.info(
            "scheduler.target_run",
            tenant_id=target_tenant_id,
            keyword=keyword_text,
            channel=channel,
            auto_publish=auto_publish,
        )
        try:
            final_status = _generate_draft(
                session_factory, target_tenant_id, keyword_text, channel,
                # Round 145 (2026-08-14) — 해외도 자동 발행 (사용자 결정). 린터 가드 유지.
                auto_publish=auto_publish,
                lang=_tgt_lang, market=_tgt_market,
            )
            if final_status == "published":
                summary["published"] += 1
            else:
                summary["drafts"] += 1
        except Exception as e:  # pragma: no cover
            logger.error(
                "scheduler.target_run_error",
                tenant_id=target_tenant_id,
                keyword=keyword_text,
                error=str(e),
            )
            summary["errors"] += 1
        # Round 132 — 즉시발행 직후 태깅 (당일 /with-partners 노출 보장)
        _heal_partner_tags(session_factory)
        return summary

    # Round 28 (2026-05-30): 로테이션 정책
    #   - 매일 자사 1편 + 파트너 1편 (총 2편) 만 발행 → Pollinations 부담·운영 검수량 절감
    #   - 각 set 에서 last_run_at 가장 오래된 tenant 1개 선택 → 자연 로테이션
    #   - last_run_at NULL 인 신규 tenant 가 가장 먼저 발행됨
    # Round 83 (2026-06-28): 상품 옵션별 발행 정책 추가.
    #   - tenants.publish_plan='A' (기본, 주3회 월/수/금): 오늘이 월/수/금 아니면 후보 제외
    #   - tenants.publish_plan='B' (프리미엄, 매일): 항상 후보
    #   (KST 기준 weekday — cron 이 UTC 시간 기록이지만 콘텐츠 운영 정책은 KST)
    import datetime as _dt_mod
    _kst_now = _dt.now(_tz.utc) + _dt_mod.timedelta(hours=9)
    today_kst_dow = _kst_now.weekday()  # 0=Mon, 2=Wed, 4=Fri
    PLAN_A_DOW = {0, 2, 4}
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
        # Round 83 — publish_plan 은 raw SQL 로 읽기 (함정 CW: ORM 미매핑 가능성 회피).
        from sqlalchemy import text as _sql_text
        _plan_rows = s.execute(
            _sql_text("SELECT id, publish_plan FROM tenants")
        ).fetchall()
        _tenant_plan = {row[0]: (row[1] or "A").upper() for row in _plan_rows}

        self_settings = []
        partner_settings = []
        plan_skipped: list[int] = []
        status_skipped: list[int] = []
        for st in active_settings:
            tenant = s.get(_Tenant, st.tenant_id)
            if tenant is None:
                continue
            # 🔴 Round 174i (2026-08-24) — 어드민 "일시정지" 가 발행을 멈추지 않던 버그.
            #   어드민의 일시정지 버튼은 PATCH /api/admin/tenants/[id] 로 `tenants.status`
            #   만 바꾼다. 이 로테이션은 `auto_content_settings.enabled` 만 보고 있었으므로
            #   두 플래그가 갈라지면 정지시킨 병원이 계속 발행된다.
            #   실측(2026-08-24): 청담디어(17) status='paused' 인데 enabled=true 로
            #   로테이션에 남아 있었다. 사용자가 '필러' 39편 때문에 정지시킨 직후였다.
            #   (힐링·클리어서울은 enabled=false 도 같이 꺼져 있어 우연히 정상 동작.)
            #   ⚠ fail-open 으로 설계: status 가 null/미지 값이면 active 로 본다.
            #     'active' 만 통과시키면 데이터 흠 하나로 전 병원 발행이 조용히 멈춘다.
            _tstatus = (getattr(tenant, "status", None) or "active").strip().lower()
            if _tstatus in ("paused", "churned"):
                status_skipped.append(st.tenant_id)
                continue
            # Round 83 — plan='A' 인데 오늘이 월/수/금 아니면 skip
            plan = _tenant_plan.get(st.tenant_id, "A")
            if plan == "A" and today_kst_dow not in PLAN_A_DOW:
                plan_skipped.append(st.tenant_id)
                continue
            bm = (getattr(tenant, "business_model", "") or "").strip().lower()
            ps = (getattr(tenant, "partner_slug", "") or "").strip().lower()
            is_self = bm == "self" or ps == "medimap-self"
            if is_self:
                self_settings.append(st)
            else:
                partner_settings.append(st)
        if plan_skipped:
            logger.info(
                "scheduler.plan_a_skipped_today",
                kst_weekday=today_kst_dow,
                skipped_tenants=plan_skipped,
            )
        if status_skipped:
            logger.info(
                "scheduler.tenant_status_skipped",
                skipped_tenants=status_skipped,
            )

        # 🔴 Round 174c (2026-08-23) — 파트너 로테이션 1곳 → N곳.
        #   기존: 한 번 돌 때 self 1곳 + partner **1곳**만 처리했다. 파트너 병원이 13곳이고
        #   cron 이 주 6회(월·수·금 × 2)라, 병원 하나가 서비스되는 주기는 약 2.2주 —
        #   즉 **주 0.46회**다. 사용자가 정한 정책은 병원당 주 3회였는데 6.5배 미달이었다.
        #   실측(auto_content_settings.last_run_at, 2026-08-23 기준): 밝은눈안과 부산과
        #   바를정은 8/17 이후 한 번도 안 돌았고, ko 14일 발행이 1~3편에 그친 병원이 6곳.
        #   반면 밝은눈안과 강남점은 전용 워크플로(daily-brighteye-all-langs)로 주 43편 —
        #   "발행량이 많다"가 아니라 **한 곳에 몰리고 나머지는 굶는** 구조였다.
        #   last_run_at ASC 정렬은 그대로라 가장 오래 굶은 병원부터 순서대로 채운다.
        #   ⚠ 배치를 키우면 워크플로 실행 시간이 선형으로 늘어난다(1편당 LLM+이미지 약 2~3분).
        #      auto-publish.yml 의 timeout-minutes 와 함께 조정할 것.
        _partner_batch = max(1, int(os.getenv("ROTATION_PARTNER_BATCH", "5")))
        rotated = []
        if self_settings:
            rotated.append(self_settings[0])
        rotated.extend(partner_settings[:_partner_batch])

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
            # Phase 3b — 발행 게이팅: 클라이언트가 '언어별 상품(tenant_products)'을 활성화한
            #   시장·언어에 한해서만 해외 콘텐츠 자동발행. (국내 ko 는 기존대로 항상 발행.)
            #   국내 파이프라인과 동일 엔진 + 조건부(상품 선택 항목만).
            from sqlalchemy import text as _sql_text
            try:
                _pr = s.execute(
                    _sql_text(
                        "SELECT market, lang FROM tenant_products "
                        "WHERE tenant_id = :tid AND status = 'active'"
                    ),
                    {"tid": tenant_id},
                ).fetchall()
                _active_products = {(r[0], r[1]) for r in _pr}
            except Exception:  # pragma: no cover
                _active_products = set()

            def _publish_ok(lang: str, market: str) -> bool:
                if market == "domestic" or lang == "ko":
                    return True
                return (market, lang) in _active_products

            # 🔴 Round 155 (2026-08-16) — 키워드당 발행 상한 (커버리지 게이트).
            #   실측: "의료 GEO 최적화" 41편 + "필러" 38편 = 발행의 33% 가 단 2개
            #   키워드에 집중 — 같은 주제 반복은 유입도 문의도 못 늘린다(카니벌라이즈).
            #   상한 도달 키워드는 로테이션에서 제외 → 남은 키워드(롱테일)로 강제 순환.
            # 🔴 Round 177 (2026-08-27) — 상한을 (키워드, 언어) 단위로 바꾸고 해외는 1편.
            #   실사고: kwangdong en 활성 키워드가 3개뿐이라 날짜 로테이션이 3일마다
            #   같은 키워드로 돌아오는데 상한이 12 라 같은 의도로 계속 새 글을 찍었다.
            #   결과: 502·537·550 "Traditional Korean Medicine Treatment in Seoul" 3편
            #   (537·550 은 제목이 사실상 동일), brighteye en 434·459·543,
            #   dear en 울쎄라 249·256·261 — 전부 자기들끼리 카니벌라이즈.
            #   또 기존 상한은 lang 을 무시해 ko/en 발행이 한 통에 섞여 세졌다.
            #   ⚠ noindex 글도 카운트에 포함한다. 빼면 중복을 noindex 하는 순간
            #     슬롯이 비어 같은 키워드로 또 찍는다.
            # Round 179 (2026-08-30) — 해외 상한 1 → 6 완화.
            #   177 의 상한 1 은 증상 억제였다(중복은 막지만 발행도 멈춤 — brighteye 4개 언어).
            #   179 에서 generator 가 같은 키워드의 2번째 글부터 질문형 아키타입 + 기존 제목
            #   회피로 전환하므로, 이제 여러 편이 서로 다른 질문을 다룬다(국내와 동일한 성질).
            #   국내 잠실 라식 11편이 11개 다른 질문인 것이 이 방식의 실증.
            #   6 은 보수적 출발값 — 실제 중복 재발 여부를 보고 조정한다.
            _KW_CAP_DOMESTIC = 12
            _KW_CAP_OVERSEAS = 6
            from sqlalchemy import text as _sql_cap
            _pub_counts: dict = {
                (r[0], r[1] or "ko"): int(r[2])
                for r in s.execute(
                    _sql_cap(
                        "SELECT keyword_text, COALESCE(lang,'ko') AS lang, count(*) "
                        "FROM generated_contents "
                        "WHERE tenant_id = :tid AND status = 'published' "
                        "AND channel = 'blog_html' AND keyword_text IS NOT NULL "
                        "GROUP BY keyword_text, COALESCE(lang,'ko')"
                    ),
                    {"tid": tenant_id},
                ).fetchall()
            }

            def _kw_capped(text_: str, lang_: str, market_: str) -> bool:
                cap = (
                    _KW_CAP_DOMESTIC
                    if (market_ == "domestic" or lang_ == "ko")
                    else _KW_CAP_OVERSEAS
                )
                return _pub_counts.get((text_, lang_), 0) >= cap
            # 키워드별 lang/market 동반 로드 + 발행 게이팅. 해외 키워드는 그 언어로 생성.
            kw_rows = [
                (
                    k.text,
                    (getattr(k, "lang", "ko") or "ko"),
                    (getattr(k, "market", "domestic") or "domestic"),
                )
                for k in kws
                if not _kw_capped(
                    k.text,
                    (getattr(k, "lang", "ko") or "ko"),
                    (getattr(k, "market", "domestic") or "domestic"),
                )
                # Round 173 — 발행 로테이션 제외 플래그. 순위가 나올 수 없는 헤드 키워드
                #   (GSC 실측 44~90위, 클릭 0)를 측정은 유지한 채 발행에서만 뺀다.
                and getattr(k, "content_eligible", True) is not False
                and _publish_ok(
                    (getattr(k, "lang", "ko") or "ko"),
                    (getattr(k, "market", "domestic") or "domestic"),
                )
                and (
                    market_only is None
                    or (getattr(k, "market", "domestic") or "domestic") == market_only
                )
            ]
            # 전 키워드 상한 도달 시 발행 중단이 아니라 전체 풀로 폴백 (발행 0 방지).
            # 🔴 Round 177 — 해외는 폴백 금지. 여기서 폴백하면 그게 곧 중복 재생산이다.
            #   해외 풀이 소진되면 발행을 건너뛰고 로그로 알린다(= 키워드 추가 신호).
            if not kw_rows and _pub_counts:
                kw_rows = [
                    (k.text, (getattr(k, "lang", "ko") or "ko"),
                     (getattr(k, "market", "domestic") or "domestic"))
                    for k in kws
                    # Round 173 — 폴백 경로에도 content_eligible 적용. 여기서 빠뜨리면
                    #   상한 도달 tenant 가 조용히 헤드 키워드로 되돌아간다.
                    if getattr(k, "content_eligible", True) is not False
                    # Round 177 — 폴백은 국내 전용.
                    and (getattr(k, "market", "domestic") or "domestic") == "domestic"
                    and _publish_ok(
                        (getattr(k, "lang", "ko") or "ko"),
                        (getattr(k, "market", "domestic") or "domestic"),
                    )
                ]

            # Round 182 (2026-08-31) - drain A/B experiment keywords first.
            #   The rotation walks the whole tenant pool (20-30 kws) by date offset,
            #   but a tenant publishes only 1-2 posts a week, so reaching a specific
            #   pair takes months and the two halves of a pair would land in
            #   different seasons - the comparison becomes meaningless.
            #   Fix: while tagged, unpublished experiment keywords remain in the
            #   pool, rotate only those, ordered by (pair_id, arm) so a pair's two
            #   posts go out in adjacent cycles. Clearing the tags makes this a no-op.
            #   NOTE: domestic ko runs only. Narrowing to ko experiment keywords on a
            #   lang_only='en' run would leave the pool empty after the lang_only
            #   filter below and silently stop brighteye multilang publishing.
            _exp_scope_ok = (lang_only in (None, "ko")) and (
                market_only in (None, "domestic")
            )
            try:
                _exp_texts = [
                    r[0]
                    for r in s.execute(
                        _sql_text(
                            "SELECT text FROM keywords "
                            "WHERE tenant_id = :tid AND experiment_arm IS NOT NULL "
                            "AND is_active AND COALESCE(content_eligible, true) = true "
                            "ORDER BY experiment_pair_id, experiment_arm, id"
                        ),
                        {"tid": tenant_id},
                    ).fetchall()
                ]
            except Exception:  # pragma: no cover - column not deployed
                _exp_texts = []
            if _exp_texts and _exp_scope_ok:
                _by_text = {r[0]: r for r in kw_rows}
                _exp_rows = [_by_text[t] for t in _exp_texts if t in _by_text]
                _fresh = [r for r in _exp_rows if _pub_counts.get((r[0], r[1] or "ko"), 0) == 0]
                if _fresh:
                    kw_rows = _fresh
                elif _exp_rows:
                    kw_rows = _exp_rows
        # Round 160 (2026-08-16) — LANG_ONLY 타깃: brighteye 전 언어 데일리 워크플로가
        #   언어별로 1회씩 호출한다 (ko/en/ja/zh-Hans/zh-Hant). 미지정 시 무변경.
        if lang_only is not None:
            kw_rows = [r for r in kw_rows if r[1] == lang_only]
        if not kw_rows:
            # Round 177 — 조용한 스킵 금지. 해외 풀 소진은 운영자가 알아야 하는 상태다.
            logger.warning(
                "scheduler.keyword_pool_exhausted",
                tenant_id=tenant_id, lang_only=lang_only, market_only=market_only,
            )
            continue

        summary["tenants"] += 1
        ch_cycle = channels or default_channels
        # Round 145 (2026-08-13) — 🔴 라운드로빈 인덱스 고착 수정.
        #   daily_count=1 이면 kw_rows[i % len] 이 매일 같은 첫 키워드(최소 id)만 뽑아
        #   실증: t17 11일간 "필러" ×22회 단일 생성, t16 "韓国 植毛 費用" ×20회.
        #   해외 키워드는 영원히 미도달 → 커버리지 0 + 동일 주제 중복.
        #   수정: 날짜(ordinal)+tenant_id 기반 결정적 오프셋 → 매일 다음 키워드로 순환.
        #   결정적이라 같은 날 재실행해도 동일 픽(중복 생성 없음), A/B 재현성 유지.
        import datetime as _dt_rot
        _rot_offset = (_dt_rot.date.today().toordinal() + tenant_id) % len(kw_rows)
        for i in range(daily_count):
            keyword_text, kw_lang, kw_market = kw_rows[(_rot_offset + i) % len(kw_rows)]
            channel = ch_cycle[i % len(ch_cycle)]
            try:
                final_status = _generate_draft(
                    session_factory, tenant_id, keyword_text, channel,
                    # Round 145 (2026-08-14) — 해외도 자동 발행 전환 (사용자 명시 결정·책임 확인).
                    #   기존: 해외는 항상 draft(수동 검수 후 발행). 이제 국내와 동일하게
                    #   의료법 린터 pass 시 즉시 published. 린터 warn/fail 은 여전히
                    #   무조건 draft(_generate_draft 가드) — 컴플라이언스 우회 아님.
                    auto_publish=auto_publish,
                    lang=kw_lang, market=kw_market,
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

    # Round 132 — 발행 직후 태깅 (당일 발행분 /with-partners 즉시 노출 보장)
    _heal_partner_tags(session_factory)

    logger.info("scheduler.auto_content_complete", **summary)
    return summary


def _extract_faq_pairs(body: str) -> list[dict]:
    """생성 본문의 FAQ 섹션(<p><strong>Q: …</strong> A: …</p>)을 raw_qa_pairs 평면 배열로 파싱.

    FAPage JSON-LD + AEO FAQ 점수용(국내·해외 자동콘텐츠 공통 GEO 개선).
    'Q:' 로 시작하는 strong 만 매칭해 일반 볼드 오탐 방지. 없음/실패면 [] → 저장 안 함(백워드 안전).
    """
    if not body:
        return []
    import re as _re

    pat = _re.compile(
        r"<strong[^>]*>\s*Q\s*[:.]\s*(?P<q>.*?)</strong>(?P<a>.*?)</p>",
        _re.IGNORECASE | _re.DOTALL,
    )
    out: list[dict] = []
    for m in pat.finditer(body):
        q = _re.sub(r"<[^>]+>", " ", m.group("q"))
        a = _re.sub(r"<[^>]+>", " ", m.group("a"))
        a = _re.sub(r"^\s*A\s*[:.]?\s*", "", a, flags=_re.IGNORECASE)
        q = _re.sub(r"\s+", " ", q).strip()
        a = _re.sub(r"\s+", " ", a).strip()
        if q and a and 3 <= len(q) <= 300 and len(a) >= 5:
            out.append({"q": q, "a": a})
    return out[:10]


def _generate_draft(
    session_factory,
    tenant_id: int,
    keyword: str,
    channel: str,
    *,
    auto_publish: bool = False,
    lang: str = "ko",
    market: str = "domestic",
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
                lang=lang,
                market=market,
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
                        # Round 59 fix 6 — title 도 전달해서 더 정확히 분류 (keyword 단일이면 편향)
                        obj.blog_category = _map_blog_category(keyword, getattr(obj, "title", "") or "")
                    elif market == "overseas":
                        # 해외 비파트너 콘텐츠 — B2C 3분류(K-뷰티/K-의료/꿀팁).
                        # 파트너 콘텐츠는 is_partner_content=true 라 /blog 에서 제외되므로
                        # blog_category 부여돼도 무해(항상 /clinics 노출).
                        obj.blog_category = _classify_overseas_blog_category(
                            keyword, getattr(obj, "title", "") or ""
                        )
                except Exception:  # noqa: BLE001
                    pass  # 매핑 실패는 발행 차단 사유 아님

        # FAPage 구조화 FAQ — body FAQ 섹션을 raw_qa_pairs 평면 배열로 채움(비어있을 때만).
        #   FAPage JSON-LD + AEO FAQ 점수 활성화. 파싱 실패면 무변경(백워드 안전).
        if channel == "blog_html" and hasattr(obj, "raw_qa_pairs"):
            _cur_faq = getattr(obj, "raw_qa_pairs", None)
            if not (isinstance(_cur_faq, list) and len(_cur_faq) > 0):
                _faq_pairs = _extract_faq_pairs(getattr(obj, "body", "") or "")
                if _faq_pairs:
                    obj.raw_qa_pairs = _faq_pairs

        # Round 143 (SEO 감사 ③) — excerpt(메타 description) 비어있으면 본문에서 자동 생성.
        #   국내 발행글 다수가 excerpt 없어 meta description 이 본문 앞부분 파생·중간 잘림 →
        #   SERP 클릭 유도 문구 부재. 본문 텍스트를 문장 경계로 ~155자 요약(새 주장 없음).
        if channel == "blog_html" and hasattr(obj, "excerpt"):
            _cur_ex = (getattr(obj, "excerpt", None) or "").strip()
            if not _cur_ex:
                import re as _re_ex
                _txt = _re_ex.sub(r"<[^>]+>", " ", getattr(obj, "body", "") or "")
                _txt = _re_ex.sub(r"\s+", " ", _txt).strip()
                if _txt:
                    _cut = _txt[:157]
                    _ends = [m.end() for m in _re_ex.finditer(r"[.!?。！？]", _cut)]
                    _good = [e for e in _ends if e >= 80]
                    obj.excerpt = (_cut[:_good[-1]] if _good else (_cut.rstrip() + "…")).strip()

        # 의료법 통과 + auto_publish 일 때만 즉시 발행 — 그 외엔 draft 유지.
        if auto_publish and obj.compliance_status == "pass":
            obj.status = "published"
            # blog_html 이고 slug 비어있으면 keyword + id 로 자동 채움 (medimap-blog
            # /blog/{slug} URL 노출 안전성 확보). 사용자가 어드민에서 직접 편집한
            # slug 는 절대 덮어쓰지 않음.
            if channel == "blog_html" and hasattr(obj, "slug"):
                cur = (getattr(obj, "slug", None) or "").strip()
                if not cur:
                    obj.slug = _make_slug(keyword, obj.id, lang)
            if hasattr(obj, "published_at") and getattr(obj, "published_at", None) is None:
                from datetime import datetime as _dt2, timezone as _tz2
                obj.published_at = _dt2.now(_tz2.utc)
        else:
            obj.status = "draft"
        s.commit()

        # Round 82 (2026-06-26) — 파트너 blog_html: /with-partners 노출 3필드 보장.
        #   with-partners 필터는 is_partner_content + partner_category + slug 를 모두 요구.
        #   ORM 모델(GeneratedContent)에 이 3컬럼이 미매핑이라 obj.slug 등 hasattr 가
        #   False → 기존 ORM 경로가 조용히 스킵됐음. raw SQL UPDATE 로 직접 채운다.
        #   자사 tenant(메디맵)는 제외 — /blog 전용이라 partner_category 불필요.
        #   slug/partner_category 는 기존 값이 있으면 보존(운영자 수동 편집 비파괴).
        if channel == "blog_html":
            # (1) slug + published_at — self/partner 공통. /blog·/with-partners 모두 slug 필수.
            #     ORM 미매핑이라 raw SQL. 기존 값 보존(운영자 수동 편집 비파괴).
            #     Round 82: 기존 auto_publish 분기의 hasattr(obj,"slug") 가 항상 False 라
            #     slug/published_at 이 한 번도 안 채워지던 버그를 여기서 일괄 해결.
            try:
                from sqlalchemy import text as _sql_slug
                s.execute(
                    _sql_slug(
                        # 🔴 Round 174h (2026-08-24) — 이 COALESCE 는 두 달간
                        #   아무 일도 하지 않았다. Supabase BEFORE INSERT 트리거
                        #   `trg_autofill_title_slug` 가 INSERT 시점에 한글
                        #   `keyword_text-{id}` 를 이미 박아넣어서 NULLIF(slug,'')
                        #   가 항상 non-null → :slug 이 절대 채택되지 않는다.
                        #   직접 증거: _make_slug 는 미매핑 키워드에 'post-{id}' 를
                        #   주는데 DB 에 'post-{id}' 슬러그가 0건, 한글 슬러그가 130건.
                        #   실측 결과 한글 슬러그 130편 GSC 노출 전부 0, ASCII 52편은
                        #   27편(51.9%)이 노출. 정본 슬러그는 이제 generator.py 가
                        #   LLM 영문 슬러그로 무조건 UPDATE 한다. 이 줄은 그 이후에
                        #   실행되므로 여전히 no-op — 안전망으로만 남긴다.
                        #   ⚠ 여기를 "고쳐서" 무조건 덮어쓰게 만들지 말 것.
                        #     운영자가 어드민에서 수정한 슬러그까지 날아간다.
                        "UPDATE generated_contents SET "
                        "slug = COALESCE(NULLIF(slug, ''), :slug), "
                        "published_at = CASE WHEN status = 'published' AND published_at IS NULL "
                        "                    THEN NOW() ELSE published_at END "
                        "WHERE id = :id"
                    ),
                    {"slug": _make_slug(keyword, obj.id, lang), "id": obj.id},
                )
                # Round 154 (배치 C1) — 콘텐츠 단위 클릭 귀속 shortlink 자동 발급.
                #   slug 'p{id}' 결정적 · target=위서클 오픈채팅. CTA 렌더
                #   (kakaoTrackHrefContent)가 이 행의 존재를 전제한다.
                s.execute(
                    _sql_slug(
                        "INSERT INTO shortlinks "
                        "(tenant_id, slug, target_url, label, is_active, click_count, created_at, updated_at) "
                        "SELECT gc.tenant_id, 'p' || gc.id, "
                        "'https://pf.kakao.com/_xouLiX/chat', 'content-kakao', true, 0, now(), now() "
                        "FROM generated_contents gc WHERE gc.id = :id "
                        "ON CONFLICT (slug) DO NOTHING"
                    ),
                    {"id": obj.id},
                )
                # Round 153 (2026-08-16) — 드래프트 제목("키워드 #id") 발행 차단.
                #   포털 감사 실사고: 23편이 내부 명명 그대로 노출. 발행 시 본문 첫
                #   h1(→h2) 텍스트로 교정. 헤딩이 없으면 렌더단(posts.ts) 폴백이 커버.
                s.execute(
                    _sql_slug(
                        "UPDATE generated_contents SET title = COALESCE("
                        "NULLIF(trim(regexp_replace(substring(body from '<h1[^>]*>([^§]+?)</h1>'), '<[^>]+>', '', 'g')), ''),"
                        "NULLIF(trim(regexp_replace(substring(body from '<h2[^>]*>([^§]+?)</h2>'), '<[^>]+>', '', 'g')), ''),"
                        "title) WHERE id = :id AND title ~ '#\\d+$'"
                    ),
                    {"id": obj.id},
                )
                s.commit()
            except Exception:
                pass
            # (2) 파트너 전용 — /with-partners 노출용 is_partner_content + partner_category.
            #     자사 tenant(메디맵)는 제외(/blog 전용).
            try:
                from src.storage.models import Tenant as _TenantPC
                _tpc = s.get(_TenantPC, tenant_id)
                _pslug = (getattr(_tpc, "partner_slug", "") or "").strip().lower()
                _is_self_pc = (
                    (getattr(_tpc, "business_model", "") or "").strip().lower() == "self"
                    or _pslug == "medimap-self"
                )
                if _tpc is not None and _pslug and not _is_self_pc:
                    _cat = _map_partner_category(getattr(_tpc, "domain_category", None))
                    from sqlalchemy import text as _sql_text_pc
                    s.execute(
                        _sql_text_pc(
                            "UPDATE generated_contents SET "
                            "is_partner_content = true, "
                            "partner_category = COALESCE(NULLIF(partner_category, ''), :cat) "
                            "WHERE id = :id"
                        ),
                        {"cat": _cat, "id": obj.id},
                    )
                    s.commit()
            except Exception as _tag_err:  # noqa: BLE001
                # 태깅 실패는 발행 차단 사유 아님 — Round 125 자가치유 백필이 다음 cron 복구.
                # silent pass 였던 것을 로그로 승격 (#176/#181 미스터리 재발 시 원인 추적용).
                logger.warning(
                    "scheduler.partner_tag_failed", content_id=obj.id, error=str(_tag_err)
                )

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
                    # Round 126-C: 진료과(domain_category)를 이미지 컨셉 매핑에 전달
                    _is_self_for_image = False
                    _domcat_for_image = None
                    try:
                        from src.storage.models import Tenant as _TenantImg
                        _ti = s.get(_TenantImg, tenant_id)
                        _is_self_for_image = bool(_ti) and (
                            (getattr(_ti, "business_model", "") or "") == "self"
                            or (getattr(_ti, "partner_slug", "") or "") == "medimap-self"
                        )
                        _domcat_for_image = getattr(_ti, "domain_category", None) if _ti else None
                    except Exception:  # noqa: BLE001
                        pass
                    # Round 82 fix: obj.title 은 ORM 미매핑 → AttributeError 가
                    #   바깥 except 에 삼켜져 '모든 글의 이미지 생성'이 통째로 죽어있었음.
                    #   title 을 raw SQL 로 안전하게 읽어 이미지 프롬프트 품질 복원.
                    _title_for_img = ""
                    try:
                        from sqlalchemy import text as _sql_title
                        _tr = s.execute(
                            _sql_title("SELECT title FROM generated_contents WHERE id=:id"),
                            {"id": obj.id},
                        ).first()
                        _title_for_img = (_tr[0] if _tr else "") or ""
                    except Exception:
                        _title_for_img = ""
                    img = generate_image_for_content(
                        keyword, _title_for_img,
                        is_self_tenant=_is_self_for_image,
                        domain_category=_domcat_for_image,
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
                    # Round 81 — 본문 일러스트 기본 2장(로딩속도·부담↓). settings 없으면 2.
                    body_count = settings.body_image_count() if settings else 2
                    if body_count > 0 and obj.body:
                        new_body = inject_body_illustrations(
                            obj.body, keyword, max_count=body_count,
                            domain_category=_domcat_for_image,
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

        # Round 82 — IndexNow 자동 핑(네이버·Bing·Yandex). published blog_html 만.
        #   Google 은 IndexNow 미지원이나, KR 검색(네이버)에 발행 즉시 통지 가치.
        #   실패는 발행과 무관(graceful) — 네트워크 미허용/오류 시 조용히 skip.
        if obj.status == "published" and channel == "blog_html":
            try:
                from sqlalchemy import text as _sql_in
                _r = s.execute(
                    _sql_in(
                        "SELECT gc.slug, gc.partner_category, gc.is_partner_content, "
                        "       t.partner_slug "
                        "FROM generated_contents gc LEFT JOIN tenants t ON t.id = gc.tenant_id "
                        "WHERE gc.id = :id"
                    ),
                    {"id": obj.id},
                ).first()
                if _r and _r[0]:
                    from src.collector.indexnow import build_post_url, submit_urls
                    _url = build_post_url(
                        slug=_r[0],
                        partner_category=_r[1],
                        is_partner=bool(_r[2]),
                        partner_slug=_r[3],
                    )
                    submit_urls([_url])
            except Exception:
                pass

        return obj.status


def _map_partner_category(domain_category: str | None) -> str | None:
    """tenants.domain_category → /with-partners 카테고리 slug.

    medimap-blog-v2 ``content-queue/[id]/route.ts`` 의 CATEGORY_MAP 과 동일하게 유지.
    매핑에 없으면 None (카테고리 불명 → with-partners 미노출, 안전).
    """
    if not domain_category:
        return None
    _m = {
        "안과": "eyeclinic", "피부과": "derma", "성형외과": "plastic",
        "치과": "dental", "내과": "internal", "모발이식": "hair",
        "한방의원": "oriental", "한방": "oriental",
        # 영문 별칭도 허용
        "eyeclinic": "eyeclinic", "derma": "derma", "plastic": "plastic",
        "dental": "dental", "internal": "internal", "hair": "hair",
        "oriental": "oriental",
    }
    return _m.get(domain_category.strip())


def _classify_overseas_blog_category(keyword: str, title: str = "") -> str:
    """해외(en/ja/zh) 비파트너 콘텐츠 → B2C blog_category slug 매핑.

    medimap-blog/src/lib/overseasBlog.ts classifyOverseasBlogCategory 와 동일:
        k_beauty  — K-뷰티의 우수성 (미용/피부 시술)
        k_medical — K-의료의 우수성 (안과·치과·내과·모발 등)
        k_tips    — K-의료·뷰티 이용 꿀팁 (병원 선택·비용·예약)

    키워드는 언어별로 현지어(ja/zh)라 다국어 마커로 판별한다.
    """
    text = ((keyword or "") + " " + (title or "")).strip().lower()
    if not text:
        return "k_beauty"

    # 1) k_tips — 병원 선택/추천/비교형 (리스티클)
    tips_kws = [
        "best ", "how to choose", "clinic in", "clinics in",
        "추천", "おすすめ", "ランキング", "クリニック", "推荐", "攻略", "诊所",
    ]
    if any(t in text for t in tips_kws):
        return "k_tips"

    # 2) k_medical — 의료(안과·치과·내과·모발)
    medical_kws = [
        "lasik", "smile", "implant", "dental", "screening", "eye",
        "라식", "임플란트", "레이시크",
        "レーシック", "インプラント", "眼科", "歯",
        "近视", "植发", "种植牙", "眼科", "牙",
    ]
    if any(t in text for t in medical_kws):
        return "k_medical"

    # 3) k_beauty — 그 외 미용/피부 시술 (default)
    return "k_beauty"


def _map_blog_category(keyword: str, title: str = "") -> str:
    """자사 인사이트 키워드 + title → blog_category slug 매핑.

    medimap-blog/src/lib/posts.ts BLOG_CATEGORY_SLUGS 와 동일:
        content_marketing | ai_trend | hospital_marketing

    Round 59 fix 6 (2026-06-01) — 단일 키워드만 보면 편향 (모든 자사 글이 "의료 GEO 최적화"
    키워드 → 다 ai_trend). title 도 함께 보고 더 정확히 분류:
        1. content_marketing — 콘텐츠/전략/블로그/SEO 인사이트 (마케팅 채널/방법)
        2. ai_trend — AI 기술·검색엔진·GEO 원리 (기술 트렌드 자체)
        3. hospital_marketing — 의료법·병원 운영·환자 유치 실전 (현장 노하우)
    """
    text = ((keyword or "") + " " + (title or "")).strip().lower()
    if not text:
        return "hospital_marketing"

    # 1) hospital_marketing — 의료법·병원 운영·환자 유치 실전 (가장 구체적)
    hospital_kws = [
        "의료법", "광고 가이드", "광고가이드",
        "병원 운영", "병원운영", "환자 유치", "환자유치",
        "현장", "노하우", "실무", "실전", "전담의", "운영자",
        "신뢰", "후기", "리뷰",
    ]
    if any(t in text for t in hospital_kws):
        return "hospital_marketing"

    # 2) content_marketing — 콘텐츠/전략/SEO/로컬 인사이트
    content_kws = [
        "콘텐츠", "포스팅", "블로그 글", "블로그글",
        "키워드 전략", "키워드전략",
        "로컬 seo", "로컬seo", "지역 seo", "지역seo",
        "전략", "접점", "고객", "환자와", "공감",
        "인사이트", "가이드", "방법",
    ]
    if any(t in text for t in content_kws):
        return "content_marketing"

    # 3) ai_trend — AI 검색엔진·GEO/AEO 원리·기술 트렌드
    ai_kws = [
        "geo", "aeo", "ai 검색", "ai검색", "ai 시대", "ai시대",
        "perplexity", "chatgpt", "gemini", "claude", "llm",
        "검색 시대", "검색시대", "생성형", "ai 기술", "기술 트렌드",
        "원칙", "원리",
    ]
    if any(t in text for t in ai_kws):
        return "ai_trend"

    # 4) default — 가장 안전 (실전 노하우)
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


def _make_slug(keyword: str, content_id: int, lang: str = "ko") -> str:
    """한글/영문 키워드를 URL-safe slug 로 변환. 항상 -{id} suffix 로 충돌 0.

    Round 29 (2026-05-30): 한글 키워드 → 영문 slug 매핑 우선 적용.
    매핑에 없으면 한글 제거 + 영문/숫자만 사용. id suffix 로 충돌 0.

    Round 146-B (2026-08-15): 해외(lang != ko) 신규 발행 슬러그에 지역 접미사.
    "skin clinic in korea" 상위 5사 실측 — 서비스 페이지 전수가 `-in-seoul`/
    `-gangnam` 류 지역 접미사 영문 슬러그(2·3·4·5번 사이트 공통). 키워드에
    이미 'in korea/seoul' 이 있으면 자연 포함되므로 없을 때만 `-in-korea` 추가.
    기존 발행분 슬러그는 불변(신규만) — URL 유지 = 랭킹 유지 원칙.
    """
    import re as _re
    k = (keyword or "").strip()

    base: str | None = None
    # 1) 정확 매칭 — KEYWORD_SLUG_MAP
    if k in KEYWORD_SLUG_MAP:
        base = KEYWORD_SLUG_MAP[k]
    else:
        # 2) 부분 매칭 — keyword 안에 매핑 키가 포함되면 그것 사용
        for ko, en in KEYWORD_SLUG_MAP.items():
            if ko in k:
                base = en
                break

    if base is None:
        # 3) Fallback — 영문/숫자만 추출
        base = _re.sub(r"[^a-zA-Z0-9\-\s]+", "", k).strip().lower()
        base = _re.sub(r"[\s_]+", "-", base).strip("-")
        if not base:
            # 한글만 있는 경우 — id 만 사용
            base = "post"
        base = base[:40]

    # 해외 지역 접미사 — 이미 '-in-' 이 있으면(예: smile-lasik-in-korea) 중복 금지
    if lang and lang != "ko" and "-in-" not in f"-{base}-":
        base = f"{base[:30].rstrip('-')}-in-korea"
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
