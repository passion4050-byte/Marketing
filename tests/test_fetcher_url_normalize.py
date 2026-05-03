"""Phase 3 fetcher URL 정규화 + SmartEditor 추출 테스트.

네이버 블로그 메인 URL 은 iframe wrapper 라 본문이 16자 가량밖에 없는 문제를
PostView.naver 쿼리로 재작성해 회피한다. 이 테스트는 네트워크 호출 없이
URL 정규화 로직과 SmartEditor 컨테이너 파싱만 검증.
"""

from __future__ import annotations

import pytest

from src.reference.fetcher import (
    _extract_naver_smarteditor_body,
    _naver_fetch_candidates,
    normalize_url,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        # 표준 PC 네이버 블로그
        (
            "https://blog.naver.com/lovely_eni/224270198928",
            "https://blog.naver.com/PostView.naver"
            "?blogId=lovely_eni&logNo=224270198928"
            "&redirect=Dlog&widgetTypeCall=true&directAccess=false",
        ),
        # trailing slash
        (
            "https://blog.naver.com/lovely_eni/224270198928/",
            "https://blog.naver.com/PostView.naver"
            "?blogId=lovely_eni&logNo=224270198928"
            "&redirect=Dlog&widgetTypeCall=true&directAccess=false",
        ),
        # 모바일 도메인
        (
            "https://m.blog.naver.com/lovely_eni/224270198928",
            "https://blog.naver.com/PostView.naver"
            "?blogId=lovely_eni&logNo=224270198928"
            "&redirect=Dlog&widgetTypeCall=true&directAccess=false",
        ),
    ],
)
def test_normalize_naver_blog_url_rewrites_to_postview(raw, expected):
    assert normalize_url(raw) == expected


def test_normalize_passes_through_non_naver_urls():
    samples = [
        "https://example.com/article",
        "https://www.koreatimes.co.kr/www/news/x.html",
        "https://medium.com/@user/post-123",
    ]
    for u in samples:
        assert normalize_url(u) == u


def test_normalize_already_postview_url_unchanged():
    url = (
        "https://blog.naver.com/PostView.naver"
        "?blogId=lovely_eni&logNo=224270198928"
    )
    assert normalize_url(url) == url


def test_normalize_mobile_postview_converted_to_desktop():
    raw = "https://m.blog.naver.com/PostView.naver?blogId=foo&logNo=12345"
    out = normalize_url(raw)
    assert out.startswith("https://blog.naver.com/PostView.naver?")
    assert "blogId=foo" in out
    assert "logNo=12345" in out


def test_normalize_handles_empty_and_whitespace():
    assert normalize_url("") == ""
    assert normalize_url("   ") == ""


def test_extract_naver_smarteditor_body_from_se_main_container():
    html = """
    <html><body>
      <header>네비게이션</header>
      <div class="se-main-container">
        <div class="se-component">백내장은 수정체가 혼탁해지는 안과 질환입니다.</div>
        <div class="se-component">강남 안과를 찾을 때는 의사 경험이 중요합니다.</div>
      </div>
      <footer>푸터</footer>
    </body></html>
    """
    body = _extract_naver_smarteditor_body(html)
    assert "백내장" in body
    assert "강남 안과" in body
    # 헤더/푸터는 컨테이너 밖이라 미포함
    assert "네비게이션" not in body
    assert "푸터" not in body


def test_extract_naver_smarteditor_body_returns_empty_when_no_container():
    html = "<html><body><p>그냥 일반 페이지</p></body></html>"
    assert _extract_naver_smarteditor_body(html) == ""


def test_naver_fetch_candidates_returns_mobile_first():
    """모바일 URL 이 첫 후보 (Streamlit Cloud GCP 환경에서 더 안정적)."""
    raw = "https://blog.naver.com/foobar/12345"
    cands = _naver_fetch_candidates(raw)
    assert len(cands) == 2
    first_url, first_headers = cands[0]
    assert first_url == "https://m.blog.naver.com/foobar/12345"
    # 모바일 헤더는 모바일 UA
    assert "Mobile" in first_headers["User-Agent"]
    # 두번째는 데스크탑 PostView
    second_url, second_headers = cands[1]
    assert "PostView.naver" in second_url
    assert "blogId=foobar" in second_url
    assert "logNo=12345" in second_url


def test_naver_fetch_candidates_handles_postview_input():
    """PostView.naver?blogId=&logNo= 입력에서도 candidate 추출 가능."""
    raw = "https://m.blog.naver.com/PostView.naver?blogId=foo&logNo=999"
    cands = _naver_fetch_candidates(raw)
    assert len(cands) == 2
    assert cands[0][0] == "https://m.blog.naver.com/foo/999"


def test_naver_fetch_candidates_returns_empty_for_non_naver():
    assert _naver_fetch_candidates("https://example.com/article") == []
    assert _naver_fetch_candidates("") == []


def test_extract_naver_smarteditor_body_picks_longest_container():
    """여러 셀렉터 중 가장 긴 본문이 채택됨."""
    html = """
    <html><body>
      <div class="se-main-container">아주 짧은 글</div>
      <div class="post_ct">이 컨테이너는 훨씬 더 긴 본문을 가지고 있어 우선 채택되어야 하는 모바일 wrapper 입니다.</div>
    </body></html>
    """
    body = _extract_naver_smarteditor_body(html)
    assert "훨씬 더 긴" in body
    assert "아주 짧은 글" not in body  # 더 긴 게 채택되어야


def test_extract_naver_smarteditor_body_supports_legacy_postViewArea():
    html = """
    <html><body>
      <div id="postViewArea">
        <p>구버전 네이버 블로그 본문 — 라식 후기.</p>
      </div>
    </body></html>
    """
    body = _extract_naver_smarteditor_body(html)
    assert "라식 후기" in body
