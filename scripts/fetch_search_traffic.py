"""Round 156 (2026-08-16) — GA4/GSC 유입 실측 수집.

"3개월 문의 0" 진단(Round 155)의 마지막 미지수 = 절대 유입량.
매일 07:30 KST cron 으로 실행 (search-traffic-sync.yml):

- GSC Search Analytics API → gsc_daily(일×페이지) + gsc_query_daily(일×검색어)
  · Google 검색 노출/클릭/순위. 데이터 지연 ~2일이므로 매일 최근 BACKFILL_DAYS 를
    upsert (멱등 — 같은 날짜를 여러 번 받아도 최신값으로 덮어씀).
  · workflow_dispatch 로 BACKFILL_DAYS=480 을 주면 GSC 보관분(16개월) 소급 적재.
- GA4 Data API → ga4_daily(일×경로) + ga4_source_daily(일×유입소스)
  · AI 엔진 referral(chatgpt.com, perplexity.ai 등) 유입이 여기서만 보인다 —
    GEO SaaS 의 핵심 지표. GA4_PROPERTY_ID 미설정 시 silent no-op (Phase 8 규약).

환경변수:
- DATABASE_URL (필수) — Supabase Postgres 직결
- GOOGLE_SERVICE_ACCOUNT_JSON — 서비스계정 키 JSON 전체.
  (기존 Phase 8 secret 이름 GA4_SERVICE_ACCOUNT_JSON 도 폴백으로 인식)
  · GSC: 속성에 SA 이메일을 "전체" 사용자로 추가
  · GA4: 속성 액세스 관리에서 SA 이메일 Viewer 추가
- GSC_SITE_URL (기본 sc-domain:wecircle.co.kr)
- GA4_PROPERTY_ID — 숫자만 (G- 접두 없이). 미설정 시 GA4 수집 스킵.
- BACKFILL_DAYS (기본 4)
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import date, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("search-traffic-sync")

GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"


def _load_sa_info() -> dict | None:
    raw = (
        os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
        or os.getenv("GA4_SERVICE_ACCOUNT_JSON", "").strip()
    )
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("service account JSON 파싱 실패: %s", e)
        return None


def _date_range() -> tuple[str, str]:
    days = int(os.getenv("BACKFILL_DAYS", "4"))
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=max(days - 1, 0))
    return start.isoformat(), end.isoformat()


# ---------------------------------------------------------------- GSC
def fetch_gsc(sa_info: dict, engine) -> None:
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    site_url = os.getenv("GSC_SITE_URL", "sc-domain:wecircle.co.kr")
    creds = service_account.Credentials.from_service_account_info(sa_info, scopes=[GSC_SCOPE])
    session = AuthorizedSession(creds)
    start, end = _date_range()

    from urllib.parse import quote
    endpoint = (
        "https://searchconsole.googleapis.com/webmasters/v3/sites/"
        f"{quote(site_url, safe='')}/searchAnalytics/query"
    )

    def _query(dimension: str) -> list[dict]:
        rows: list[dict] = []
        start_row = 0
        while True:
            resp = session.post(
                endpoint,
                json={
                    "startDate": start,
                    "endDate": end,
                    "dimensions": ["date", dimension],
                    "rowLimit": 25000,
                    "startRow": start_row,
                },
                timeout=60,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"GSC API {resp.status_code}: {resp.text[:500]}")
            batch = resp.json().get("rows", [])
            rows.extend(batch)
            if len(batch) < 25000:
                return rows
            start_row += 25000

    upserts = {
        "page": (
            _query("page"),
            """
            INSERT INTO gsc_daily (date, page, clicks, impressions, ctr, position, synced_at)
            VALUES (:d, :k, :clicks, :impressions, :ctr, :position, now())
            ON CONFLICT (date, page) DO UPDATE SET
              clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions,
              ctr = EXCLUDED.ctr, position = EXCLUDED.position, synced_at = now()
            """,
        ),
        "query": (
            _query("query"),
            """
            INSERT INTO gsc_query_daily (date, query, clicks, impressions, ctr, position, synced_at)
            VALUES (:d, :k, :clicks, :impressions, :ctr, :position, now())
            ON CONFLICT (date, query) DO UPDATE SET
              clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions,
              ctr = EXCLUDED.ctr, position = EXCLUDED.position, synced_at = now()
            """,
        ),
    }

    with engine.begin() as conn:
        for dim, (rows, sql) in upserts.items():
            for r in rows:
                d, key = r["keys"][0], r["keys"][1]
                conn.execute(
                    text(sql),
                    {
                        "d": d,
                        "k": key[:2000],
                        "clicks": int(r.get("clicks", 0)),
                        "impressions": int(r.get("impressions", 0)),
                        "ctr": float(r.get("ctr", 0.0)),
                        "position": float(r.get("position", 0.0)),
                    },
                )
            logger.info("GSC %s 차원 %d행 upsert (%s ~ %s)", dim, len(rows), start, end)


# ---------------------------------------------------------------- GA4
def fetch_ga4(sa_info: dict, engine) -> None:
    property_id = os.getenv("GA4_PROPERTY_ID", "").strip()
    if not property_id:
        logger.info("GA4_PROPERTY_ID 미설정 — GA4 수집 스킵 (태그 설치/속성 생성 후 secret 등록)")
        return

    from google.oauth2 import service_account
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    creds = service_account.Credentials.from_service_account_info(sa_info, scopes=[GA4_SCOPE])
    client = BetaAnalyticsDataClient(credentials=creds)
    start, end = _date_range()

    def _run(dimensions: list[str], metrics: list[str]):
        req = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start, end_date=end)],
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
            limit=100000,
        )
        return client.run_report(req)

    def _iso(ga_date: str) -> str:
        # GA4 는 'YYYYMMDD' 로 반환
        return f"{ga_date[:4]}-{ga_date[4:6]}-{ga_date[6:8]}"

    # 일×경로
    page_resp = _run(["date", "pagePath"], ["sessions", "activeUsers", "screenPageViews"])
    # 일×유입소스 — AI 엔진 referral 이 여기 잡힌다
    src_resp = _run(["date", "sessionSource", "sessionMedium"], ["sessions", "activeUsers"])

    with engine.begin() as conn:
        for row in page_resp.rows:
            conn.execute(
                text(
                    """
                    INSERT INTO ga4_daily (date, page_path, sessions, active_users, page_views, synced_at)
                    VALUES (:d, :p, :s, :u, :v, now())
                    ON CONFLICT (date, page_path) DO UPDATE SET
                      sessions = EXCLUDED.sessions, active_users = EXCLUDED.active_users,
                      page_views = EXCLUDED.page_views, synced_at = now()
                    """
                ),
                {
                    "d": _iso(row.dimension_values[0].value),
                    "p": row.dimension_values[1].value[:2000],
                    "s": int(row.metric_values[0].value or 0),
                    "u": int(row.metric_values[1].value or 0),
                    "v": int(row.metric_values[2].value or 0),
                },
            )
        logger.info("GA4 페이지 %d행 upsert", len(page_resp.rows))

        for row in src_resp.rows:
            conn.execute(
                text(
                    """
                    INSERT INTO ga4_source_daily (date, source, medium, sessions, active_users, synced_at)
                    VALUES (:d, :src, :med, :s, :u, now())
                    ON CONFLICT (date, source, medium) DO UPDATE SET
                      sessions = EXCLUDED.sessions, active_users = EXCLUDED.active_users,
                      synced_at = now()
                    """
                ),
                {
                    "d": _iso(row.dimension_values[0].value),
                    "src": row.dimension_values[1].value[:500],
                    "med": row.dimension_values[2].value[:200],
                    "s": int(row.metric_values[0].value or 0),
                    "u": int(row.metric_values[1].value or 0),
                },
            )
        logger.info("GA4 소스 %d행 upsert", len(src_resp.rows))


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1

    sa_info = _load_sa_info()
    if not sa_info:
        logger.error(
            "GOOGLE_SERVICE_ACCOUNT_JSON 미설정 — GSC/GA4 모두 수집 불가. "
            "GCP 서비스계정 키를 GitHub secret 으로 등록하세요."
        )
        return 1

    engine = create_engine(db_url, pool_pre_ping=True)

    ok = True
    try:
        fetch_gsc(sa_info, engine)
    except Exception as e:  # noqa: BLE001 — 한쪽 실패해도 다른 쪽은 진행
        logger.error("GSC 수집 실패: %s", e)
        ok = False
    try:
        fetch_ga4(sa_info, engine)
    except Exception as e:  # noqa: BLE001
        logger.error("GA4 수집 실패: %s", e)
        ok = False

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
