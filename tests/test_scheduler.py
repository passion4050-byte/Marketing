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
