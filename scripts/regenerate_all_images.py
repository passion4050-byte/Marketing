"""기존 published 콘텐츠 65편의 커버 이미지를 Nano Banana 로 일괄 재생성.

Round 108-c (2026-07-03) — 사용자 요구: 무신사 매거진 감도 실사 이미지.
기존 이미지 (흑인/백인/애니메이션) → 한국인 시네마틱 실사.

사용:
    # dry-run (실제 재생성 안 함, 대상만 나열)
    python scripts/regenerate_all_images.py --dry-run

    # 실제 실행 (전체 65편, 20초/편 × 65 = 약 20~25분)
    python scripts/regenerate_all_images.py

    # 특정 id 만
    python scripts/regenerate_all_images.py --id 42

    # 특정 tenant 만
    python scripts/regenerate_all_images.py --tenant-id 6

    # 배치 크기 (rate limit 조절)
    python scripts/regenerate_all_images.py --sleep 5

환경: DATABASE_URL, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요.

비용:
    Gemini 2.5 Flash Image = 저렴 (DALL-E $0.08 대비 훨씬 저렴, 대부분 free tier 커버).
    65편 × 이미지 1장 = 총 약 $0~$1 예상.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

from src.content.nano_banana_client import generate_nano_banana_image  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--id", type=int, help="특정 콘텐츠 id 만")
    parser.add_argument("--tenant-id", type=int, help="특정 tenant 만")
    parser.add_argument("--sleep", type=float, default=3.0, help="편 사이 대기(초)")
    parser.add_argument("--max", type=int, default=None, help="최대 처리 편 수")
    parser.add_argument(
        "--skip-existing-nano",
        action="store_true",
        help="cover_image_prompt 가 nano_banana|... 로 시작하면 skip (이미 재생성 됨)",
    )
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")):
        logger.error("GEMINI_API_KEY 미설정")
        return 1

    engine = create_engine(db_url)
    with engine.begin() as conn:
        where_clauses = ["gc.status = 'published'"]
        params: dict = {}
        if args.id:
            where_clauses.append("gc.id = :id")
            params["id"] = args.id
        if args.tenant_id:
            where_clauses.append("gc.tenant_id = :tid")
            params["tid"] = args.tenant_id
        if args.skip_existing_nano:
            where_clauses.append(
                "(gc.cover_image_prompt IS NULL OR gc.cover_image_prompt NOT LIKE 'nano_banana|%')"
            )
        where_sql = " AND ".join(where_clauses)
        sql = f"""
            SELECT gc.id, gc.tenant_id, gc.title, gc.keyword_text,
                   gc.cover_image_url, gc.cover_image_prompt,
                   COALESCE(t.name, '') AS tenant_name,
                   COALESCE(t.partner_slug, '') AS partner_slug
            FROM generated_contents gc
            LEFT JOIN tenants t ON t.id = gc.tenant_id
            WHERE {where_sql}
            ORDER BY gc.id DESC
        """
        rows = conn.execute(text(sql), params).fetchall()
        if args.max:
            rows = rows[: args.max]
        logger.info("대상 콘텐츠: %d 편", len(rows))

        stats = {"processed": 0, "success": 0, "failed": 0, "skipped": 0}

        for i, row in enumerate(rows, 1):
            kw = row.keyword_text or row.title or "korean medical clinic"
            title = row.title or None
            is_self = row.tenant_id == 12  # 메디맵 자사
            logger.info(
                "[%d/%d] id=%d tenant=%d(%s) kw='%s'",
                i, len(rows), row.id, row.tenant_id,
                (row.tenant_name or "")[:20], kw[:40],
            )

            if args.dry_run:
                stats["skipped"] += 1
                continue

            try:
                result = generate_nano_banana_image(kw, title, is_self_tenant=is_self)
                if not result or not result.get("url"):
                    stats["failed"] += 1
                    logger.warning("  → 실패")
                else:
                    with engine.begin() as up_conn:
                        up_conn.execute(
                            text(
                                "UPDATE generated_contents "
                                "SET cover_image_url = :u, cover_image_alt = :a, "
                                "    cover_image_prompt = :p "
                                "WHERE id = :id"
                            ),
                            {
                                "u": result["url"],
                                "a": result.get("alt", ""),
                                "p": result.get("prompt", "nano_banana|unknown"),
                                "id": row.id,
                            },
                        )
                    stats["success"] += 1
                    logger.info("  ✓ %s", result["url"][:100])
            except Exception as e:  # noqa: BLE001
                stats["failed"] += 1
                logger.error("  → 예외: %s", e)
            stats["processed"] += 1

            if args.sleep and i < len(rows):
                time.sleep(args.sleep)

    logger.info("완료: %s", stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
