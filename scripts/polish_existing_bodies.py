"""기존 published 콘텐츠 body 를 body_polish 로 일괄 재폴리셔.

Round 108-b (2026-07-03) — Nano Banana 이미지는 별도 재생성 script 로.
이 script 는 body HTML 만 처리:
  1. HTML entity 이중 인코딩 복구 (&amp; → &)
  2. 연속 <p>|...|</p> 마크다운 표 잔재 → <table> 병합
  3. 인라인 스타일 자동 삽입 (id 83 스타일)

사용:
    # dry-run (실제 UPDATE 안 함)
    python scripts/polish_existing_bodies.py --dry-run

    # 실제 적용
    python scripts/polish_existing_bodies.py

    # 특정 id 만
    python scripts/polish_existing_bodies.py --id 174

환경: DATABASE_URL 필요.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

# repo root 를 sys.path 에 추가 (scripts/ 에서 실행 시)
_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

from src.content.body_polish import polish_body_html  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="실제 UPDATE 안 함")
    parser.add_argument("--id", type=int, help="특정 콘텐츠 id 만 처리")
    parser.add_argument("--tenant-id", type=int, help="특정 tenant 만")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1

    engine = create_engine(db_url)
    with engine.begin() as conn:
        where_clauses = ["status = 'published'", "body IS NOT NULL", "length(body) > 100"]
        params: dict = {}
        if args.id:
            where_clauses.append("id = :id")
            params["id"] = args.id
        if args.tenant_id:
            where_clauses.append("tenant_id = :tid")
            params["tid"] = args.tenant_id
        where_sql = " AND ".join(where_clauses)

        rows = conn.execute(
            text(f"SELECT id, tenant_id, title, body FROM generated_contents WHERE {where_sql} ORDER BY id"),
            params,
        ).fetchall()

        logger.info("대상 콘텐츠: %d 편", len(rows))
        stats = {"processed": 0, "changed": 0, "unchanged": 0, "errors": 0}

        for row in rows:
            try:
                original = row.body
                polished = polish_body_html(original)
                stats["processed"] += 1
                if polished == original:
                    stats["unchanged"] += 1
                    continue
                stats["changed"] += 1
                diff_len = len(polished) - len(original)
                logger.info(
                    "id=%d tenant=%d 변경 (%+d chars): %s",
                    row.id, row.tenant_id, diff_len, (row.title or "")[:40],
                )
                if not args.dry_run:
                    conn.execute(
                        text("UPDATE generated_contents SET body = :b WHERE id = :id"),
                        {"b": polished, "id": row.id},
                    )
            except Exception as e:  # noqa: BLE001
                stats["errors"] += 1
                logger.error("id=%d 처리 실패: %s", row.id, e)

    logger.info("완료: %s", stats)
    if args.dry_run:
        logger.info("(dry-run 이라 실제 UPDATE 안 함)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
