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
        # 🔴 Round 202 — publish_plan='B' 가 **없으면 이 테스트는 공허하게 통과**한다.
        #   기대값이 tenants=0 이라, 월/수/금이 아닌 날에는 enabled 게이트가 망가져도
        #   요일 게이트가 대신 0 을 만들어 초록불이 켜진다. 검증 대상을 요일에서 떼어낸다.
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울",
                     business_model="", publish_plan="B"))
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
        # 🔴 Round 202 — publish_plan='B'. 기본값 'A' 는 Round 83 의 월/수/금 게이트에
        #   걸려 **이 테스트가 주 4일(화·목·토·일) 실패**했다. 실측 2026-09-12(토):
        #   `scheduler.plan_a_skipped_today skipped_tenants=[1]` → tenants=0.
        #   이 테스트가 보려는 것은 요일 게이트가 아니라 draft 생성이다.
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울",
                     business_model="", publish_plan="B"))
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
        # Round 202 — publish_plan='B' (위와 같은 이유: 요일 게이트 비의존)
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울",
                     business_model="", publish_plan="B"))
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
        # 🔴 Round 202 — experiment_arm 도 같이 만든다. 타깃 경로의 _ok_rows SQL 이
        #   purpose·content_eligible·experiment_arm **세 컬럼을 한 쿼리로** 읽는데,
        #   이 컬럼이 없으면 쿼리 전체가 예외 → `except: _ok_rows = []` → 그 안에 있는
        #   네이버 드레인 블록이 통째로 건너뛰어진다. 즉 Round 183 을 잠그려고 만든
        #   테스트가 **드레인을 한 번도 실행하지 않은 채** 실패하고 있었다.
        #   (컬럼 하나가 빠져 가드가 조용히 죽는 것 — CLAUDE.md ORM 미매핑 항목과 같은 꼴)
        s.execute(_t("ALTER TABLE keywords ADD COLUMN experiment_arm TEXT"))
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


def _create_tenant_products_table(session_factory, rows):
    """tenant_products 는 raw SQL 로만 읽힌다(ORM 모델 없음) — 테스트 스키마를 직접 만든다.

    이 테이블이 없으면 `_publish_ok` 가 해외 키워드를 **전부** 걸러버려서,
    해외 관련 테스트가 무엇을 검증하든 통과해버린다(공허한 통과).
    """
    from sqlalchemy import text as _t

    with session_factory() as s:
        s.execute(_t(
            "CREATE TABLE tenant_products ("
            " id INTEGER PRIMARY KEY, tenant_id INTEGER, market TEXT,"
            " lang TEXT, status TEXT)"
        ))
        for tid, market, lang in rows:
            s.execute(
                _t("INSERT INTO tenant_products (tenant_id, market, lang, status)"
                   " VALUES (:tid, :m, :l, 'active')"),
                {"tid": tid, "m": market, "l": lang},
            )
        s.commit()


def test_rotation_without_scope_never_picks_overseas_keyword(
    monkeypatch, session_factory,
):
    """🔴 Round 201 — 범위 인자 없는 일반 로테이션은 ko 만 발행한다.

    실사고: R200 이 굶김 정렬을 ko 로 좁혔는데 키워드 풀은 안 좁혀서, ko 로 굶어
    1순위가 된 포레나의원이 그 슬롯에 zh-Hans 글(`红大皮肤科推荐`)을 냈다. 굶김 키는
    그대로 남아 다음 실행에서 또 1순위 — 알람은 계속 울리고 ko 는 영원히 안 나간다.

    해외는 범위를 명시하는 전용 배치(MARKET_ONLY/LANG_ONLY)가 따로 담당한다.

    설계 메모: daily_count 를 풀 크기와 같게 둬서 **날짜 로테이션 오프셋과 무관하게**
    판정된다. 수정 전이라면 6슬롯이 6개 키워드를 한 바퀴 돌아 해외가 반드시 섞인다.
    """
    from src.collector.scheduler import daily_auto_content_job
    from src.storage.models import AutoContentSetting, GeneratedContent

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")

    with session_factory() as s:
        s.add(Tenant(id=1, name="포레나의원", domain_category="피부과", region="서울",
                     business_model="", publish_plan="B"))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="강남 리쥬란", target_brand="포레나",
                      is_active=True, lang="ko", market="domestic"))
        for _i, (_lang, _text) in enumerate(
            [("en", "gangnam skin clinic"), ("ja", "江南 皮膚科"),
             ("zh-Hans", "红大皮肤科推荐"), ("zh-Hant", "江南皮膚科推薦"),
             ("en", "korea skin booster")],
            start=2,
        ):
            s.add(Keyword(id=_i, tenant_id=1, text=_text, target_brand="포레나",
                          is_active=True, lang=_lang, market="overseas"))
        s.add(AutoContentSetting(
            tenant_id=1, enabled=True, daily_count=6, channels=["blog_html"],
        ))
        s.commit()

    # 해외 상품을 전부 active 로 — 이게 없으면 _publish_ok 가 해외를 걸러 공허한 통과가 된다.
    _create_tenant_products_table(session_factory, [
        (1, "overseas", "en"), (1, "overseas", "ja"),
        (1, "overseas", "zh-Hans"), (1, "overseas", "zh-Hant"),
    ])

    daily_auto_content_job(session_factory)

    with session_factory() as s:
        drafts = s.query(GeneratedContent).order_by(GeneratedContent.id).all()

    assert drafts, "발행이 0건이면 이 테스트는 아무것도 검증하지 못한다"
    assert {d.keyword_text for d in drafts} == {"강남 리쥬란"}


