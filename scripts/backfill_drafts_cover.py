"""Round 30 (2026-05-30) — draft 글의 비어있는 cover backfill.

배경:
    Round 28 부터 cron 이 status='draft' 로 저장하는데, 옛 scheduler 의 이미지 생성
    조건이 `status == 'published'` 이어서 draft 의 cover_image_url 이 NULL.
    Round 30 의 scheduler fix 는 새 글 부터 처리하지만, 이미 생성된 draft 들의
    cover 는 이 스크립트로 backfill.

대상:
    - status='draft' AND cover_image_url IS NULL
    - 자사 (business_model='self' OR partner_slug='medimap-self') 우선, 파트너도 포함

실행:
    python scripts/backfill_drafts_cover.py [--self-only] [--dry-run]
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("backfill-drafts-cover")


def main(self_only: bool = False, dry_run: bool = False) -> int:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if "postgresql" in db_url and "+psycopg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    engine = create_engine(db_url, future=True)

    # 대상 글 조회 — draft + cover 비어있음
    where_self = (
        "AND (t.business_model = 'self' OR t.partner_slug = 'medimap-self')"
        if self_only
        else ""
    )
    query = f"""
        SELECT gc.id, gc.tenant_id, gc.keyword_text, gc.title, gc.channel,
               t.business_model, t.partner_slug
        FROM generated_contents gc
        JOIN tenants t ON t.id = gc.tenant_id
        WHERE gc.status = 'draft'
          AND (gc.cover_image_url IS NULL OR gc.cover_image_url = '')
          AND gc.channel = 'blog_html'
          {where_self}
        ORDER BY gc.created_at DESC
        LIMIT 50
    """
    with engine.begin() as conn:
        rows = conn.execute(text(query)).mappings().all()

    logger.info("backfill 대상 글: %d 건", len(rows))
    if not rows:
        return 0

    if dry_run:
        for r in rows:
            logger.info(
                "[dry-run] id=%s tenant=%s self=%s keyword=%s",
                r["id"],
                r["tenant_id"],
                r["business_model"] == "self" or r["partner_slug"] == "medimap-self",
                r["keyword_text"],
            )
        return 0

    # 이미지 생성 모듈 lazy import (DATABASE_URL 검증 후)
    from src.content.image_picker import generate_image_for_content, is_enabled

    if not is_enabled():
        logger.error("IMAGE_GEN_ENABLED != true — backfill skip")
        return 1

    success = 0
    fail = 0
    for r in rows:
        cid = r["id"]
        keyword = r["keyword_text"] or ""
        title = r["title"] or ""
        is_self = (r["business_model"] == "self") or (
            r["partner_slug"] == "medimap-self"
        )
        logger.info(
            "[%d/%d] id=%s self=%s keyword=%s ...",
            success + fail + 1,
            len(rows),
            cid,
            is_self,
            keyword[:40],
        )
        try:
            img = generate_image_for_content(keyword, title, is_self_tenant=is_self)
            if not img:
                logger.warning("이미지 생성 실패: id=%s", cid)
                fail += 1
                continue
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "UPDATE generated_contents SET "
                        "cover_image_url=:url, cover_image_alt=:alt, "
                        "cover_image_prompt=:prompt, cover_image_generated_at=NOW() "
                        "WHERE id=:id"
                    ),
                    {
                        "url": img["url"],
                        "alt": img.get("alt", title),
                        "prompt": (img.get("prompt") or "")[:1000],
                        "id": cid,
                    },
                )
            logger.info(
                "  ✓ id=%s cover updated — source=%s",
                cid,
                img.get("source", "pollinations"),
            )
            success += 1
        except Exception as e:  # noqa: BLE001
            logger.exception("backfill 실패 id=%s: %s", cid, e)
            fail += 1

    logger.info(
        "backfill complete: success=%d fail=%d total=%d",
        success,
        fail,
        len(rows),
    )
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--self-only",
        action="store_true",
        help="자사 글만 대상 (business_model='self' OR partner_slug='medimap-self')",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="대상 글 목록만 출력 (이미지 생성 안 함)",
    )
    args = parser.parse_args()
    sys.exit(main(self_only=args.self_only, dry_run=args.dry_run))
