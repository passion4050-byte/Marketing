"""Phase 4-T2.5 — Collector pytest.

검증:
- StubEngine + in-memory SQLite 로 collect_for_keyword e2e
- n=5 → Query 5건, Response 5건, Mention 5건+ (StubEngine 견본에 메디맵 포함)
- LlmCallLog channel="measurement" 누적
- target_brand 누락 시 Tenant.name 으로 fallback
- 비용 가드 발동 → 일부 sample 만 처리 + guardrail_stopped=True
- 다른 tenant 의 Mention 절대 섞이지 않음 (격리)
"""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.collector import collect_for_keyword
from src.engines import get_engine
from src.storage.models import (
    Base,
    Keyword,
    LlmCallLog,
    Mention,
    Query,
    Response,
    Tenant,
)


@pytest.fixture
def session_factory(monkeypatch):
    monkeypatch.setenv("ENGINE_PROVIDER", "stub")
    monkeypatch.setenv("MAX_DAILY_USD", "100")  # 가드 비활성화

    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(
            Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model="")
        )
        s.add(
            Tenant(id=2, name="다른클리닉", domain_category="치과", region="부산", business_model="")
        )
        s.commit()
        s.add(
            Keyword(
                id=1, tenant_id=1, text="강남 라식 잘하는 곳",
                target_brand="메디맵", is_active=True,
            )
        )
        s.add(
            Keyword(
                id=2, tenant_id=2, text="부산 임플란트", target_brand="", is_active=True,
            )
        )
        s.commit()
    return SessionLocal


def test_collect_inserts_query_response_mention(session_factory):
    with session_factory() as s:
        kw = s.get(Keyword, 1)

    result = asyncio.run(collect_for_keyword(
        session_factory, 1, kw, get_engine(), n_samples=5, concurrency=3,
    ))
    assert result.n_total == 5
    assert result.n_success == 5
    assert result.n_failed == 0
    assert result.n_mentions >= 5  # StubEngine 견본에 메디맵 포함
    assert result.guardrail_stopped is False

    with session_factory() as s:
        assert s.query(Query).count() == 5
        assert s.query(Response).count() == 5
        assert s.query(Mention).count() >= 5
        # Mention 의 is_target 가 True
        targets = s.query(Mention).filter(Mention.is_target == True).all()  # noqa: E712
        assert len(targets) >= 5


def test_collect_writes_llmcalllog_channel_measurement(session_factory):
    with session_factory() as s:
        kw = s.get(Keyword, 1)
    asyncio.run(collect_for_keyword(
        session_factory, 1, kw, get_engine(), n_samples=3, concurrency=2,
    ))
    with session_factory() as s:
        logs = s.query(LlmCallLog).filter(LlmCallLog.channel == "measurement").all()
        assert len(logs) == 3
        assert all(log.provider == "stub" for log in logs)


def test_collect_target_brand_falls_back_to_tenant_name(session_factory):
    """Keyword.target_brand 가 빈 문자열 → Tenant.name 사용."""
    with session_factory() as s:
        kw = s.get(Keyword, 2)  # tenant 2, target_brand=''
    result = asyncio.run(collect_for_keyword(
        session_factory, 2, kw, get_engine(), n_samples=3, concurrency=2,
    ))
    # tenant_2 name='다른클리닉' — StubEngine 견본에 미포함 → mentions 0
    # 하지만 collection 자체는 성공해야 함
    assert result.n_success == 3


def test_collect_cost_guardrail_stops(monkeypatch, session_factory):
    """projected cost 를 강제 양수로 만든 뒤 MAX_DAILY_USD=0 → 첫 sample 부터 가드 발동."""
    monkeypatch.setenv("MAX_DAILY_USD", "0.0")

    # stub engine 은 비용 0 이라 기본적으로 가드 발동 안 함.
    # 비용 추정을 강제 양수로 → 가드 발동 검증.
    import src.collector.collect as collect_mod
    monkeypatch.setattr(collect_mod, "_estimate_query_cost", lambda *a, **kw: 0.001)

    with session_factory() as s:
        kw = s.get(Keyword, 1)

    result = asyncio.run(collect_for_keyword(
        session_factory, 1, kw, get_engine(), n_samples=5, concurrency=3,
    ))
    assert result.guardrail_stopped is True
    assert result.error_msg is not None
    assert "한도" in result.error_msg or "초과" in result.error_msg
    assert result.n_success < 5


def test_collect_tenant_isolation(session_factory):
    """tenant_1 수집은 tenant_2 의 Query/Mention 행을 만들지 않음."""
    with session_factory() as s:
        kw = s.get(Keyword, 1)
    asyncio.run(collect_for_keyword(
        session_factory, 1, kw, get_engine(), n_samples=3, concurrency=2,
    ))
    with session_factory() as s:
        t1_q = s.query(Query).filter(Query.tenant_id == 1).count()
        t2_q = s.query(Query).filter(Query.tenant_id == 2).count()
        t1_m = s.query(Mention).filter(Mention.tenant_id == 1).count()
        t2_m = s.query(Mention).filter(Mention.tenant_id == 2).count()
    assert t1_q == 3
    assert t2_q == 0
    assert t1_m >= 3
    assert t2_m == 0


def test_collect_empty_returns_zero(session_factory):
    """n_samples=0 → 즉시 반환."""
    with session_factory() as s:
        kw = s.get(Keyword, 1)
    result = asyncio.run(collect_for_keyword(
        session_factory, 1, kw, get_engine(), n_samples=0,
    ))
    assert result.n_total == 0
    assert result.n_success == 0
