"""src.marketing.cta_templates 단위 테스트."""

from __future__ import annotations

from src.marketing.cta_templates import (
    CtaConfig,
    append_cta_to_content,
    cta_block_for_channel,
)


def test_html_cta_for_blog() -> None:
    out = cta_block_for_channel("blog_html")
    assert 'data-cta-block="standard"' in out
    assert "카카오톡 상담" in out
    assert "네이버 플레이스" in out


def test_naver_cta_is_plaintext() -> None:
    out = cta_block_for_channel("naver_blog")
    assert "📍" in out
    assert "<aside" not in out
    assert "data-cta-block" not in out


def test_instagram_cta_short() -> None:
    out = cta_block_for_channel("instagram")
    assert "프로필 링크" in out
    assert "<" not in out  # no HTML


def test_append_cta_idempotent() -> None:
    base = "<p>본문 내용</p>"
    once = append_cta_to_content(base, "blog_html")
    twice = append_cta_to_content(once, "blog_html")
    assert once == twice  # 두 번 부착되지 않음


def test_append_cta_adds_marker() -> None:
    out = append_cta_to_content("body", "blog_html")
    assert "[CTA-BLOCK]" in out


def test_append_cta_carries_utm() -> None:
    out = append_cta_to_content(
        "body", "blog_html",
        cfg=CtaConfig(kakao_channel_url="https://pf.kakao.com/_xx"),
        utm_source="own_blog", utm_campaign="lasik_guide",
    )
    assert "utm_source=own_blog" in out
    assert "utm_campaign=lasik_guide" in out
