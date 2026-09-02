"""Phase 4-T2.5 — Scheduler pytest.

검증:
- start_scheduler(SessionLocal) 가 멱등 — 이미 실행 중이면 같은 인스턴스 반환
- 등록된 작업 1건 (id="daily_measurement")
- get_scheduled_jobs() 가 dict 리스트 반환
- daily_measurement_job 은 활성 keyword 0건이면 즉시 빈 summary 반환
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.collector.scheduler import (
    daily_measurement_job,
    get_scheduled_jobs,
    start_scheduler,
    stop_scheduler,
)
from src.storage.models import Base, Keyword, Tenant


@pytest.fixture
def session_factory(monkeypatch):
    monkeypatch.setenv("ENGINE_PROVIDER", "stub")
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    return SessionLocal


@pytest.fixture(autouse=True)
def _scheduler_cleanup():
    yield
    stop_scheduler()


def test_start_scheduler_registers_daily_jobs(session_factory):
    """Phase 6.5: 측정 + 자동 콘텐츠 생성 — 2 jobs 등록."""
    sched = start_scheduler(session_factory)
    assert sched is not None
    jobs = get_scheduled_jobs()
    job_ids = {j["id"] for j in jobs}
    assert "daily_measurement" in job_ids
    assert "daily_auto_content" in job_ids
    for j in jobs:
        assert j["next_run"] is not None


def test_start_scheduler_idempotent(session_factory):
    s1 = start_scheduler(session_factory)
    s2 = start_scheduler(session_factory)
    assert s1 is s2  # 같은 인스턴스


def test_stop_scheduler_idempotent():
    stop_scheduler()
    stop_scheduler()  # 두 번 호출해도 예외 없음
    assert get_scheduled_jobs() == []


def test_daily_measurement_job_no_keywords_returns_zero(session_factory):
    """활성 keyword 가 없으면 summary 가 모두 0."""
    summary = daily_measurement_job(session_factory)
    assert summary == {"keywords": 0, "success": 0, "failed": 0, "mentions": 0}


def test_daily_measurement_job_runs_for_active_keywords(monkeypatch, session_factory):
    """active keyword 1개에 대해 collect_for_keyword 가 호출되어야."""
    monkeypatch.setenv("MAX_DAILY_USD", "100")

    with session_factory() as s:
        s.add(
            Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model="")
        )
        s.commit()
        s.add(
            Keyword(
                id=1, tenant_id=1, text="라식",
                target_brand="메디맵", is_active=True,
            )
        )
        s.add(
            Keyword(
                id=2, tenant_id=1, text="비활성",
                target_brand="메디맵", is_active=False,
            )
        )
        s.commit()

    # 빠른 수집을 위해 n_samples 를 패치 — 기본 30 은 테스트로는 무리
    import src.collector.scheduler as sched_mod
    original_run = sched_mod.daily_measurement_job

    # collect_for_keyword 를 작은 n_samples 로 호출하도록 monkeypatch
    from src.collector import collect as collect_mod
    original_collect = collect_mod.collect_for_keyword

    async def _small_collect(*a, **kw):
        kw["n_samples"] = 2
        return await original_collect(*a, **kw)

    monkeypatch.setattr(collect_mod, "collect_for_keyword", _small_collect)
    monkeypatch.setattr(sched_mod, "collect_for_keyword", _small_collect, raising=False)

    summary = daily_measurement_job(session_factory)
    assert summary["keywords"] == 1  # is_active=False 는 제외
    assert summary["success"] == 2  # n_samples=2


# ─── Phase 6.5: daily_auto_content_job ───────────────────────────


def test_daily_auto_content_job_skips_when_disabled(session_factory):
    """AutoContentSetting 이 enabled=False 인 tenant 는 스킵."""
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting

    with session_factory() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.add(AutoContentSetting(tenant_id=1, enabled=False, daily_count=2,
                                 channels=["schema_org"]))
        s.commit()

    summary = daily_auto_content_job(session_factory)
    assert summary["tenants"] == 0
    assert summary["drafts"] == 0


def test_daily_auto_content_job_creates_drafts(monkeypatch, session_factory):
    """enabled=True + 활성 키워드 → daily_count 만큼 status='draft' 콘텐츠 생성."""
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting, GeneratedContent

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")

    with session_factory() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.add(AutoContentSetting(
            tenant_id=1, enabled=True, daily_count=2,
            channels=["schema_org"],
        ))
        s.commit()

    summary = daily_auto_content_job(session_factory)
    assert summary["tenants"] == 1
    assert summary["drafts"] == 2

    with session_factory() as s:
        drafts = (
            s.query(GeneratedContent)
            .filter(GeneratedContent.status == "draft")
            .all()
        )
    assert len(drafts) == 2
    assert all(d.channel == "schema_org" for d in drafts)


def test_daily_auto_content_job_round_robin_keywords_and_channels(
    monkeypatch, session_factory,
):
    """다중 활성 키워드 × 채널 — daily_count 슬롯이 (keyword, channel) round-robin 으로 채워진다."""
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting, GeneratedContent

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")

    with session_factory() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        # 활성 키워드 3개 + 비활성 1개 — 비활성은 라운드로빈에서 제외돼야
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.add(Keyword(id=2, tenant_id=1, text="라섹", target_brand="메디맵", is_active=True))
        s.add(Keyword(id=3, tenant_id=1, text="스마일라식", target_brand="메디맵", is_active=True))
        s.add(Keyword(id=4, tenant_id=1, text="비활성", target_brand="메디맵", is_active=False))
        s.add(AutoContentSetting(
            tenant_id=1, enabled=True, daily_count=6,
            channels=["schema_org", "blog_html"],
        ))
        s.commit()

    summary = daily_auto_content_job(session_factory)
    assert summary["tenants"] == 1
    assert summary["drafts"] == 6

    with session_factory() as s:
        drafts = (
            s.query(GeneratedContent)
            .filter(GeneratedContent.status == "draft")
            .order_by(GeneratedContent.id)
            .all()
        )
    pairs = [(d.keyword_text, d.channel) for d in drafts]

    # 활성 키워드 3개 모두 등장 (비활성 "비활성" 은 미등장)
    used_keywords = {k for k, _ in pairs}
    assert used_keywords == {"라식", "라섹", "스마일라식"}

    # 채널 2종 모두 등장 + 균등 (daily_count=6, channels=2 → 각 3회)
    used_channels = [c for _, c in pairs]
    assert used_channels.count("schema_org") == 3
    assert used_channels.count("blog_html") == 3


def _create_naver_report_table(session_factory):
    """naver_search_report 는 ORM 모델이 아니라 raw SQL 로만 쓰인다(임포터 전용).

    테스트 SQLite 에는 존재하지 않으므로 필요한 컬럼만 직접 만든다.
    """
    from sqlalchemy import text as _t

    with session_factory() as s:
        s.execute(_t(
            "CREATE TABLE naver_search_report ("
            " id INTEGER PRIMARY KEY, tenant_id INTEGER, dimension TEXT,"
            " value TEXT, clicks INTEGER, impressions INTEGER, keyword_id INTEGER)"
        ))
        # keywords.purpose 는 실 DB 에 있지만 ORM Keyword 모델에는 없다(Round 182c 기록).
        # 드레인 SQL 이 purpose 게이트를 쓰므로 테스트 스키마도 실 DB 를 따라간다.
        s.execute(_t("ALTER TABLE keywords ADD COLUMN purpose TEXT"))
        s.commit()


def _insert_naver_row(session_factory, **kw):
    from sqlalchemy import text as _t

    with session_factory() as s:
        s.execute(
            _t(
                "INSERT INTO naver_search_report"
                " (tenant_id, dimension, value, clicks, impressions, keyword_id)"
                " VALUES (:tenant_id, 'keyword', :value, :clicks, :impressions, :keyword_id)"
            ),
            kw,
        )
        s.commit()


def _run_one_blog_draft(monkeypatch, session_factory, keywords, naver_rows):
    """공통 셋업 — 키워드 N개 중 네이버 수요 드레인이 무엇을 고르는지 1편으로 관찰."""
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting, GeneratedContent

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")

    with session_factory() as s:
        # publish_plan='B' — 플랜 A 의 월/수/금 게이트에 테스트가 요일 의존하지 않게.
        s.add(Tenant(
            id=1, name="메디맵", domain_category="안과", region="서울",
            business_model="", publish_plan="B",
        ))
        s.commit()
        for kid, text_ in keywords:
            s.add(Keyword(id=kid, tenant_id=1, text=text_,
                          target_brand="메디맵", is_active=True))
        s.add(AutoContentSetting(
            tenant_id=1, enabled=True, daily_count=1, channels=["blog_html"],
        ))
        s.commit()

    _create_naver_report_table(session_factory)
    for row in naver_rows:
        _insert_naver_row(session_factory, **row)

    daily_auto_content_job(session_factory)

    with session_factory() as s:
        drafts = s.query(GeneratedContent).order_by(GeneratedContent.id).all()
    return [d.keyword_text for d in drafts]


def test_naver_demand_drain_prefers_high_impression_keyword(
    monkeypatch, session_factory,
):
    """Round 183 — 발행 이력 0편인 '네이버 노출 입증' 키워드를 먼저 고른다.

    수정 전에는 (날짜 ordinal + tenant_id) % len 라운드로빈이라 노출 42짜리와
    노출 0짜리의 선택 확률이 같았다.
    """
    picked = _run_one_blog_draft(
        monkeypatch, session_factory,
        keywords=[(1, "라식"), (2, "라섹"), (3, "모발이식 탈락기")],
        naver_rows=[dict(tenant_id=1, value="모발이식 탈락기", clicks=0,
                         impressions=42, keyword_id=3)],
    )
    assert picked == ["모발이식 탈락기"]


def test_naver_demand_drain_joins_via_keyword_id_not_value(
    monkeypatch, session_factory,
):
    """리포트 원문(value)과 keywords.text 가 어긋나도 keyword_id 로 이어진다.

    실측: 임포터가 물음표를 떼면서 "…지속되나요?" != "…지속되나요" 가 됐고,
    value 매칭이었다면 최상위 성과 키워드(노출 42·CTR 14.3%)가 통째로 누락된다.
    """
    picked = _run_one_blog_draft(
        monkeypatch, session_factory,
        keywords=[(1, "라식"), (2, "라섹"),
                  (3, "백옥주사 효과는 얼마나 지속되나요")],
        naver_rows=[dict(tenant_id=1, value="백옥주사 효과는 얼마나 지속되나요?",
                         clicks=6, impressions=42, keyword_id=3)],
    )
    assert picked == ["백옥주사 효과는 얼마나 지속되나요"]


def test_naver_demand_drain_ignores_low_impression_and_below_threshold(
    monkeypatch, session_factory,
):
    """임계(기본 10) 미만 노출은 드레인 대상이 아니다 — 기존 로테이션 그대로.

    "드레인이 안 골랐다"를 `!=` 로 쓰면 안 된다. 기본 로테이션이
    (날짜 ordinal + tenant_id) % len 이라 우연히 같은 키워드를 집을 수 있어
    판별력이 없다(실제로 그렇게 오탐했다). 로테이션 픽을 직접 계산해 비교한다.
    """
    import datetime as _dt

    kws = ["라식", "라섹", "노출적은키워드"]  # Keyword.id ASC 순서
    expected = kws[(_dt.date.today().toordinal() + 1) % len(kws)]

    picked = _run_one_blog_draft(
        monkeypatch, session_factory,
        keywords=list(enumerate(kws, start=1)),
        naver_rows=[dict(tenant_id=1, value="노출적은키워드", clicks=0,
                         impressions=3, keyword_id=3)],
    )
    assert picked == [expected]


def test_naver_demand_drain_applies_to_target_path(monkeypatch, session_factory):
    """Round 183 — 타깃 발행 경로(target_tenant_id)에도 같은 드레인이 걸린다.

    Round 182c 의 교훈: 게이트를 일반 로테이션에만 달면 타깃 경로는 옛 규칙으로
    계속 발행한다(Round 164b 와 같은 문). 여기서 한 번 더 반복하지 않는지 잠근다.
    """
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting, GeneratedContent

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")

    with session_factory() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울",
                     business_model="", publish_plan="B"))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.add(Keyword(id=2, tenant_id=1, text="라섹", target_brand="메디맵", is_active=True))
        s.add(Keyword(id=3, tenant_id=1, text="모발이식 탈락기",
                      target_brand="메디맵", is_active=True))
        s.add(AutoContentSetting(
            tenant_id=1, enabled=True, daily_count=1, channels=["blog_html"],
        ))
        s.commit()

    _create_naver_report_table(session_factory)
    _insert_naver_row(session_factory, tenant_id=1, value="모발이식 탈락기",
                      clicks=0, impressions=42, keyword_id=3)

    daily_auto_content_job(session_factory, target_tenant_id=1)

    with session_factory() as s:
        drafts = s.query(GeneratedContent).order_by(GeneratedContent.id).all()
    assert [d.keyword_text for d in drafts] == ["모발이식 탈락기"]
