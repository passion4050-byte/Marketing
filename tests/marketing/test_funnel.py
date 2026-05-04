"""src.marketing.funnel 단위 테스트."""

from __future__ import annotations

import pytest

from src.marketing.funnel import (
    UtmParams,
    apply_publication_funnel,
    inject_utm,
    shortlink_for,
)


def test_inject_utm_basic() -> None:
    out = inject_utm(
        "https://medimap.kr/blog/lasik-guide",
        UtmParams(source="own_blog", medium="ai_cite", campaign="lasik"),
    )
    assert "utm_source=own_blog" in out
    assert "utm_medium=ai_cite" in out
    assert "utm_campaign=lasik" in out


def test_inject_utm_preserves_existing_query() -> None:
    out = inject_utm(
        "https://medimap.kr/blog/lasik-guide?ref=newsletter",
        UtmParams(source="naver_blog", campaign="x"),
    )
    assert "ref=newsletter" in out
    assert "utm_source=naver_blog" in out


def test_inject_utm_does_not_overwrite_existing_utm() -> None:
    """사용자가 이미 utm_source 를 손으로 넣은 경우 존중."""
    out = inject_utm(
        "https://medimap.kr/blog/x?utm_source=manual",
        UtmParams(source="own_blog", campaign="x"),
    )
    assert "utm_source=manual" in out
    assert "utm_source=own_blog" not in out


def test_inject_utm_invalid_url_returns_unchanged() -> None:
    assert inject_utm("not a url", UtmParams(source="x")) == "not a url"
    assert inject_utm("", UtmParams(source="x")) == ""


def test_inject_utm_requires_source_medium() -> None:
    with pytest.raises(ValueError):
        inject_utm("https://x.com", UtmParams(source="", medium="ai_cite"))


def test_apply_publication_funnel_auto_campaign_from_slug() -> None:
    out = apply_publication_funnel(
        "https://medimap.kr/blog/lasik-guide", channel="own_blog",
    )
    assert "utm_source=own_blog" in out
    assert "utm_campaign=lasik_guide" in out


def test_apply_publication_funnel_explicit_campaign() -> None:
    out = apply_publication_funnel(
        "https://medimap.kr/blog/", channel="own_blog", campaign="hero_test",
    )
    assert "utm_campaign=hero_test" in out


def test_shortlink_for() -> None:
    out = shortlink_for("Lasik Guide!!", base="https://m.medimap.kr/r")
    assert out == "https://m.medimap.kr/r/lasik_guide"


def test_shortlink_default_base(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SHORTLINK_BASE_URL", raising=False)
    out = shortlink_for("hero")
    assert out == "https://m.medimap.kr/r/hero"
