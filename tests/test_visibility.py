"""Phase 5-T2.6 — visibility.mention_share + Wilson CI pytest."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.analytics.visibility import mention_share, wilson_ci
from src.storage.models import (
    Base,
    Keyword,
    Mention,
    Query,
    Response,
    Tenant,
)


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.add(Tenant(id=2, name="다른클리닉", domain_category="치과", region="부산", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.commit()
    return SessionLocal


def _seed_responses(session, tenant_id, keyword_id, *, n_total: int, n_target: int,
                    target_weights: list[float] | None = None):
    """n_total 개 Response 생성 + 처음 n_target 개에 target Mention 추가."""
    target_weights = target_weights or [1.0] * n_target
    for i in range(n_total):
        q = Query(
            tenant_id=tenant_id, keyword_id=keyword_id,
            engine="stub", prompt=f"sample_{i}", sample_index=i,
        )
        session.add(q)
        session.flush()
        r = Response(query_id=q.id, raw_text=f"text {i}", cited_urls=[], latency_ms=100)
        session.add(r)
        session.flush()
        if i < n_target:
            session.add(Mention(
                response_id=r.id, tenant_id=tenant_id,
                brand="메디맵", is_target=True, is_competitor=False,
                position=0, weight=target_weights[i], context_snippet="...",
            ))
    session.commit()


def test_wilson_ci_basic_formula():
    """share=0.4, n=10 → 익히 알려진 Wilson CI ≈ (0.168, 0.687)."""
    lo, hi = wilson_ci(0.4, 10)
    assert 0.13 < lo < 0.20
    assert 0.65 < hi < 0.71
    assert 0.0 <= lo <= hi <= 1.0


def test_wilson_ci_zero_n_returns_zero_zero():
    assert wilson_ci(0.5, 0) == (0.0, 0.0)


def test_wilson_ci_clipped_to_unit_range():
    lo, hi = wilson_ci(0.0, 1)
    assert lo == 0.0
    lo2, hi2 = wilson_ci(1.0, 1)
    assert hi2 == 1.0


def test_mention_share_zero_when_no_responses(session_factory):
    with session_factory() as s:
        out = mention_share(s, tenant_id=1, keyword_id=1)
    assert out["n"] == 0
    assert out["share"] == 0.0
    assert out["ci_95"] == (0.0, 0.0)
    assert out["weighted_share"] == 0.0
    assert out["by_brand"] == {}


def test_mention_share_basic_counts(session_factory):
    """n=10, target_responses=4, weights=1.0 each → share=0.4, weighted=0.4."""
    with session_factory() as s:
        _seed_responses(s, 1, 1, n_total=10, n_target=4)
    with session_factory() as s:
        out = mention_share(s, 1, 1)
    assert out["n"] == 10
    assert out["target_count"] == 4
    assert out["share"] == 0.4
    assert out["weighted_share"] == 0.4
    lo, hi = out["ci_95"]
    assert 0.13 < lo < 0.20
    assert 0.65 < hi < 0.71


def test_mention_share_weighted_uses_max_weight_per_response(session_factory):
    """동일 응답에 multiple target Mention 이 있어도 최대 weight 만 카운트."""
    with session_factory() as s:
        _seed_responses(s, 1, 1, n_total=2, n_target=0)
        # 1번째 response 에 weight 0.5 / 1.0 두 멘션 추가
        r = s.query(Response).first()
        s.add(Mention(
            response_id=r.id, tenant_id=1, brand="메디맵",
            is_target=True, is_competitor=False, position=0, weight=0.5, context_snippet="x",
        ))
        s.add(Mention(
            response_id=r.id, tenant_id=1, brand="메디맵",
            is_target=True, is_competitor=False, position=20, weight=1.0, context_snippet="y",
        ))
        s.commit()
    with session_factory() as s:
        out = mention_share(s, 1, 1)
    # 응답 2개 중 1개에 target → share=0.5, weighted=1.0/2=0.5
    assert out["n"] == 2
    assert out["target_count"] == 1
    assert out["share"] == 0.5
    assert out["weighted_share"] == 0.5  # max weight (1.0) only


def test_mention_share_tenant_isolation(session_factory):
    """tenant_2 의 mention 이 tenant_1 결과에 절대 안 섞임."""
    with session_factory() as s:
        _seed_responses(s, 1, 1, n_total=5, n_target=3)
        # tenant_2 에 keyword + 멘션 추가
        s.add(Keyword(id=2, tenant_id=2, text="임플란트", target_brand="다른클리닉", is_active=True))
        s.commit()
        _seed_responses(s, 2, 2, n_total=10, n_target=10)
    with session_factory() as s:
        out = mention_share(s, 1, 1)
    assert out["n"] == 5
    assert out["target_count"] == 3
    assert out["share"] == 0.6


def test_mention_share_by_brand_includes_competitors(session_factory):
    """by_brand 카운트에 target/competitor 모두 포함."""
    with session_factory() as s:
        _seed_responses(s, 1, 1, n_total=3, n_target=0)
        responses = s.query(Response).all()
        s.add(Mention(
            response_id=responses[0].id, tenant_id=1, brand="메디맵",
            is_target=True, is_competitor=False, position=0, weight=1.0, context_snippet="",
        ))
        s.add(Mention(
            response_id=responses[1].id, tenant_id=1, brand="누네안과",
            is_target=False, is_competitor=True, position=0, weight=1.0, context_snippet="",
        ))
        s.add(Mention(
            response_id=responses[2].id, tenant_id=1, brand="누네안과",
            is_target=False, is_competitor=True, position=0, weight=1.0, context_snippet="",
        ))
        s.commit()
    with session_factory() as s:
        out = mention_share(s, 1, 1)
    assert out["by_brand"] == {"누네안과": 2, "메디맵": 1}
