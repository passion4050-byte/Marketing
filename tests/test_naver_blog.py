"""Phase 2-T3.4 — 네이버 블로그 평문 채널 테스트."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.generator import generate_naver_blog_content
from src.content.templates.naver_blog import (
    NaverBlogPost,
    NaverSection,
    post_from_dict,
    render_naver_plain,
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


def test_render_plain_basic_structure():
    post = NaverBlogPost(
        title="강남 라식, 처음 알아볼 때",
        intro=["안녕하세요, 오늘은 라식에 대해 이야기해 봅니다."],
        sections=[
            NaverSection(heading="💡 1. 검사", paragraphs=["사전 검사가 중요합니다."]),
            NaverSection(heading="🩺 2. 회복", paragraphs=["회복 기간은 1~3일."]),
        ],
        conclusion=["정밀 검사를 우선해주세요."],
        hashtags=["라식", "안과"],
        image_count=2,
    )
    plain = render_naver_plain(post)
    # 타이틀, 헤더, 해시태그가 모두 포함되어야 함
    assert "강남 라식" in plain
    assert "💡 1. 검사" in plain
    assert "[이미지1]" in plain
    assert "#라식" in plain
    assert "#안과" in plain


def test_render_plain_strips_markdown():
    post = NaverBlogPost(
        title="t",
        intro=["**bold** 와 *italic* 모두 평문화."],
        sections=[],
        conclusion=[],
        hashtags=[],
    )
    plain = render_naver_plain(post)
    assert "**" not in plain
    assert "*" not in plain.split("\n")[2]  # title 제외 본문 라인


def test_naver_post_from_dict():
    data = {
        "title": "T",
        "intro": ["i1", "i2"],
        "sections": [{"heading": "💡 1.", "paragraphs": ["p1"]}],
        "conclusion": ["c1"],
        "hashtags": ["a", "b"],
        "image_count": 3,
    }
    post = post_from_dict(data, tenant_name="테스트1", tenant_address="서울")
    assert post.title == "T"
    assert len(post.sections) == 1
    assert post.sections[0].heading == "💡 1."
    assert post.image_count == 3
    assert post.tenant_name == "테스트1"


def test_generate_naver_blog_content_stub_saves(session):
    """stub provider 로 generator 호출 → DB 저장 + iterations <= 3."""
    result = generate_naver_blog_content(
        session, tenant_id=1, keyword="강남 라식 잘하는 곳",
        target_chars=2000, image_count=2, max_corrections=3,
    )
    assert result.compliance.status in ("pass", "warn")
    assert result.iterations <= 4  # 0~3 회 수정
    assert result.saved_id is not None

    saved = session.query(GeneratedContent).filter_by(id=result.saved_id).one()
    assert saved.channel == "naver_blog"
    assert "title" in saved.raw_qa_pairs
    assert saved.raw_qa_pairs["char_count"] > 0
