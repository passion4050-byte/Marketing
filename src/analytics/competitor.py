"""Competitor Discovery — Phase 6-T2.3.

AI 응답들의 NER 결과에서 빈도 + 응답 다양성 임계 이상인 clinic entity 를 후보로 제시한다.
사용자 검수가 끝나야 ``Competitor.confirmed=True`` — 자동 승인 X.

알고리즘:
1. tenant 의 모든 Response 를 시간 범위로 조회
2. 각 response.raw_text 에 NER → kind="clinic" entity 만 카운트
3. tenant 자기 이름 / 이미 등록된 (confirmed=True OR False) Competitor 는 제외
4. 응답 ≥ ``min_responses`` AND 키워드 ≥ ``min_keywords`` → 후보
5. mention_count desc 정렬 + sample_snippets 동봉
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.parser.ner import extract_entities
from src.storage.models import Competitor, Query, Response, Tenant


@dataclass
class CompetitorCandidate:
    """검수 대상 경쟁사 후보."""

    name: str
    mention_count: int          # 전체 응답에서 등장한 총 횟수 (response × 매칭)
    response_count: int         # 등장한 서로 다른 응답 수
    keyword_count: int          # 등장한 서로 다른 키워드 수
    first_seen: datetime
    sample_snippets: list[str] = field(default_factory=list)


def _normalize_name(name: str) -> str:
    """공백 정리 + 같은 병원명을 같은 키로 — '메디맵 안과' / '메디맵안과' 통합."""
    return " ".join(name.split())


def discover_competitors(
    session: Session,
    tenant_id: int,
    *,
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
    min_responses: int = 3,
    min_keywords: int = 2,
    snippet_window: int = 60,
    max_snippets: int = 3,
) -> list[CompetitorCandidate]:
    """tenant 의 응답에서 NER → 임계 통과한 clinic 후보 목록.

    이미 ``competitors`` 테이블에 등록된 이름은 제외 (confirmed/거절 관계없이).
    Tenant.name 도 제외.
    """
    # 1) tenant 자신 + 이미 등록된 후보 이름 set
    # tenant brand 는 substring 으로도 차단 — '메디맵' / '메디맵 안과' 둘 다 자기 브랜드.
    excluded_exact: set[str] = set()
    excluded_substrings: set[str] = set()
    tenant = session.get(Tenant, tenant_id)
    if tenant and tenant.name:
        tn = _normalize_name(tenant.name)
        excluded_exact.add(tn)
        excluded_substrings.add(tn)
    existing_names = (
        session.execute(
            select(Competitor.name).where(Competitor.tenant_id == tenant_id)
        )
        .scalars()
        .all()
    )
    for n in existing_names:
        excluded_exact.add(_normalize_name(n))

    def _is_excluded(name: str) -> bool:
        if name in excluded_exact:
            return True
        for sub in excluded_substrings:
            if sub and sub in name:
                return True
        return False

    # 2) 응답 + keyword_id + requested_at 조회
    q = (
        select(
            Response.id,
            Response.raw_text,
            Query.keyword_id,
            Query.requested_at,
        )
        .join(Query, Response.query_id == Query.id)
        .where(Query.tenant_id == tenant_id)
    )
    if since is not None:
        q = q.where(Query.requested_at >= since)
    if until is not None:
        q = q.where(Query.requested_at <= until)
    rows = session.execute(q).all()
    if not rows:
        return []

    # 3) NER → clinic 집계
    agg: dict[str, dict] = {}
    for resp_id, raw_text, keyword_id, requested_at in rows:
        if not raw_text:
            continue
        entities = extract_entities(raw_text)
        seen_in_response: set[str] = set()
        for ent in entities:
            if ent.kind != "clinic":
                continue
            name = _normalize_name(ent.text)
            if not name or _is_excluded(name):
                continue
            seen_in_response.add(name)
            slot = agg.setdefault(
                name,
                {
                    "mention_count": 0,
                    "response_ids": set(),
                    "keyword_ids": set(),
                    "first_seen": requested_at,
                    "snippets": [],
                },
            )
            slot["mention_count"] += 1
            slot["response_ids"].add(resp_id)
            slot["keyword_ids"].add(keyword_id)
            if requested_at and requested_at < slot["first_seen"]:
                slot["first_seen"] = requested_at
            # snippet 수집
            if len(slot["snippets"]) < max_snippets:
                start = max(0, ent.position - snippet_window // 2)
                end = min(len(raw_text), ent.position + len(name) + snippet_window // 2)
                snippet = raw_text[start:end].strip()
                if snippet and snippet not in slot["snippets"]:
                    slot["snippets"].append(snippet)

    # 4) 임계 통과 + 정렬
    candidates: list[CompetitorCandidate] = []
    for name, slot in agg.items():
        if len(slot["response_ids"]) < min_responses:
            continue
        if len(slot["keyword_ids"]) < min_keywords:
            continue
        candidates.append(
            CompetitorCandidate(
                name=name,
                mention_count=slot["mention_count"],
                response_count=len(slot["response_ids"]),
                keyword_count=len(slot["keyword_ids"]),
                first_seen=slot["first_seen"],
                sample_snippets=list(slot["snippets"]),
            )
        )
    candidates.sort(key=lambda c: (-c.mention_count, -c.response_count, c.name))
    return candidates
