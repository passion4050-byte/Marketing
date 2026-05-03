"""Visibility — Phase 5-T2.1.

mention_share() 가 키워드 1개에 대한 멘션 통계를 dict 로 반환:
- n: 응답 수
- target_count: target 멘션이 있는 응답 수 (response 단위 dedupe)
- share = target_count / n
- ci_95 = Wilson 95% CI (lower, upper)
- weighted_share = Σ(response 별 max target weight) / n
- weighted_ci_95 = weighted_share 에 대한 Wilson CI (n 은 동일)
- by_brand: {brand: count} 내림차순 (target+competitor 모두)

Wilson CI 는 scipy 없이 Newcombe 1998 공식으로 직접 구현.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.storage.models import Mention, Query, Response


_Z_95 = 1.959963984540054  # 정규분포 0.975 quantile


def wilson_ci(p: float, n: int, *, z: float = _Z_95) -> tuple[float, float]:
    """Wilson score interval — Newcombe 1998. (lower, upper) 모두 0~1 clip."""
    if n <= 0:
        return (0.0, 0.0)
    p = max(0.0, min(1.0, p))
    denom = 1.0 + (z * z) / n
    center = (p + (z * z) / (2 * n)) / denom
    half = (z * math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n))) / denom
    lower = max(0.0, center - half)
    upper = min(1.0, center + half)
    return (round(lower, 4), round(upper, 4))


def mention_share(
    session: Session,
    tenant_id: int,
    keyword_id: int,
    *,
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
) -> dict:
    """tenant + keyword 의 멘션 점유율 통계.

    데이터가 0 이면 모든 비율 0, n=0.
    """
    # 1) 응답(Response) 조회 — 시간 필터
    q = (
        select(Response.id, Query.requested_at)
        .join(Query, Response.query_id == Query.id)
        .where(Query.tenant_id == tenant_id, Query.keyword_id == keyword_id)
    )
    if since is not None:
        q = q.where(Query.requested_at >= since)
    if until is not None:
        q = q.where(Query.requested_at <= until)

    rows = session.execute(q).all()
    response_ids = [r[0] for r in rows]
    n = len(response_ids)

    if n == 0:
        return {
            "n": 0,
            "target_count": 0,
            "share": 0.0,
            "ci_95": (0.0, 0.0),
            "weighted_share": 0.0,
            "weighted_ci_95": (0.0, 0.0),
            "by_brand": {},
        }

    # 2) 해당 응답들의 Mention 전체
    mentions = session.execute(
        select(Mention).where(
            Mention.tenant_id == tenant_id,
            Mention.response_id.in_(response_ids),
        )
    ).scalars().all()

    # 3) 응답 별 target 여부 + 응답 별 max target weight + sentiment 분포 (target only)
    target_response_ids: set[int] = set()
    response_max_weight: dict[int, float] = {}
    by_brand: dict[str, int] = {}
    pos_resp: set[int] = set()
    neg_resp: set[int] = set()
    neu_resp: set[int] = set()

    for m in mentions:
        if m.is_target:
            target_response_ids.add(m.response_id)
            cur = response_max_weight.get(m.response_id, 0.0)
            if m.weight > cur:
                response_max_weight[m.response_id] = m.weight
            sent = (m.sentiment or "neutral").lower()
            if sent == "positive":
                pos_resp.add(m.response_id)
            elif sent == "negative":
                neg_resp.add(m.response_id)
            else:
                neu_resp.add(m.response_id)
        # by_brand 카운트 (멘션 단위 — 같은 응답 내 다중 매치 모두 카운트)
        by_brand[m.brand] = by_brand.get(m.brand, 0) + 1

    target_count = len(target_response_ids)
    share = target_count / n
    weighted_sum = sum(response_max_weight.values())
    weighted_share = weighted_sum / n

    # sentiment 우선순위: 같은 응답에 부정/긍정 혼재 시 부정 > 중립 > 긍정 (보수적 표시).
    # 합 = target_count 가 되도록 mutually exclusive 분류.
    neg_only = neg_resp
    pos_only = pos_resp - neg_only
    neu_only = neu_resp - neg_only - pos_only
    # target 응답 중 어느 분류에도 안 들어간 것은 neutral 로 흡수
    classified = neg_only | pos_only | neu_only
    neu_only = neu_only | (target_response_ids - classified)

    pos_share = round(len(pos_only) / n, 4) if n else 0.0
    neg_share = round(len(neg_only) / n, 4) if n else 0.0
    neu_share = round(len(neu_only) / n, 4) if n else 0.0

    by_brand_sorted = dict(sorted(by_brand.items(), key=lambda kv: kv[1], reverse=True))

    return {
        "n": n,
        "target_count": target_count,
        "share": round(share, 4),
        "ci_95": wilson_ci(share, n),
        "weighted_share": round(weighted_share, 4),
        "weighted_ci_95": wilson_ci(weighted_share, n),
        "by_brand": by_brand_sorted,
        "positive_share": pos_share,
        "negative_share": neg_share,
        "neutral_share": neu_share,
    }


def competitor_share(
    session: Session,
    tenant_id: int,
    keyword_id: int,
    competitor_name: str,
    *,
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
) -> dict:
    """confirmed 경쟁사 1명에 대한 mention share — 비교 차트용.

    is_competitor=True AND brand contains competitor_name 인 응답을 카운트.
    """
    q = (
        select(Response.id)
        .join(Query, Response.query_id == Query.id)
        .where(Query.tenant_id == tenant_id, Query.keyword_id == keyword_id)
    )
    if since is not None:
        q = q.where(Query.requested_at >= since)
    if until is not None:
        q = q.where(Query.requested_at <= until)
    response_ids = [r[0] for r in session.execute(q).all()]
    n = len(response_ids)
    if n == 0:
        return {"name": competitor_name, "n": 0, "count": 0, "share": 0.0,
                "ci_95": (0.0, 0.0)}

    mentions = session.execute(
        select(Mention).where(
            Mention.tenant_id == tenant_id,
            Mention.response_id.in_(response_ids),
            Mention.is_competitor == True,  # noqa: E712
        )
    ).scalars().all()

    cn = competitor_name.strip()
    matched_response_ids: set[int] = set()
    for m in mentions:
        if m.brand and (cn in m.brand or m.brand in cn):
            matched_response_ids.add(m.response_id)

    count = len(matched_response_ids)
    share = count / n if n else 0.0
    return {
        "name": competitor_name,
        "n": n,
        "count": count,
        "share": round(share, 4),
        "ci_95": wilson_ci(share, n),
    }
