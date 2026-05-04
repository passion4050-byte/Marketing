"""GA4 Data API fetcher — Phase 8-02.

자사 블로그(medimap-blog)에 부착된 GA4 측정 ID 의 데이터를 서비스 계정으로 조회해
Streamlit Funnel 탭에서 cite × pageview × cta_click 통합 KPI로 집계한다.

설정 (둘 다 필요):
- ``GA4_PROPERTY_ID`` (Streamlit secrets 또는 env) — 예: "489123456" (G- 접두 *없이* 숫자만)
- ``GA4_SERVICE_ACCOUNT_JSON`` — service account 키 JSON 전체 (multiline string)

서비스 계정 발급 절차:
1. Google Cloud Console → IAM → Service Accounts → Create
2. role: 비워둠 (GA 권한은 GA 측에서 부여)
3. Keys → Add Key → JSON 다운로드
4. GA4 → Admin → Property Access Management → 서비스 계정 이메일 Viewer 권한 추가
5. JSON 전체를 Streamlit secrets ``[GA4_SERVICE_ACCOUNT_JSON]`` 으로 붙여넣기

quota: GA4 Data API 는 property 당 일 200K req. 캐싱(TTL 1시간) 으로 충분히 여유.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)


@dataclass(frozen=True)
class PageViewRow:
    page_path: str
    page_views: int
    sessions: int
    avg_engagement_seconds: float


def _load_credentials():
    """service account credentials 로드. 미설정 시 None."""
    raw = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return None
    try:
        from google.oauth2 import service_account  # type: ignore

        info = json.loads(raw)
        return service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
    except Exception as e:
        logger.warning("ga4.credentials_load_failed", error=str(e))
        return None


def is_configured() -> bool:
    """GA4 가 설정되어 있고 import 가능한 상태인지."""
    if not os.getenv("GA4_PROPERTY_ID"):
        return False
    if not os.getenv("GA4_SERVICE_ACCOUNT_JSON"):
        return False
    try:
        import google.analytics.data_v1beta  # noqa: F401
    except ImportError:
        return False
    return True


@lru_cache(maxsize=8)
def _cached_fetch(property_id: str, since_iso: str, until_iso: str) -> tuple[PageViewRow, ...]:
    """실제 GA4 호출 — lru_cache 로 1시간 단위 결과 재사용."""
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient  # type: ignore
        from google.analytics.data_v1beta.types import (  # type: ignore
            DateRange,
            Dimension,
            Metric,
            RunReportRequest,
        )
    except ImportError as e:
        logger.warning("ga4.sdk_missing", error=str(e))
        return tuple()

    creds = _load_credentials()
    if creds is None:
        return tuple()

    client = BetaAnalyticsDataClient(credentials=creds)
    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[
            Metric(name="screenPageViews"),
            Metric(name="sessions"),
            Metric(name="userEngagementDuration"),
        ],
        date_ranges=[DateRange(start_date=since_iso, end_date=until_iso)],
        limit=200,
    )
    try:
        resp = client.run_report(request)
    except Exception as e:
        logger.warning("ga4.run_report_failed", error=str(e))
        return tuple()

    rows: list[PageViewRow] = []
    for row in resp.rows:
        path = row.dimension_values[0].value or "/"
        pv = int(row.metric_values[0].value or 0)
        sess = int(row.metric_values[1].value or 0)
        eng_total_sec = float(row.metric_values[2].value or 0)
        avg_eng = eng_total_sec / sess if sess > 0 else 0.0
        rows.append(
            PageViewRow(
                page_path=path,
                page_views=pv,
                sessions=sess,
                avg_engagement_seconds=avg_eng,
            )
        )
    return tuple(rows)


def fetch_pageviews(
    *,
    days: int = 30,
    property_id: Optional[str] = None,
) -> list[PageViewRow]:
    """최근 N 일 페이지뷰. 미설정/SDK 부재 시 빈 list 반환 (graceful)."""
    pid = property_id or os.getenv("GA4_PROPERTY_ID", "").strip()
    if not pid:
        return []
    until = date.today()
    since = until - timedelta(days=days)
    return list(_cached_fetch(pid, since.isoformat(), until.isoformat()))


def join_with_publications(rows: list[PageViewRow], pub_url_to_cite: dict[str, int]) -> list[dict]:
    """GA4 row × Publication.cite_count → 통합 표 dict.

    pub_url_to_cite: {full_url: cite_count}
    매칭은 path suffix 로 — GA4 path("/blog/lasik-guide") 가 publication URL 의
    path 부분과 같으면 join. host 부분은 시스템마다 달라서 path 만 비교.
    """
    from urllib.parse import urlparse

    by_path: dict[str, int] = {}
    for url, cite in pub_url_to_cite.items():
        try:
            p = urlparse(url).path or "/"
        except Exception:
            continue
        by_path[p] = by_path.get(p, 0) + (cite or 0)

    merged: list[dict] = []
    seen_paths: set[str] = set()
    for r in rows:
        merged.append(
            {
                "page_path": r.page_path,
                "page_views": r.page_views,
                "sessions": r.sessions,
                "avg_engagement_seconds": round(r.avg_engagement_seconds, 1),
                "cite_count": by_path.get(r.page_path, 0),
            }
        )
        seen_paths.add(r.page_path)
    # publication 은 있고 GA4 데이터는 없는 케이스도 표시 (미수집 path)
    for path, cite in by_path.items():
        if path in seen_paths:
            continue
        merged.append(
            {
                "page_path": path,
                "page_views": 0,
                "sessions": 0,
                "avg_engagement_seconds": 0.0,
                "cite_count": cite,
            }
        )
    merged.sort(key=lambda x: (-x["cite_count"], -x["page_views"]))
    return merged
