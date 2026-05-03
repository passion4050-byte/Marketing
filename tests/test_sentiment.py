"""Phase 6-T3.5 — Sentiment 분류 + share-with-sentiment 테스트.

- classify_sentiment 의 4 케이스 (pos only / neg only / both / none)
- mention_share 의 positive/negative/neutral_share 합 = share (mutually exclusive)
- competitor_share 가 confirmed 경쟁사의 응답수 비율 정확히 반환
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.analytics.visibility import competitor_share, mention_share
from src.parser.mentions import extract_mentions
from src.parser.sentiment import classify_sentiment
from src.parser.signals import MentionSignals
from src.storage.models import Base, Keyword, Mention, Query, Response, Tenant


# ─── classify_sentiment 4 cases ─────────────────────────────────


_SIGNALS = MentionSignals(
    recommendation=frozenset({"추천", "유명", "잘하는"}),
    comparison=frozenset({"비교", "보다"}),
    negative=frozenset({"피하세요", "별로", "후회"}),
)


def test_sentiment_positive_only():
    text = "BGN 안과 추천드립니다. 강남에서 유명한 곳이에요."
    pos = text.find("BGN")
    assert classify_sentiment(text, pos, len("BGN"), _SIGNALS) == "positive"


def test_sentiment_negative_only():
    text = "BGN 안과는 별로예요. 후회했습니다."
    pos = text.find("BGN")
    assert classify_sentiment(text, pos, len("BGN"), _SIGNALS) == "negative"


def test_sentiment_both_returns_neutral():
    """충돌 시 보수적으로 neutral."""
    text = "BGN 안과는 추천이지만 별로라는 의견도 있습니다."
    pos = text.find("BGN")
    assert classify_sentiment(text, pos, len("BGN"), _SIGNALS) == "neutral"


def test_sentiment_none_returns_neutral():
    text = "BGN 안과는 강남에 있는 의료기관입니다."
    pos = text.find("BGN")
    assert classify_sentiment(text, pos, len("BGN"), _SIGNALS) == "neutral"


def test_extract_mentions_carries_sentiment():
    """extract_mentions v2 → ExtractedMention.sentiment 채워짐."""
    text = "메디맵 안과 추천드립니다. 정말 잘하는 곳이에요."
    ents = extract_mentions(text, "메디맵 안과", signals=_SIGNALS)
    assert ents
    assert ents[0].sentiment == "positive"


# ─── share with sentiment — mutually exclusive ─────────────────


@pytest.fixture
def db_with_mentions():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)

    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.commit()

        # 5 응답: 2 positive (target), 1 negative (target), 1 neutral (target), 1 무멘션
        for i, sent in enumerate(["positive", "positive", "negative", "neutral", None]):
            q = Query(tenant_id=1, keyword_id=1, engine="stub", prompt="p",
                      sample_index=i, cost_usd=0.0)
            s.add(q)
            s.flush()
            r = Response(query_id=q.id, raw_text="...", cited_urls=[], latency_ms=10)
            s.add(r)
            s.flush()
            if sent is not None:
                s.add(Mention(
                    response_id=r.id, tenant_id=1, brand="메디맵",
                    is_target=True, position=0, weight=1.0,
                    sentiment=sent, context_snippet="snippet",
                ))
        # 경쟁사 1개 (응답 0,1,2 에 등장)
        responses = s.query(Response).all()
        for r in responses[:3]:
            s.add(Mention(
                response_id=r.id, tenant_id=1, brand="BGN 안과",
                is_competitor=True, position=20, weight=0.8,
                sentiment="neutral", context_snippet="bgn",
            ))
        s.commit()
    return SessionLocal


def test_share_sentiment_mutually_exclusive(db_with_mentions):
    SessionLocal = db_with_mentions
    with SessionLocal() as s:
        agg = mention_share(s, 1, 1)
    # n=5, target_count=4 → share=0.8, pos=2/5=0.4, neg=1/5=0.2, neu=1/5=0.2
    assert agg["n"] == 5
    assert agg["target_count"] == 4
    assert agg["share"] == pytest.approx(0.8, rel=1e-3)
    # 합 = share (mutually exclusive)
    total = agg["positive_share"] + agg["negative_share"] + agg["neutral_share"]
    assert total == pytest.approx(agg["share"], abs=1e-4), \
        f"sentiment 합 {total} != share {agg['share']}"
    assert agg["positive_share"] == pytest.approx(0.4, rel=1e-3)
    assert agg["negative_share"] == pytest.approx(0.2, rel=1e-3)
    assert agg["neutral_share"] == pytest.approx(0.2, rel=1e-3)


def test_competitor_share_basic(db_with_mentions):
    SessionLocal = db_with_mentions
    with SessionLocal() as s:
        cshr = competitor_share(s, 1, 1, "BGN 안과")
    # 5 응답 중 3개에 BGN 등장
    assert cshr["n"] == 5
    assert cshr["count"] == 3
    assert cshr["share"] == pytest.approx(0.6, rel=1e-3)
