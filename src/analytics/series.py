"""Time series builder — Phase 5-T2.4.

DB → 일별 mention share 시계열. SQL 그룹은 SQLAlchemy func.date 사용 (SQLite/Postgres
모두 호환).

누락 날짜는 0.0 으로 fill — Mann-Kendall / 이상치 검정에 NaN 이 들어가지 않도록.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.storage.models import Mention, Query, Response


@dataclass
class DailyShare:
    day: date
    n: int
    target_count: int
    share: float
    weighted_share: float


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def daily_mention_share_series(
    session: Session,
    tenant_id: int,
    keyword_id: int,
    *,
    days: int = 30,
    until: Optional[date] = None,
) -> list[DailyShare]:
    """tenant + keyword 의 최근 ``days`` 일 mention share 시계열.

    누락 날짜는 share=0.0, n=0 으로 채움.
    """
    if until is None:
        until = _today_utc()
    since_dt = datetime.combine(
        until - timedelta(days=days - 1), datetime.min.time(), tzinfo=timezone.utc
    )
    until_dt = datetime.combine(
        until, datetime.max.time(), tzinfo=timezone.utc
    )

    # 일별 응답 수
    day_col = func.date(Query.requested_at)
    response_counts = dict(
        session.execute(
            select(day_col.label("d"), func.count(Response.id))
            .join(Response, Response.query_id == Query.id)
            .where(
                Query.tenant_id == tenant_id,
                Query.keyword_id == keyword_id,
                Query.requested_at >= since_dt,
                Query.requested_at <= until_dt,
            )
            .group_by(day_col)
        ).all()
    )

    # 일별 target 응답 수 (response_id distinct)
    target_counts: dict[str, int] = {}
    target_weighted: dict[str, float] = {}

    rows = session.execute(
        select(
            day_col.label("d"),
            Response.id.label("rid"),
            func.max(Mention.weight).label("max_w"),
        )
        .join(Response, Response.query_id == Query.id)
        .join(Mention, Mention.response_id == Response.id)
        .where(
            Query.tenant_id == tenant_id,
            Query.keyword_id == keyword_id,
            Mention.is_target == True,  # noqa: E712
            Query.requested_at >= since_dt,
            Query.requested_at <= until_dt,
        )
        .group_by(day_col, Response.id)
    ).all()

    for row in rows:
        d_key = str(row.d)
        target_counts[d_key] = target_counts.get(d_key, 0) + 1
        target_weighted[d_key] = target_weighted.get(d_key, 0.0) + float(row.max_w or 0.0)

    out: list[DailyShare] = []
    for offset in range(days):
        d = until - timedelta(days=days - 1 - offset)
        d_key = d.isoformat()
        # response_counts 의 key 가 ``date`` 객체일 수도 있으므로 양쪽 시도
        n = response_counts.get(d) or response_counts.get(d_key) or 0
        n = int(n)
        target = int(target_counts.get(d_key, 0))
        weighted = float(target_weighted.get(d_key, 0.0))
        share = round(target / n, 4) if n > 0 else 0.0
        weighted_share = round(weighted / n, 4) if n > 0 else 0.0
        out.append(DailyShare(
            day=d, n=n, target_count=target, share=share, weighted_share=weighted_share,
        ))
    return out
