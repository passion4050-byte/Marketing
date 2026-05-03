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
    "Accept-Language": "ko,en;q=0.8",
}


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


def _extract_naver_smarteditor_body(html: str) -> str:
    """네이버 블로그 SmartEditor 컨테이너에서 본문만 추출 (trafilatura fallback).

    네이버 블로그는 본문을 ``div.se-main-container`` 또는 구버전 ``div#postViewArea``
    안에 둔다. 둘 다 시도.
    """
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")

    container = (
        soup.select_one("div.se-main-container")
        or soup.select_one("div#postViewArea")
        or soup.select_one("div.post-view")
    )
    if container is None:
        return ""
    for s in container(["script", "style"]):
        s.decompose()
    text = container.get_text(separator="\n", strip=True)
    # 연속 공백/빈 줄 정리
    lines = [ln for ln in (line.strip() for line in text.splitlines()) if ln]
    return "\n".join(lines)


def fetch_reference(url: str, timeout: float = 15.0) -> Reference:
    """단일 URL fetch + 본문 추출.

    사이트별 wrapper(예: 네이버 블로그 iframe) 는 ``normalize_url`` 로 우회.
    원본 URL 은 citation 용으로 ``Reference.url`` 에 보존.
    """
    original_url = url
    fetch_url = normalize_url(url)
    if fetch_url != original_url:
        logger.info("reference.url_normalized", original=original_url, normalized=fetch_url)

    try:
        with httpx.Client(
            timeout=timeout, headers=_DEFAULT_HEADERS, follow_redirects=True
        ) as client:
            resp = client.get(fetch_url)
            resp.raise_for_status()
            html = resp.text
    except httpx.HTTPError as e:
        raise FetchError(f"URL 가져오기 실패: {original_url} ({e})") from e

    body = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        favor_recall=True,
        deduplicate=True,
    )

    # 네이버 블로그 또는 SmartEditor 페이지: trafilatura 추출이 짧으면 직접 컨테이너 파싱
    is_naver = "blog.naver.com" in fetch_url
    if (not body or len(body) < 100) and is_naver:
        ne_body = _extract_naver_smarteditor_body(html)
        if ne_body and len(ne_body) > len(body or ""):
            body = ne_body
            logger.info("reference.naver_smarteditor_used", chars=len(ne_body))

    if not body:
        # 일반 fallback: BeautifulSoup 전체 텍스트
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")
        for s in soup(["script", "style", "nav", "header", "footer", "aside"]):
            s.decompose()
        body = (soup.get_text(separator="\n", strip=True) or "")[:8000]

    title = _extract_title(html, fallback=original_url)
    description = _extract_meta_description(html)

    ref = Reference(
        url=original_url,  # 원본 URL 보존 (citation 용)
        title=title,
        body=body or "",
        description=description,
        char_count=len(body or ""),
    )
    logger.info(
        "reference.fetched",
        url=original_url,
        fetch_url=fetch_url,
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
