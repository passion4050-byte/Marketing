"""Round 162 (2026-08-16) — 구글 리뷰 동기화 (지도 축).

경쟁사(growly) 분석 결론: Gemini 계열 AI 노출은 GBP(구글 비즈니스 프로필)의
평점·리뷰가 재료다. 이 스크립트는 **공식 Google Places API** 로 파트너 병원의
평점·리뷰 수·최신 리뷰(최대 5건)를 받아 저장한다 — 스크래핑 아님(정책 준수).

- tenants.google_place_id 가 있으면 바로 Place Details 조회.
- 없으면 name_en + address_en 으로 Text Search → place_id 확정 후 저장(1회성).
- 결과: tenants.google_rating / google_review_count 갱신 + google_reviews upsert.
- 프런트: v1 ClinicNAP 카드(집계 배지) + 클리닉 프로필(리뷰 인용)이 자동 점등.

환경변수:
  DATABASE_URL (필수)
  GOOGLE_MAPS_API_KEY (필수 — 없으면 전체 skip, exit 0. Places API (New) 활성 필요)
  TARGET_TENANT_IDS (선택, 콤마 구분 — 기본: 해외 상품 active 테넌트 전체)

비용: Place Details (Pro SKU) 호출 테넌트당 1회/실행 — 3일 주기 × 병원 수 수준,
월 무료 크레딧 내에서 충분.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import requests  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("google-reviews-sync")

PLACES_BASE = "https://places.googleapis.com/v1"


def resolve_place_id(api_key: str, name_en: str, address_en: str | None) -> str | None:
    """Text Search (New) 로 place_id 확정. 이름+주소 조합으로 오매칭 방지."""
    query = f"{name_en}, {address_en}" if address_en else name_en
    resp = requests.post(
        f"{PLACES_BASE}/places:searchText",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
            "Content-Type": "application/json",
        },
        json={"textQuery": query, "languageCode": "en"},
        timeout=30,
    )
    if resp.status_code >= 300:
        logger.error("Text Search 실패 %s: %s", resp.status_code, resp.text[:300])
        return None
    places = resp.json().get("places", [])
    if not places:
        logger.warning("place 검색 결과 없음: %s", query)
        return None
    top = places[0]
    logger.info(
        "place 확정: %s → %s (%s)",
        query,
        top.get("displayName", {}).get("text"),
        top.get("formattedAddress"),
    )
    return top.get("id")


def fetch_place(api_key: str, place_id: str) -> dict | None:
    resp = requests.get(
        f"{PLACES_BASE}/places/{place_id}",
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri",
        },
        params={"languageCode": "en"},
        timeout=30,
    )
    if resp.status_code >= 300:
        logger.error("Place Details 실패 %s: %s", resp.status_code, resp.text[:300])
        return None
    return resp.json()


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if not api_key:
        logger.warning("GOOGLE_MAPS_API_KEY 미설정 — 구글 리뷰 동기화 skip (정상 종료)")
        return 0

    target_ids = [
        int(x) for x in os.getenv("TARGET_TENANT_IDS", "").split(",") if x.strip().isdigit()
    ]

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.begin() as conn:
        if target_ids:
            rows = conn.execute(
                text(
                    "SELECT id, name, name_en, address_en, google_place_id FROM tenants "
                    "WHERE id = ANY(:ids)"
                ),
                {"ids": target_ids},
            ).fetchall()
        else:
            rows = conn.execute(
                text(
                    "SELECT DISTINCT t.id, t.name, t.name_en, t.address_en, t.google_place_id "
                    "FROM tenants t JOIN tenant_products tp ON tp.tenant_id = t.id "
                    "WHERE tp.market = 'overseas' AND tp.status = 'active' "
                    "AND t.name_en IS NOT NULL"
                )
            ).fetchall()

        synced = 0
        for tid, name, name_en, address_en, place_id in rows:
            label = name_en or name
            if not place_id:
                place_id = resolve_place_id(api_key, label, address_en)
                if not place_id:
                    continue
                conn.execute(
                    text("UPDATE tenants SET google_place_id = :pid WHERE id = :tid"),
                    {"pid": place_id, "tid": tid},
                )
            place = fetch_place(api_key, place_id)
            if not place:
                continue

            rating = place.get("rating")
            count = place.get("userRatingCount")
            conn.execute(
                text(
                    "UPDATE tenants SET google_rating = :r, google_review_count = :c "
                    "WHERE id = :tid"
                ),
                {"r": rating, "c": count, "tid": tid},
            )
            for rv in place.get("reviews", []) or []:
                author = (rv.get("authorAttribution") or {}).get("displayName") or "Google user"
                body = (rv.get("text") or {}).get("text") or (
                    (rv.get("originalText") or {}).get("text")
                )
                conn.execute(
                    text(
                        "INSERT INTO google_reviews "
                        "(tenant_id, author, rating, body, lang, publish_time) "
                        "VALUES (:tid, :author, :rating, :body, :lang, :pt) "
                        "ON CONFLICT (tenant_id, author, publish_time) DO UPDATE "
                        "SET rating = EXCLUDED.rating, body = EXCLUDED.body, "
                        "fetched_at = now()"
                    ),
                    {
                        "tid": tid,
                        "author": author,
                        "rating": rv.get("rating"),
                        "body": body,
                        "lang": ((rv.get("text") or {}).get("languageCode")),
                        "pt": rv.get("publishTime"),
                    },
                )
            synced += 1
            logger.info("%s (tenant %s): ★%s · %s건 동기화", label, tid, rating, count)

        logger.info("완료 — %s/%s 테넌트 동기화", synced, len(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
