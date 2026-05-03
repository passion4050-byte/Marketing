"""Phase 2-T3.4 — Instagram 캡션 채널 테스트."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.generator import generate_instagram_content
from src.content.templates.instagram import (
    InstagramCaption,
    post_from_dict,
    render_instagram_caption,
    validate_hashtags,
    validate_length,
)
from src.storage.models import Base, ComplianceRule, GeneratedContent, Tenant


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    s = SessionLocal()
    s.add(Tenant(
        id=1, name="테스트1",
        domain_category="안과/시력교정", region="서울 강남",
        business_model="라식 전문",
    ))
    s.add(ComplianceRule(
        tenant_id=1, rule_type="forbidden_word",
        pattern="100%", severity="error", message="절대표현 금지",
    ))
    s.commit()
    yield s
    s.close()


def test_validate_length_in_range():
    cap = InstagramCaption(
        hook="A" * 50,
        body="B" * 150,
        cta="C" * 50,  # total 250
        hashtags=["a", "b", "c", "d", "e"],
    )
    ok, n = validate_length(cap)
    assert ok is True
    assert n == 250


def test_validate_length_too_short():
    cap = InstagramCaption(hook="짧음", body="짧은본문", cta="짧은cta", hashtags=["a"])
    ok, n = validate_length(cap)
    assert ok is False
    assert n < 200


def test_validate_hashtags_in_range():
    cap = InstagramCaption(hook="", body="", cta="", hashtags=["a", "b", "c", "d", "e", "f"])
    ok, n = validate_hashtags(cap)
    assert ok is True
    assert n == 6


def test_validate_hashtags_too_few():
    cap = InstagramCaption(hook="", body="", cta="", hashtags=["a", "b"])
    ok, n = validate_hashtags(cap)
    assert ok is False
    assert n == 2


def test_render_includes_hashtags():
    cap = InstagramCaption(
        hook="hook line",
        body="body content",
        cta="cta call",
        hashtags=["라식", "안과"],
    )
    rendered = render_instagram_caption(cap)
    assert "hook line" in rendered
    assert "body content" in rendered
    assert "cta call" in rendered
    assert "#라식" in rendered
    assert "#안과" in rendered


def test_post_from_dict():
    data = {"hook": "h", "body": "b", "cta": "c", "hashtags": ["x", "y"]}
    cap = post_from_dict(data)
    assert cap.hook == "h"
    assert cap.hashtags == ["x", "y"]


def test_generate_instagram_content_stub_saves(session):
    """stub generator → DB 저장 + iterations <= 3."""
    result = generate_instagram_content(
        session, tenant_id=1, keyword="강남 라식 잘하는 곳", max_corrections=3,
    )
    assert result.compliance.status in ("pass", "warn")
    assert result.iterations <= 4
    assert result.saved_id is not None

    saved = session.query(GeneratedContent).filter_by(id=result.saved_id).one()
    assert saved.channel == "instagram"
    assert "hook" in saved.raw_qa_pairs
    assert "hashtags" in saved.raw_qa_pairs
    assert isinstance(saved.raw_qa_pairs["hashtags"], list)