def _setup_coverage_tenant(session_factory, tenant_id: int):
    """Round 204 — 커버리지 드레인 공통 셋업.

    키워드 4개 (Keyword.id 순):
      1 홍대 리쥬란                   — 이미 발행 1편 (covered)
      2 포레나의원 위치와 진료 시간    — 브랜드명 질의 (uncovered 이지만 브랜드)
      3 홍대 스킨부스터 비용           — **글 0편 · 비브랜드** ← 드레인 대상
      4 홍대 울쎄라                   — 이미 발행 1편 (covered)
    """
    from src.storage.models import AutoContentSetting, GeneratedContent

    with session_factory() as s:
        # publish_plan='B' — 월/수/금 게이트에 요일 의존하지 않게 (Round 202).
        s.add(Tenant(id=tenant_id, name="포레나의원", domain_category="피부과", region="서울",
                     business_model="", publish_plan="B", partner_slug="forena"))
        s.commit()
        for kid, text_ in [(1, "홍대 리쥬란"), (2, "포레나의원 위치와 진료 시간"),
                           (3, "홍대 스킨부스터 비용"), (4, "홍대 울쎄라")]:
            s.add(Keyword(id=kid, tenant_id=tenant_id, text=text_, target_brand="포레나",
                          is_active=True, lang="ko", market="domestic"))
        for text_ in ("홍대 리쥬란", "홍대 울쎄라"):
            s.add(GeneratedContent(tenant_id=tenant_id, keyword_text=text_, channel="blog_html",
                                   body="<p>기존 글</p>", compliance_status="pass",
                                   status="published", lang="ko", market="domestic"))
        s.add(AutoContentSetting(
            tenant_id=tenant_id, enabled=True, daily_count=4, channels=["blog_html"],
        ))
        s.commit()
    # 타깃 경로의 _ok_rows SQL 이 purpose·experiment_arm 을 읽는다 — 없으면 가드가 통째로 죽는다(R202).
    _create_naver_report_table(session_factory)


def _new_blog_keywords(session_factory) -> list[str]:
    from src.storage.models import GeneratedContent

    with session_factory() as s:
        rows = (
            s.query(GeneratedContent)
            .filter(GeneratedContent.status != "published")
            .order_by(GeneratedContent.id)
            .all()
        )
    return [r.keyword_text for r in rows]


def test_coverage_drain_rotation_picks_only_uncovered_nonbranded(monkeypatch, session_factory):
    """🔴 Round 204 — 로테이션은 글 0편인 비브랜드 ko 키워드를 먼저 소진한다.

    실측 근거: 비브랜드 own 키워드의 AI 답변 등장률이 글 있음 10~14% vs 없음 6~7%.
    그런데 최근 30일 ko 발행의 33% 가 이미 글이 있는 키워드의 반복이었다.

    판별력: daily_count = 풀 크기(4) → 수정 전이면 4슬롯이 4개 키워드를 한 바퀴 돌아
    covered·브랜드 키워드가 **반드시** 섞인다. 날짜 오프셋과 무관하다.
    """
    from src.collector.scheduler import daily_auto_content_job

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")
    monkeypatch.delenv("COVERAGE_DRAIN", raising=False)
    _setup_coverage_tenant(session_factory, tenant_id=1)

    daily_auto_content_job(session_factory)

    picked = _new_blog_keywords(session_factory)
    assert picked, "생성 0건이면 이 테스트는 아무것도 검증하지 못한다"
    assert set(picked) == {"홍대 스킨부스터 비용"}


def test_coverage_drain_can_be_disabled_by_env(monkeypatch, session_factory):
    """COVERAGE_DRAIN=0 이면 기존 로테이션 그대로 — 운영 중 코드 수정 없이 끌 수 있어야 한다."""
    from src.collector.scheduler import daily_auto_content_job

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")
    monkeypatch.setenv("COVERAGE_DRAIN", "0")
    _setup_coverage_tenant(session_factory, tenant_id=1)

    daily_auto_content_job(session_factory)

    assert set(_new_blog_keywords(session_factory)) == {
        "홍대 리쥬란", "포레나의원 위치와 진료 시간", "홍대 스킨부스터 비용", "홍대 울쎄라",
    }


def test_coverage_drain_applies_to_target_path(monkeypatch, session_factory):
    """🔴 Round 204 — 타깃 경로(target_tenant_id)에도 같은 드레인이 걸린다 (R182c·183 교훈).

    판별력: 타깃 경로는 (날짜 ordinal + tenant_id) % len 으로 1개를 고른다. tenant_id 를
    **오늘 수정 전 픽이 covered 키워드(id 1 '홍대 리쥬란')가 되도록** 골라서, 어느 날 돌려도
    수정 전 코드에서는 실패하게 만든다.
    """
    import datetime as _dt
    from src.collector.scheduler import daily_auto_content_job

    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    monkeypatch.setenv("MAX_CONTENT_GEN_PER_DAY", "100")
    monkeypatch.delenv("COVERAGE_DRAIN", raising=False)
    tid = next(t for t in range(1, 5) if (_dt.date.today().toordinal() + t) % 4 == 0)
    _setup_coverage_tenant(session_factory, tenant_id=tid)

    daily_auto_content_job(session_factory, target_tenant_id=tid)

    assert _new_blog_keywords(session_factory) == ["홍대 스킨부스터 비용"]
