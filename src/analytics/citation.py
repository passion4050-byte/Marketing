"""Citation matching — Phase 6.6.

tenant 가 발행한 ``Publication.url`` 이 AI 엔진의 ``Response.cited_urls`` 에 등장했는지
대조해 ``Publication.cited_by_engines`` 를 갱신한다. 이게 AEO/GEO 의 진짜 KPI.

매칭은 URL 정규화 후 exact 비교 (다른 도메인의 같은 글이 자주 등장 — 예: m.blog vs blog).

API:
- ``normalize_url(url) -> str``
- ``match_publications_to_responses(session, tenant_id) -> dict``
"""

from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import structlog

logger = structlog.get_logger(__name__)


_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "yclid", "trk",
    "from", "src",  # 네이버/카카오 자체 트래킹
}


def normalize_url(url: str) -> str:
    """URL 을 매칭용 canonical form 으로 정규화.

    - 대소문자: scheme/host 만 lower (path/query 는 보존)
    - http ↔ https 동일시 (https 로 통일)
    - 모바일 host 정규화 (m.blog.naver.com → blog.naver.com 등)
    - trailing slash 제거
    - tracking query string 제거 (utm_*, fbclid, gclid, ...)
    - fragment 제거
    """
    if not url:
        return ""
    raw = url.strip()
    if "://" not in raw:
        raw = "https://" + raw

    try:
        parts = urlsplit(raw)
    except Exception:
        return raw.lower()

    scheme = "https"  # http/https 동일시
    netloc = parts.netloc.lower()
    # 모바일 호스트 정규화 (의료/안과 도메인에서 흔함)
    _mobile_map = {
        "m.blog.naver.com": "blog.naver.com",
        "m.tistory.com": "tistory.com",
        "m.cafe.naver.com": "cafe.naver.com",
        "m.youtube.com": "youtube.com",
    }
    if netloc in _mobile_map:
        netloc = _mobile_map[netloc]
    # m.{domain} 일반화
    if netloc.startswith("m.") and len(netloc) > 2:
        candidate = netloc[2:]
        if candidate.count(".") >= 1:
            netloc = candidate

    path = parts.path or "/"
    if path != "/" and path.endswith("/"):
        path = path[:-1]

    # query 정리
    qs = parse_qsl(parts.query, keep_blank_values=False)
    qs_clean = [(k, v) for k, v in qs if k.lower() not in _TRACKING_PARAMS]
    query = urlencode(qs_clean) if qs_clean else ""

    return urlunsplit((scheme, netloc, path, query, ""))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _engine_entry(entries: list[dict] | None, engine: str) -> tuple[list[dict], dict]:
    """``cited_by_engines`` 에서 engine 항목을 찾거나 생성. (entries, entry) 반환."""
    entries = list(entries or [])
    for e in entries:
        if e.get("engine") == engine:
            return entries, e
    new_entry = {
        "engine": engine,
        "first_seen": _now_iso(),
        "last_seen": _now_iso(),
        "query_count": 0,
    }
    entries.append(new_entry)
    return entries, new_entry


def match_publications_to_responses(session, tenant_id: int) -> dict:
    """tenant 의 모든 Publication 에 대해 cited_urls 매칭 실행.

    동작:
    1. tenant 의 Publication 모두 로드 → 정규화 URL 키
    2. tenant 의 Query+Response 모두 스캔 (engine 별)
    3. Response.cited_urls 의 각 URL 정규화 → 매칭되면 cited_by_engines 갱신

    멱등 — 같은 (engine, query_id) 짝을 두 번 카운트하지 않도록 entries 안에 query_id 집합을
    내부적으로 유지 (메모리상에서). 다음 호출 시엔 query_count 증가 없이 last_seen 만 갱신.

    Returns:
        {"publications": N, "matched_publications": N, "new_citations": N, "engines": {...}}
    """
    from src.storage.models import Publication, Query, Response

    pubs = (
        session.query(Publication)
        .filter(Publication.tenant_id == tenant_id)
        .all()
    )
    if not pubs:
        return {"publications": 0, "matched_publications": 0, "new_citations": 0, "engines": {}}

    norm_to_pubs: dict[str, list[Publication]] = {}
    for p in pubs:
        key = normalize_url(p.url)
        if not key:
            continue
        norm_to_pubs.setdefault(key, []).append(p)

    queries = (
        session.query(Query, Response)
        .join(Response, Response.query_id == Query.id)
        .filter(Query.tenant_id == tenant_id)
        .all()
    )

    matched_pubs: set[int] = set()
    new_citations = 0
    engine_counter: dict[str, int] = {}
    # 같은 (publication, engine, query) 조합은 한 번만 카운트
    seen_triples: set[tuple[int, str, int]] = set()

    for q, r in queries:
        cited = r.cited_urls or []
        if not isinstance(cited, list):
            continue
        engine = q.engine or "unknown"
        for raw_url in cited:
            if not isinstance(raw_url, str):
                continue
            key = normalize_url(raw_url)
            if not key or key not in norm_to_pubs:
                continue
            for pub in norm_to_pubs[key]:
                triple = (pub.id, engine, q.id)
                if triple in seen_triples:
                    continue
                seen_triples.add(triple)
                entries, entry = _engine_entry(pub.cited_by_engines, engine)
                entry["query_count"] = int(entry.get("query_count", 0)) + 1
                entry["last_seen"] = _now_iso()
                pub.cited_by_engines = entries
                pub.cite_count = (pub.cite_count or 0) + 1
                matched_pubs.add(pub.id)
                new_citations += 1
                engine_counter[engine] = engine_counter.get(engine, 0) + 1

    now = datetime.now(timezone.utc)
    for p in pubs:
        p.last_checked_at = now
    session.commit()

    summary = {
        "publications": len(pubs),
        "matched_publications": len(matched_pubs),
        "new_citations": new_citations,
        "engines": engine_counter,
    }
    logger.info("citation.match_complete", tenant_id=tenant_id, **summary)
    return summary
