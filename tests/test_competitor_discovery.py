"""Phase 6-T2.6 — Competitor discovery 테스트.

검증:
- 임계 (응답 ≥ 3 AND 키워드 ≥ 2) 통과한 clinic 만 후보
- tenant 자기 이름 / 이미 등록된 Competitor 는 제외
- 승인된 Competitor.confirmed=True → 다음 collect 시 Mention.is_competitor=True
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.analytics.competitor import discover_competitors
from src.collector import collect_for_keyword
from src.engines.base import BaseEngine, EngineResponse
from src.storage.models import (
    Base,
    Competitor,
    Keyword,
    Mention,
    Query,
    Response,
    Tenant,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add_all([
            Keyword(id=1, tenant_id=1, text="강남 라식", target_brand="메디맵", is_active=True),
            Keyword(id=2, tenant_id=1, text="시력교정", target_brand="메디맵", is_active=True),
            Keyword(id=3, tenant_id=1, text="라섹 추천", target_brand="메디맵", is_active=True),
        ])
        s.commit()
    return SessionLocal


def _seed_response(s, *, query_id: int, raw_text: str) -> int:
    r = Response(query_id=query_id, raw_text=raw_text, cited_urls=[], latency_ms=10)
    s.add(r)
    s.flush()
    return r.id


def _seed_query(s, *, keyword_id: int, sample_index: int) -> int:
    q = Query(
        tenant_id=1, keyword_id=keyword_id, engine="stub",
        prompt=f"키워드 {keyword_id}", sample_index=sample_index, cost_usd=0.0,
    )
    s.add(q)
    s.flush()
    return q.id


def test_discover_threshold_pass(db):
    """BGN 안과 가 응답 4개 + 키워드 3개 → 후보 통과."""
    SessionLocal = db
    with SessionLocal() as s:
        # 키워드 1: 응답 2개에 BGN
        for i in range(2):
            qid = _seed_query(s, keyword_id=1, sample_index=i)
            _seed_response(s, query_id=qid, raw_text=f"BGN 안과는 강남에서 유명합니다 #{i}")
        # 키워드 2: 응답 1개에 BGN
        qid = _seed_query(s, keyword_id=2, sample_index=0)
        _seed_response(s, query_id=qid, raw_text="시력교정은 BGN 안과가 추천")
        # 키워드 3: 응답 1개에 BGN
        qid = _seed_query(s, keyword_id=3, sample_index=0)
        _seed_response(s, query_id=qid, raw_text="라섹은 BGN 안과")
        s.commit()

    with SessionLocal() as s:
        cands = discover_competitors(s, 1, min_responses=3, min_keywords=2)

    names = [c.name for c in cands]
    assert any("BGN" in n for n in names), f"BGN 미검출: {names}"
    bgn = next(c for c in cands if "BGN" in c.name)
    assert bgn.response_count >= 3
    assert bgn.keyword_count >= 2


def test_discover_excludes_tenant_self(db):
    """tenant.name = '메디맵' 은 후보에서 제외."""
    SessionLocal = db
    with SessionLocal() as s:
        for i, kid in enumerate([1, 2, 3]):
            qid = _seed_query(s, keyword_id=kid, sample_index=0)
            _seed_response(s, query_id=qid, raw_text=f"메디맵 안과 추천 #{i}")
        s.commit()

    with SessionLocal() as s:
        cands = discover_competitors(s, 1, min_responses=2, min_keywords=2)
    assert all("메디맵" not in c.name for c in cands), \
        f"tenant 자신이 후보에 포함됨: {[c.name for c in cands]}"


def test_discover_excludes_already_registered(db):
    """이미 Competitor 테이블에 있는 이름은 제외."""
    SessionLocal = db
    with SessionLocal() as s:
        # 등록된 competitor (rejected 도 포함)
        s.add(Competitor(
            tenant_id=1, name="이미 등록된 안과",
            discovery_source="ai_response", confirmed=False,
        ))
        s.commit()
        # 응답 시드
        for i, kid in enumerate([1, 2, 3]):
            qid = _seed_query(s, keyword_id=kid, sample_index=0)
            _seed_response(s, query_id=qid, raw_text=f"이미 등록된 안과는 좋습니다 #{i}")
        s.commit()

    with SessionLocal() as s:
        cands = discover_competitors(s, 1, min_responses=2, min_keywords=2)
    assert all("이미 등록된" not in c.name for c in cands)


def test_discover_threshold_fail(db):
    """응답 1개에만 등장하는 entity 는 후보 미달."""
    SessionLocal = db
    with SessionLocal() as s:
        qid = _seed_query(s, keyword_id=1, sample_index=0)
        _seed_response(s, query_id=qid, raw_text="누네 안과는 라식이 유명")
        s.commit()

    with SessionLocal() as s:
        cands = discover_competitors(s, 1, min_responses=3, min_keywords=2)
    assert not cands


# ─── confirmed competitor 가 collect 시 Mention 으로 인식 ────────


class _StubResponseEngine(BaseEngine):
    name = "stub"

    def __init__(self, text: str):
        self._text = text

    async def query(self, prompt: str) -> EngineResponse:
        return EngineResponse(text=self._text, cited_urls=[], latency_ms=5)


def test_confirmed_competitor_recognized_in_collect(db):
    """승인된 Competitor.name 이 Collector → extract_mentions 에 자동 주입돼
    is_competitor=True Mention 이 INSERT 되는지 검증."""
    SessionLocal = db
    with SessionLocal() as s:
        s.add(Competitor(
            tenant_id=1, name="누네",
            discovery_source="ai_response", confirmed=True,
            first_seen_at=datetime.now(timezone.utc),
        ))
        s.commit()
        kw = s.get(Keyword, 1)

    eng = _StubResponseEngine("강남 라식은 메디맵, BGN, 누네 안과가 유명합니다.")
    result = asyncio.run(collect_for_keyword(
        SessionLocal, 1, kw, eng, n_samples=2, concurrency=2,
    ))
    assert result.n_success == 2

    with SessionLocal() as s:
        mentions = s.query(Mention).all()
        comp_brands = {m.brand for m in mentions if m.is_competitor}
    assert any("누네" in b for b in comp_brands), \
        f"confirmed competitor 미인식: {comp_brands}"
