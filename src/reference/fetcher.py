"""Reference URL fetcher — Phase 1.5 간이 RAG.

URL → HTML 가져오기 → trafilatura로 본문 추출 → 제목/요약/본문 dict.
Phase 3에서 chunker + Chroma 인덱싱 정식 추가 예정. 지금은 LLM에 직접 컨텍스트 주입.

usage:
    from src.reference.fetcher import fetch_reference, fetch_many

    ref = fetch_reference("https://example.com/article")
    # ref.title, ref.body, ref.url, ref.summary
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

import httpx
import structlog
import trafilatura
from bs4 import BeautifulSoup

logger = structlog.get_logger(__name__)


# ─── URL 정규화 — 사이트별 iframe/wrapper 회피 ─────────────────

# blog.naver.com/{user}/{logNo} 또는 m.blog.naver.com/{user}/{logNo}
# → PostView.naver?blogId=&logNo=  (iframe 내부 페이지) 로 재작성.
_NAVER_BLOG_PATH_RE = re.compile(
    r"^https?://(?:m\.)?blog\.naver\.com/([A-Za-z0-9_-]+)/(\d+)/?(?:\?.*)?$"
)
# m.blog.naver.com/PostView.naver?blogId=&logNo=  → 데스크탑 PostView 로 통일
_NAVER_MOBILE_POSTVIEW_RE = re.compile(
    r"^https?://m\.blog\.naver\.com/PostView\.naver\?(.+)$"
)


def normalize_url(url: str) -> str:
    """사이트별 wrapper/iframe URL 을 실제 본문이 들어있는 URL 로 변환.

    네이버 블로그: 메인 URL 은 iframe wrapper(본문 없음) → PostView.naver 로 재작성.
    그 외 URL 은 원본 그대로 반환.
    """
    url = (url or "").strip()
    if not url:
        return url

    m = _NAVER_BLOG_PATH_RE.match(url)
    if m:
        blog_id, log_no = m.group(1), m.group(2)
        return (
            "https://blog.naver.com/PostView.naver"
            f"?blogId={blog_id}&logNo={log_no}"
            "&redirect=Dlog&widgetTypeCall=true&directAccess=false"
        )

    m = _NAVER_MOBILE_POSTVIEW_RE.match(url)
    if m:
        return f"https://blog.naver.com/PostView.naver?{m.group(1)}"

    return url


@dataclass
class Reference:
    url: str
    title: str
    body: str  # trafilatura 추출 본문 (순수 텍스트)
    description: str  # <meta description>
    char_count: int

    def truncated(self, limit: int = 4000) -> str:
        """LLM 컨텍스트로 주입할 본문 — 길면 자름."""
        if len(self.body) <= limit:
            return self.body
        return self.body[:limit] + "\n\n[...이하 생략. 전체 길이: %d자]" % len(self.body)

    def to_prompt_block(self, idx: int, body_limit: int = 3000) -> str:
        """LLM system/user 메시지에 끼워 넣기 좋은 블록."""
        return (
            f"### Reference [{idx}]: {self.title}\n"
            f"URL: {self.url}\n"
            f"{self.description}\n\n"
            f"{self.truncated(body_limit)}"
        )


_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://search.naver.com/",
}

_MOBILE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Linux; Android 10; SM-G973N) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://m.search.naver.com/",
}


def _naver_fetch_candidates(url: str) -> list[tuple[str, dict]]:
    """네이버 블로그 URL 의 fetch 후보 (URL, headers) 우선순위 리스트.

    1순위: 모바일 페이지 — 단순 HTML + 외부 IP 차단 덜함 (Streamlit Cloud GCP 환경)
    2순위: 데스크탑 PostView.naver 쿼리 (iframe 내부)
    매치 안 되면 빈 리스트 (호출자가 일반 fetch 사용).
    """
    m = _NAVER_BLOG_PATH_RE.match(url.strip())
    if m:
        blog_id, log_no = m.group(1), m.group(2)
    else:
        m2 = _NAVER_MOBILE_POSTVIEW_RE.match(url.strip())
        if not m2:
            return []
        # PostView 형태에서 blogId/logNo 추출
        from urllib.parse import parse_qs
        params = parse_qs(m2.group(1))
        blog_id = (params.get("blogId") or [""])[0]
        log_no = (params.get("logNo") or [""])[0]
        if not (blog_id and log_no):
            return []

    return [
        (
            f"https://m.blog.naver.com/{blog_id}/{log_no}",
            _MOBILE_HEADERS,
        ),
        (
            "https://blog.naver.com/PostView.naver"
            f"?blogId={blog_id}&logNo={log_no}"
            "&redirect=Dlog&widgetTypeCall=true&directAccess=false",
            _DEFAULT_HEADERS,
        ),
    ]


class FetchError(RuntimeError):
    pass


def _extract_meta_description(html: str) -> str:
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    candidates = [
        ("meta", {"name": "description"}),
        ("meta", {"property": "og:description"}),
        ("meta", {"name": "og:description"}),
    ]
    for tag, attrs in candidates:
        m = soup.find(tag, attrs=attrs)
        if m and m.get("content"):
            return m["content"].strip()
    return ""


def _extract_title(html: str, fallback: str) -> str:
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    og = soup.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        return og["content"].strip()
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    return fallback


_NAVER_BODY_SELECTORS = (
    "div.se-main-container",   # 신규 SmartEditor (PC + mobile)
    "div#viewTypeSelector",    # mobile 컨테이너
    "div.post_ct",             # 모바일 본문 wrapper
    "div#postViewArea",        # 구버전 PC
    "div.post-view",           # 구버전 mobile
)


def _extract_naver_smarteditor_body(html: str) -> str:
    """네이버 블로그 본문 컨테이너 추출 (trafilatura fallback).

    PC SmartEditor + 모바일 컨테이너 + 구버전 모두 cover.
    여러 셀렉터 중 가장 길게 나오는 본문을 채택.
    """
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    best = ""
    for sel in _NAVER_BODY_SELECTORS:
        node = soup.select_one(sel)
        if node is None:
            continue
        for s in node(["script", "style"]):
            s.decompose()
        text = node.get_text(separator="\n", strip=True)
        lines = [ln for ln in (line.strip() for line in text.splitlines()) if ln]
        cleaned = "\n".join(lines)
        if len(cleaned) > len(best):
            best = cleaned
    return best


def _try_fetch(client: httpx.Client, url: str, headers: dict) -> str:
    """단일 URL GET → text. 4xx/5xx 는 빈 문자열, 다른 오류는 raise."""
    try:
        resp = client.get(url, headers=headers)
    except httpx.HTTPError as e:
        logger.warning("reference.candidate_http_error", url=url, error=str(e))
        return ""
    if resp.status_code >= 400:
        logger.warning("reference.candidate_status", url=url, status=resp.status_code)
        return ""
    return resp.text


def _extract_body_from_html(html: str, *, is_naver: bool) -> str:
    """trafilatura → SmartEditor → soup 전체 텍스트 순으로 본문 추출."""
    if not html:
        return ""
    body = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        favor_recall=True,
        deduplicate=True,
    ) or ""
    if is_naver and len(body) < 200:
        ne = _extract_naver_smarteditor_body(html)
        if len(ne) > len(body):
            body = ne
    if not body:
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")
        for s in soup(["script", "style", "nav", "header", "footer", "aside"]):
            s.decompose()
        body = (soup.get_text(separator="\n", strip=True) or "")[:8000]
    return body


def fetch_reference(url: str, timeout: float = 15.0) -> Reference:
    """단일 URL fetch + 본문 추출.

    네이버 블로그는 (모바일 → 데스크탑 PostView.naver) 순으로 시도해 가장 긴 본문 채택.
    그 외 URL 은 입력 그대로 한 번만 fetch.
    원본 URL 은 ``Reference.url`` 에 보존 (citation 일관성).
    """
    original_url = (url or "").strip()
    if not original_url:
        raise FetchError("빈 URL")

    candidates = _naver_fetch_candidates(original_url)
    is_naver = bool(candidates) or "blog.naver.com" in original_url
    if not candidates:
        candidates = [(original_url, _DEFAULT_HEADERS)]
    else:
        logger.info(
            "reference.naver_candidates",
            original=original_url,
            count=len(candidates),
            urls=[c[0] for c in candidates],
        )

    best_body = ""
    best_html = ""
    best_url = candidates[0][0]
    last_error: Exception | None = None
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        for cand_url, cand_headers in candidates:
            try:
                html = _try_fetch(client, cand_url, cand_headers)
            except Exception as e:  # pragma: no cover
                last_error = e
                continue
            if not html:
                continue
            body = _extract_body_from_html(html, is_naver=is_naver)
            logger.info(
                "reference.candidate_fetched",
                url=cand_url,
                html_len=len(html),
                body_len=len(body),
            )
            if len(body) > len(best_body):
                best_body = body
                best_html = html
                best_url = cand_url
            # 충분히 길면 더 시도하지 않음
            if len(body) >= 500:
                break

    if not best_html and last_error is not None:
        raise FetchError(f"URL 가져오기 실패: {original_url} ({last_error})") from last_error

    title = _extract_title(best_html, fallback=original_url) if best_html else original_url
    description = _extract_meta_description(best_html) if best_html else ""

    ref = Reference(
        url=original_url,  # 원본 URL 보존 (citation 용)
        title=title,
        body=best_body,
        description=description,
        char_count=len(best_body),
    )
    logger.info(
        "reference.fetched",
        url=original_url,
        fetch_url=best_url,
        chars=ref.char_count,
        title=title[:80],
    )
    return ref


def fetch_many(urls: Iterable[str], timeout: float = 15.0) -> list[Reference]:
    """여러 URL 병렬 fetch (간단히 sequential — Phase 3에서 async)."""
    refs: list[Reference] = []
    for url in urls:
        url = url.strip()
        if not url:
            continue
        try:
            refs.append(fetch_reference(url, timeout=timeout))
        except FetchError as e:
            logger.warning("reference.fetch_failed", url=url, error=str(e))
    return refs


def references_to_context_block(refs: list[Reference], body_limit: int = 3000) -> str:
    """LLM 프롬프트에 주입할 reference 통합 블록."""
    if not refs:
        return ""
    chunks = ["## 참고 자료 (사실 기반 작성에 활용)\n"]
    for i, r in enumerate(refs, 1):
        chunks.append(r.to_prompt_block(i, body_limit=body_limit))
        chunks.append("")
    return "\n".join(chunks)
