"""Tenant data feeding context block 테스트."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.tenant_context import build_tenant_context_block, has_active_data
from src.storage.models import Base, Doctor, Equipment, EventOffer, Tenant


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    s = SessionLocal()
    s.add(
        Tenant(
            id=1,
            name="BGN 밝은눈안과",
            domain_category="안과/시력교정",
            region="서울 강남",
        )
    )
    s.commit()
    yield s
    s.close()


def test_empty_when_no_data(session):
    block = build_tenant_context_block(session, tenant_id=1)
    assert block == ""


def test_doctor_block(session):
    session.add(
        Doctor(
            tenant_id=1,
            name="김시력",
            specialty="라식/라섹 전문의",
            education_career="연세대 의대\n시력교정술 15년",
            certifications="안과 전문의, 굴절교정 전문의",
            is_active=True,
        )
    )
    session.commit()

    block = build_tenant_context_block(session, tenant_id=1)
    assert "활성 의료진" in block
    assert "김시력" in block
    assert "라식/라섹 전문의" in block
    assert "15년" in block
    assert "안과 전문의" in block


def test_inactive_doctor_excluded(session):
    session.add(Doctor(tenant_id=1, name="김시력", specialty="안과", is_active=False))
    session.commit()
    block = build_tenant_context_block(session, tenant_id=1)
    assert "김시력" not in block


def test_equipment_block(session):
    session.add(
        Equipment(
            tenant_id=1,
            name="아마리스 레드 1050RS",
            manufacturer="SCHWIND",
            description="최첨단 엑시머 레이저",
            features="라식, 라섹, 스마일 라식",
            is_active=True,
        )
    )
    session.commit()
    block = build_tenant_context_block(session, tenant_id=1)
    assert "사용 장비" in block
    assert "아마리스 레드 1050RS" in block
    assert "SCHWIND" in block
    assert "엑시머 레이저" in block


def test_currently_running_event_included(session):
    now = datetime.now(timezone.utc)
    session.add(
        EventOffer(
            tenant_id=1,
            name="스마일 라식 특별 할인",
            regular_price=2500000,
            discount_price=1890000,
            period_start=now - timedelta(days=10),
            period_end=now + timedelta(days=20),
            is_active=True,
        )
    )
    session.commit()
    block = build_tenant_context_block(session, tenant_id=1)
    assert "진행 중인 이벤트" in block
    assert "스마일 라식 특별 할인" in block
    assert "2,500,000" in block
    assert "1,890,000" in block


def test_expired_event_excluded(session):
    """기간 종료된 이벤트는 컨텍스트에 안 들어감 (의료법 종료일 통과 보장)."""
    now = datetime.now(timezone.utc)
    session.add(
        EventOffer(
            tenant_id=1,
            name="만료된 이벤트",
            period_start=now - timedelta(days=60),
            period_end=now - timedelta(days=10),
            is_active=True,
        )
    )
    session.commit()
    block = build_tenant_context_block(session, tenant_id=1)
    assert "만료된 이벤트" not in block


def test_future_event_excluded(session):
    """아직 시작 안 한 이벤트도 제외."""
    now = datetime.now(timezone.utc)
    session.add(
        EventOffer(
            tenant_id=1,
            name="예정 이벤트",
            period_start=now + timedelta(days=10),
            period_end=now + timedelta(days=30),
            is_active=True,
        )
    )
    session.commit()
    block = build_tenant_context_block(session, tenant_id=1)
    assert "예정 이벤트" not in block


def test_has_active_data_counts(session):
    now = datetime.now(timezone.utc)
    session.add(Doctor(tenant_id=1, name="김시력", is_active=True))
    session.add(Doctor(tenant_id=1, name="박명의", is_active=True))
    session.add(Doctor(tenant_id=1, name="비활성", is_active=False))
    session.add(Equipment(tenant_id=1, name="장비A", is_active=True))
    session.add(
        EventOffer(
            tenant_id=1,
            name="현재",
            period_start=now - timedelta(days=1),
            period_end=now + timedelta(days=1),
            is_active=True,
        )
    )
    session.add(
        EventOffer(
            tenant_id=1,
            name="만료",
            period_start=now - timedelta(days=10),
            period_end=now - timedelta(days=1),
            is_active=True,
        )
    )
    session.commit()

    counts = has_active_data(session, 1)
    assert counts["doctors"] == 2
    assert counts["equipment"] == 1
    assert counts["active_events"] == 1


def test_doctor_is_complete():
    d = Doctor(tenant_id=1, name="김", specialty="안과", education_career="연세대")
    assert d.is_complete is True

    d2 = Doctor(tenant_id=1, name="김")
    assert d2.is_complete is False


def test_event_currently_running():
    now = datetime.now(timezone.utc)
    e = EventOffer(
        tenant_id=1,
        name="이벤트",
        period_start=now - timedelta(days=1),
        period_end=now + timedelta(days=1),
        is_active=True,
    )
    assert e.is_currently_running(now) is True

    e2 = EventOffer(
        tenant_id=1,
        name="비활성",
        period_start=now - timedelta(days=1),
        period_end=now + timedelta(days=1),
        is_active=False,
    )
    assert e2.is_currently_running(now) is False
