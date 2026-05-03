"""Phase 1.5 — Blog post 생성 + 렌더 통합 테스트.

Stub provider + in-memory SQLite. 네트워크/LLM 호출 없음.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.generator import generate_blog_post
from src.content.llm import StubProvider
from src.content.templates.blog_html import (
    BlogPost,
    BlogSection,
    BlogSubsection,
    ImageSlot,
    post_from_dict,
    render_body,
    render_full_html,
    render_meta_block,
    render_naver_blog_plain,
)
from src.storage.models import Base, ComplianceRule, Tenant


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
            business_model="라식/라섹 전문",
        )
    )
    s.add(
        ComplianceRule(
            tenant_id=1,
            rule_type="forbidden_word",
            pattern="100%\\s*(보장|성공|완치|효과)",
            severity="error",
            message="절대 보장 표현 금지",
        )
    )
    s.commit()
    yield s
    s.close()


def test_blog_generation_passes_with_stub(session):
    result = generate_blog_post(
        session,
        tenant_id=1,
        keyword="강남 라식 잘하는 곳",
        reference_urls=None,
        images=None,
        provider=StubProvider(),
        max_corrections=1,
        save=True,
    )
    assert result.passed
    assert result.compliance.status == "pass"
    assert result.post.title
    assert result.post.meta_description
    assert len(result.post.sections) >= 2
    assert result.body_html.startswith("<h1>")
    assert "<title>" in result.meta_block
    assert "FAQPage" not in result.body_html  # 다른 채널
    assert result.saved_id is not None


def test_blog_with_images_places_them_after_sections(session):
    images = [
        ImageSlot(src="./data/uploads/img1.jpg", alt="검사 장면", after_section=1),
        ImageSlot(src="./data/uploads/img2.jpg", alt="회복실", after_section=2),
    ]
    result = generate_blog_post(
        session,
        tenant_id=1,
        keyword="강남 라식 잘하는 곳",
        images=images,
        provider=StubProvider(),
        max_corrections=0,
        save=False,
    )
    assert len(result.post.images) == 2
    # body에 figure가 들어있는지
    assert result.body_html.count("<figure") == 2


def test_post_from_dict_handles_missing_fields():
    post = post_from_dict({"title": "T", "sections": [{"heading": "S1", "paragraphs": ["p"]}]})
    assert post.title == "T"
    assert len(post.sections) == 1
    assert post.intro_paragraphs == []


def test_render_full_html_is_valid_doctype():
    post = BlogPost(
        title="제목",
        meta_description="요약",
        keywords=["라식", "강남"],
        intro_paragraphs=["인트로"],
        sections=[
            BlogSection(heading="섹션1", paragraphs=["본문"], sub_sections=[
                BlogSubsection(heading="하위", paragraphs=["하위본문"])
            ])
        ],
        conclusion_paragraphs=["결론"],
        canonical_keyword="라식",
    )
    html = render_full_html(post)
    assert html.startswith("<!DOCTYPE html>")
    assert "<title>제목</title>" in html
    assert "<h1>제목</h1>" in html
    assert "<h2>섹션1</h2>" in html
    assert "<h3>하위</h3>" in html


def test_render_naver_plain_includes_hashtags():
    post = BlogPost(
        title="제목",
        meta_description="요약",
        keywords=["강남 라식", "검사"],
        intro_paragraphs=["인트로"],
        sections=[BlogSection(heading="첫섹션", paragraphs=["본문"], sub_sections=[])],
        conclusion_paragraphs=[],
        canonical_keyword="강남라식",
    )
    out = render_naver_blog_plain(post)
    assert "#강남라식" in out
    assert "#검사" in out
    assert "📌 첫섹션" in out


def test_meta_block_includes_og():
    post = BlogPost(
        title="제목",
        meta_description="설명",
        keywords=[],
        intro_paragraphs=[],
        sections=[],
        conclusion_paragraphs=[],
    )
    meta = render_meta_block(post)
    assert 'property="og:title"' in meta
    assert 'property="og:description"' in meta
    assert 'property="og:type"' in meta


def test_render_body_escapes_html():
    post = BlogPost(
        title="<script>alert(1)</script>",
        meta_description="",
        keywords=[],
        intro_paragraphs=["A & B < C"],
        sections=[],
        conclusion_paragraphs=[],
    )
    body = render_body(post)
    assert "<script>" not in body
    assert "&lt;script&gt;" in body
    assert "A &amp; B &lt; C" in body


def test_markdown_bold_renders_to_strong():
    post = BlogPost(
        title="제목",
        meta_description="",
        keywords=[],
        intro_paragraphs=["**핵심**은 검사 단계입니다."],
        sections=[BlogSection(heading="섹션", paragraphs=["**또 하나**의 포인트"], sub_sections=[])],
        conclusion_paragraphs=[],
    )
    body = render_body(post)
    assert "<strong>핵심</strong>" in body
    assert "<strong>또 하나</strong>" in body
    assert "**" not in body  # 마크다운 마커는 모두 변환됨


def test_emoji_passes_through():
    post = BlogPost(
        title="제목",
        meta_description="",
        keywords=[],
        intro_paragraphs=["✅ 체크 포인트 🩺 의료"],
        sections=[],
        conclusion_paragraphs=[],
    )
    body = render_body(post)
    assert "✅" in body and "🩺" in body


def test_location_block_rendered_when_tenant_address_present():
    post = BlogPost(
        title="제목",
        meta_description="",
        keywords=[],
        intro_paragraphs=[],
        sections=[],
        conclusion_paragraphs=[],
        tenant_name="BGN 밝은눈안과",
        tenant_address="서울 강남구 강남대로 462",
        tenant_naver_place_url="https://map.naver.com/p/entry/place/1109883085",
        tenant_phone="1588-3989",
    )
    body = render_body(post)
    assert "BGN 밝은눈안과" in body
    assert "강남대로 462" in body
    assert "https://map.naver.com/p/entry/place/1109883085" in body
    assert 'rel="noopener"' in body
    assert "1588-3989" in body


def test_naver_plain_strips_markdown_keeps_emoji():
    post = BlogPost(
        title="**제목** 입니다",
        meta_description="",
        keywords=["라식"],
        intro_paragraphs=["✅ **핵심** 내용"],
        sections=[BlogSection(heading="🩺 검사", paragraphs=["**중요**합니다"], sub_sections=[])],
        conclusion_paragraphs=[],
    )
    out = render_naver_blog_plain(post)
    assert "**" not in out  # 마크다운 ** 제거
    assert "✅" in out and "🩺" in out
    assert "핵심" in out
    assert "#라식" in out
