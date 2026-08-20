"""Round 166 (2026-08-20) — post-images 고아 이미지 정리 (DRY_RUN 기본).

배경: Supabase 무료 쿼터 초과 실사고 (2026-08-19 — exceed_storage_size_quota +
exceed_egress_quota → 서비스 제한, Pro 업그레이드로 해제). post-images 버킷
1,979파일/1,652MB 중 840파일/416MB 가 어느 generated_contents 의
cover_image_url/body 에서도 참조되지 않는 고아였다 (커버 v1→v2 백필 잔존물 등).

동작:
- 참조 추출: generated_contents 의 cover_image_url + body 에서
  'post-images/<name>' 패턴 전량 (status 무관 — archived 도 보존).
- 고아 판정: storage.objects 중 미참조 AND created_at < now()-14일
  (막 업로드돼 아직 발행 전인 이미지 보호).
- 안전 가드: 고아 비율이 80% 를 넘으면 참조 추출 실패로 간주하고 중단.
- DRY_RUN=1(기본): 목록·용량만 출력, 삭제 없음.
- DRY_RUN=0: Storage API 배치 삭제 (100개 단위). SQL DELETE 금지 —
  storage.objects 행만 지우면 실제 블롭이 남아 용량이 줄지 않는다.

환경변수: DATABASE_URL(필수) · DRY_RUN(기본 "1")
  삭제 실행 시 추가 필수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
"""
from __future__ import annotations

import logging
import os
import sys

import requests
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("cleanup-orphan-images")

BUCKET = "post-images"
MIN_AGE_DAYS = 14
SAFETY_MAX_ORPHAN_RATIO = 0.8
DELETE_CHUNK = 100

ORPHAN_SQL = """
WITH refs AS (
  SELECT DISTINCT m[1] AS name FROM (
    SELECT regexp_matches(cover_image_url, 'post-images/(.+)$') AS m
    FROM generated_contents WHERE cover_image_url LIKE '%%post-images%%'
    UNION ALL
    SELECT regexp_matches(body, 'post-images/([^"''[:space:])]+)', 'g')
    FROM generated_contents WHERE body LIKE '%%post-images%%'
  ) t
)
SELECT o.name, COALESCE((o.metadata->>'size')::bigint, 0) AS size
FROM storage.objects o
LEFT JOIN refs r ON r.name = o.name
WHERE o.bucket_id = :bucket
  AND r.name IS NULL
  AND o.created_at < now() - make_interval(days => :min_age)
ORDER BY o.name
"""

TOTAL_SQL = "SELECT count(*) FROM storage.objects WHERE bucket_id = :bucket"


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    dry = os.getenv("DRY_RUN", "1").strip() != "0"

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.connect() as conn:
        total = conn.execute(text(TOTAL_SQL), {"bucket": BUCKET}).scalar_one()
        rows = conn.execute(
            text(ORPHAN_SQL), {"bucket": BUCKET, "min_age": MIN_AGE_DAYS}
        ).fetchall()

    names = [r[0] for r in rows]
    size_mb = sum(r[1] for r in rows) / (1024 * 1024)
    logger.info(
        "버킷 %s: 전체 %s개 · 고아(≥%s일) %s개 · %.0f MB",
        BUCKET, total, MIN_AGE_DAYS, len(names), size_mb,
    )
    for n in names[:20]:
        logger.info("  orphan: %s", n)
    if len(names) > 20:
        logger.info("  … 외 %s개", len(names) - 20)

    if not names:
        logger.info("고아 없음 — 종료")
        return 0
    if total and len(names) / total > SAFETY_MAX_ORPHAN_RATIO:
        logger.error(
            "안전 가드: 고아 비율 %.0f%% > %.0f%% — 참조 추출 이상 의심, 중단",
            100 * len(names) / total, 100 * SAFETY_MAX_ORPHAN_RATIO,
        )
        return 1
    if dry:
        logger.info("DRY_RUN=1 — 삭제하지 않음. 실행하려면 DRY_RUN=0 로 재실행.")
        return 0

    supa_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supa_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supa_url or not supa_key:
        logger.error("삭제 실행에는 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 필요")
        return 1

    headers = {"Authorization": f"Bearer {supa_key}", "apikey": supa_key}
    deleted = 0
    for i in range(0, len(names), DELETE_CHUNK):
        chunk = names[i : i + DELETE_CHUNK]
        resp = requests.delete(
            f"{supa_url}/storage/v1/object/{BUCKET}",
            json={"prefixes": chunk},
            headers=headers,
            timeout=60,
        )
        if resp.status_code >= 300:
            logger.error("배치 삭제 실패 (%s): %s", resp.status_code, resp.text[:300])
            return 1
        deleted += len(chunk)
        logger.info("삭제 진행 %s/%s", deleted, len(names))

    logger.info("완료 — %s개 삭제 (%.0f MB 회수)", deleted, size_mb)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
