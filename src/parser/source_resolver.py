"""Round 32 (2026-05-30) — Gemini citation source URL 추적.

Gemini API 의 cited_urls 는 vertexaisearch.cloud.google.com/grounding-api-redirect/
형태의 redirect URL 만 반환. 실제 source 도메인을 알려면 HTTP HEAD 로
redirect chain 을 따라가야 함.

자사 도메인 매칭 — 메디맵 본 사이트 + 자사 블로그.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Iterable
from urllib.parse import urlparse

import httpx

logger = logging.getLogger("source-resolver")

# 자사 도메인 — 매월 영업 보고서의 "자사 source share %" 핵심
SELF_DOMAINS: set[str] = {
    "medi-map.co.kr",
    "www.medi-map.co.kr",
    "medimap-blog-phi.vercel.app",
    "geo-v2-beta.vercel.app",
    "geo-v2-git-main-medimaps-projects.vercel.app",
    # 다른 메디맵 도메인 추가될 때 여기에 등록
}


def extract_domain(url: str) -> str | None:
    """URL 에서 도메인만 추출."""
    try:
        parsed = urlparse(url)
        host = (parsed.netloc or "").lower().strip()
        return host or None
    except Exception:  # noqa: BLE001
        return None


def is_self_domain(domain: str | None) -> bool:
    """domain 이 자사 (메디맵) 인지 판정."""
    if not domain:
        return False
    return domain.lower().strip() in SELF_DOMAINS


async def resolve_one(client: httpx.AsyncClient, redirect_url: str, *, timeout: float = 5.0) -> dict:
    """단일 redirect URL → 최종 destination 추적.

    Returns:
        {redirect, final_url, domain, is_self} dict
    """
    result = {
        "redirect": redirect_url,
        "final_url": None,
        "domain": None,
        "is_self": False,
    }
    try:
        # follow_redirects=True 로 chain 전체 추적
        r = await client.get(
            redirect_url,
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "MedimapGEO-SourceTracker/1.0"},
        )
        # 최종 URL = r.url (redirect 체인 후)
        final_url = str(r.url)
        result["final_url"] = final_url
        result["domain"] = extract_domain(final_url)
        result["is_self"] = is_self_domain(result["domain"])
    except httpx.TimeoutException:
        logger.debug("Redirect timeout: %s", redirect_url[:80])
    except Exception as e:  # noqa: BLE001
        logger.debug("Redirect resolve 실패 %s: %s", redirect_url[:80], e)
    return result


async def resolve_urls(urls: Iterable[str], *, concurrency: int = 10, timeout: float = 5.0) -> list[dict]:
    """다수 cited URL 의 redirect 동시 추적.

    Args:
        urls: cited_urls 리스트 (Gemini 응답의 grounding redirect URLs)
        concurrency: 동시 호출 수 (Gemini API 의 호출당 평균 10개라 충분)
        timeout: 각 호출 timeout (초)

    Returns:
        [{redirect, final_url, domain, is_self}, ...] dict 배열
    """
    urls_list = [u for u in urls if u and u.startswith("http")]
    if not urls_list:
        return []
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(http2=False) as client:
        async def _bounded(u: str) -> dict:
            async with sem:
                return await resolve_one(client, u, timeout=timeout)
        results = await asyncio.gather(*[_bounded(u) for u in urls_list])
    return results


def summarize(source_domains: list[dict]) -> dict:
    """source_domains 리스트에서 KPI 요약 계산.

    Returns:
        {total, self_count, self_share, top_domains: [(domain, count), ...]}
    """
    if not source_domains:
        return {"total": 0, "self_count": 0, "self_share": 0.0, "top_domains": []}
    total = len(source_domains)
    self_count = sum(1 for s in source_domains if s.get("is_self"))
    self_share = round(self_count / total, 3) if total > 0 else 0.0
    # domain 빈도
    from collections import Counter
    domains = [s.get("domain") for s in source_domains if s.get("domain")]
    top = Counter(domains).most_common(5)
    return {
        "total": total,
        "self_count": self_count,
        "self_share": self_share,
        "top_domains": top,
    }
