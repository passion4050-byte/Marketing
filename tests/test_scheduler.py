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


def test_start_scheduler_registers_daily_job(session_factory):
    sched = start_scheduler(session_factory)
    assert sched is not None
    jobs = get_scheduled_jobs()
    assert len(jobs) == 1
    assert jobs[0]["id"] == "daily_measurement"
    assert "Daily" in jobs[0]["name"]
    assert jobs[0]["next_run"] is not None


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
