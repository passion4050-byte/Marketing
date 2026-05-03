"""Phase 2-T3.5 — USD 비용 가드레일 + LlmCallLog 테스트."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.cost import (
    daily_usd_used,
    estimate_call_cost_usd,
    check_daily_usd_budget,
)
from src.content.generator import generate_instagram_content
from src.content.llm import CostGuardrailExceeded
from src.storage.models import Base, ComplianceRule, LlmCallLog, Tenant


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    s = SessionLocal()
    s.add(Tenant(id=1, name="t1", domain_category="안과", region="서울", business_model=""))
    s.add(ComplianceRule(
        tenant_id=1, rule_type="forbidden_word",
        pattern="100%", severity="error", message="절대",
    ))
    s.commit()
    yield s
    s.close()


def test_estimate_call_cost_usd_gemini():
    # gemini-2.5-flash: input 0.075/M, output 0.30/M
    # 1k input + 1k output → input 0.075/1000 + output 0.30/1000 = 0.000075 + 0.0003 = 0.000375
    cost = estimate_call_cost_usd("gemini-2.5-flash", 1000, 1000)
    assert cost == pytest.approx(0.000375, abs=1e-6)


def test_estimate_call_cost_usd_stub_zero():
    assert estimate_call_cost_usd("stub", 1_000_000, 1_000_000) == 0.0


def test_estimate_call_cost_usd_unknown_model_uses_fallback():
    # 알 수 없는 모델 → 기본 단가 (input 1.0, output 5.0 / 1M)
    cost = estimate_call_cost_usd("nonexistent-model-x", 1000, 1000)
    assert cost == pytest.approx(0.001 + 0.005, abs=1e-6)


def test_check_daily_usd_budget_under_limit(session, monkeypatch):
    monkeypatch.setenv("MAX_DAILY_USD", "5.0")
    # 누적 LlmCallLog 0 — 통과
    check_daily_usd_budget(session, 1)


def test_check_daily_usd_budget_exceeds(session, monkeypatch):
    monkeypatch.setenv("MAX_DAILY_USD", "0.10")
    # 비싼 호출 시뮬레이션 — 0.05 USD 두 건
    for _ in range(2):
        session.add(LlmCallLog(
            tenant_id=1, provider="gemini", model="gemini-2.5-flash",
            channel="instagram", keyword="x",
            input_tokens=100_000, output_tokens=100_000,
            cost_usd=0.05, status="success",
        ))
    session.commit()
    # 누적 0.10 > 한도 0.10 → 다음 호출 (0 USD) 도 raise
    with pytest.raises(CostGuardrailExceeded):
        check_daily_usd_budget(session, 1, projected_cost=0.001)


def test_daily_usd_used_excludes_other_tenants(session):
    # tenant 2 의 비용은 tenant 1 누적에 포함되면 안 됨
    session.add(Tenant(id=2, name="t2", domain_category="x", region="y", business_model=""))
    session.commit()
    session.add(LlmCallLog(
        tenant_id=2, provider="gemini", model="gemini-2.5-flash",
        channel="instagram", keyword="x",
        input_tokens=0, output_tokens=0, cost_usd=10.0, status="success",
    ))
    session.commit()
    assert daily_usd_used(session, 1) == 0.0
    assert daily_usd_used(session, 2) == 10.0


def test_llm_call_log_persists_after_generate(session, monkeypatch):
    """stub generator 호출 → LlmCallLog 행 작성됨."""
    # 테스트 격리 — 환경 .env 가 gemini 로 셋업됐어도 stub 으로 강제
    monkeypatch.setenv("LLM_PROVIDER", "stub")
    before = session.query(LlmCallLog).count()
    generate_instagram_content(
        session, tenant_id=1, keyword="강남 라식", max_corrections=0,
    )
    after = session.query(LlmCallLog).count()
    assert after > before
    last = session.query(LlmCallLog).order_by(LlmCallLog.id.desc()).first()
    assert last.tenant_id == 1
    assert last.channel == "instagram"
    assert last.provider == "stub"
