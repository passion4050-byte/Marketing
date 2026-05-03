"""Reference URL fetcher — Phase 1.5 간이 RAG.

URL → HTML 가져오기 → trafilatura로 본문 추출 → 제목/요약/본문 dict.
Phase 3에서 chunker + Chroma 인덱싱 정식 추가 예정. 지금은 LLM에 직접 컨텍스트 주입.

usage:
    from src.reference.fetcher import fetch_reference, fetch_many

    ref = fetch_reference("https://example.com/article")
    # ref.title, ref.body, ref.url, ref.summary
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import httpx
import structlog
import trafilatura
from bs4 import BeautifulSoup

logger = structlog.get_logger(__name__)


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


def fetch_reference(url: str, timeout: float = 15.0) -> Reference:
    """단일 URL fetch + 본문 추출."""
    try:
        with httpx.Client(
            timeout=timeout, headers=_DEFAULT_HEADERS, follow_redirects=True
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()
            html = resp.text
    except httpx.HTTPError as e:
        raise FetchError(f"URL 가져오기 실패: {url} ({e})") from e

    body = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        favor_recall=True,
        deduplicate=True,
    )
    if not body:
        # trafilatura가 빈 문자열을 주면 BeautifulSoup으로 fallback
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception:
            soup = BeautifulSoup(html, "html.parser")
        for s in soup(["script", "style", "nav", "header", "footer", "aside"]):
            s.decompose()
        body = (soup.get_text(separator="\n", strip=True) or "")[:8000]

    title = _extract_title(html, fallback=url)
    description = _extract_meta_description(html)

    ref = Reference(
        url=url,
        title=title,
        body=body or "",
        description=description,
        char_count=len(body or ""),
    )
    logger.info("reference.fetched", url=url, chars=ref.char_count, title=title[:80])
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
