"""Round 150-b (2026-08-15) — 기존 발행분 본문 figure 이미지 일괄 재생성 (OpenAI).

배경: 커버는 nano_banana v2 로 240편 백필 완료됐지만, 본문 <figure> 이미지들은
구세대 Pollinations flux 산출물 그대로 — 저품질 + 인물 얼굴 누출(리쥬란-409 실사고).

동작:
  1. published blog_html 중 body 에 <figure> 가 있는 글 순회
  2. figure 별 분기
     - class="post-hero" figure → cover_image_url(이미 v2 vivid)로 src 교체 (재생성 0원)
     - 일반 figure → figcaption 텍스트를 섹션 컨텍스트로 OpenAI 재생성
       (image_picker.generate_body_illustration_for_section 재사용 — OpenAI→Gemini→flux 체인)
  3. 처리한 figure 에 data-imgv2="1" 마킹 → 멱등 (재실행 시 skip, 중단 후 이어하기)

사용:
    python scripts/regenerate_body_images.py --dry-run
    python scripts/regenerate_body_images.py --max 50 --sleep 2
    python scripts/regenerate_body_images.py --id 409

환경: DATABASE_URL, OPENAI_API_KEY(우선), GEMINI_API_KEY(폴백),
      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
비용: gpt-image-1 medium ≈ $0.04/장. 240편 × 본문 ~2장 ≈ $20 내외.
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_FIGURE_RE = re.compile(r"<figure\b[^>]*>.*?</figure>", re.IGNORECASE | re.DOTALL)
_CAPTION_RE = re.compile(r"<figcaption[^>]*>(.*?)</figcaption>", re.IGNORECASE | re.DOTALL)
_SRC_RE = re.compile(r'(<img[^>]*\bsrc=")([^"]+)(")', re.IGNORECASE)


def _caption_text(figure_html: str) -> str:
    m = _CAPTION_RE.search(figure_html)
    if not m:
        return ""
    return re.sub(r"<[^>]+>", "", m.group(1)).strip()


def _mark(figure_html: str) -> str:
    """<figure ...> 태그에 data-imgv2 마커 부착 (멱등 판별)."""
    return re.sub(r"<figure\b", '<figure data-imgv2="1"', figure_html, count=1, flags=re.IGNORECASE)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--id", type=int, help="특정 콘텐츠 id 만")
    parser.add_argument("--tenant-id", type=int, help="특정 tenant 만")
    parser.add_argument("--max", type=int, default=None, help="최대 처리 편 수")
    parser.add_argument("--sleep", type=float, default=2.0, help="편 사이 대기(초)")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1

    from src.content.image_picker import generate_body_illustration_for_section

    engine = create_engine(db_url)
    where = ["gc.status = 'published'", "gc.channel = 'blog_html'", "gc.body LIKE '%<figure%'"]
    params: dict = {}
    if args.id:
        where.append("gc.id = :id")
        params["id"] = args.id
    if args.tenant_id:
        where.append("gc.tenant_id = :tid")
        params["tid"] = args.tenant_id
    # 멱등은 figure 단위(data-imgv2 마커)로 판별 — 전 글 순회해도 처리 완료 글은 no-op.

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT gc.id, gc.keyword_text, gc.title, gc.body, gc.cover_image_url, "
                "       COALESCE(t.domain_category, '') AS domcat "
                "FROM generated_contents gc LEFT JOIN tenants t ON t.id = gc.tenant_id "
                f"WHERE {' AND '.join(where)} ORDER BY gc.id DESC"
            ),
            params,
        ).fetchall()
    if args.max:
        rows = rows[: args.max]
    logger.info("대상 글: %d 편", len(rows))

    stats = {"posts": 0, "figures": 0, "hero_swapped": 0, "regenerated": 0, "failed": 0}

    for n, row in enumerate(rows, 1):
        body = row.body or ""
        figures = _FIGURE_RE.findall(body)
        todo = [f for f in figures if "data-imgv2" not in f]
        if not todo:
            continue
        logger.info("[%d/%d] id=%s figures=%d (미처리 %d)", n, len(rows), row.id, len(figures), len(todo))
        if args.dry_run:
            stats["posts"] += 1
            stats["figures"] += len(todo)
            continue

        new_body = body
        changed = False
        for k, fig in enumerate(todo):
            stats["figures"] += 1
            if "post-hero" in fig:
                # 히어로는 v2 커버로 src 교체 (무비용·톤 일치)
                if row.cover_image_url:
                    new_fig = _SRC_RE.sub(
                        lambda m: f"{m.group(1)}{row.cover_image_url}{m.group(3)}", fig, count=1
                    )
                    new_body = new_body.replace(fig, _mark(new_fig), 1)
                    stats["hero_swapped"] += 1
                    changed = True
                continue
            caption = _caption_text(fig) or (row.title or row.keyword_text or "")
            img = generate_body_illustration_for_section(
                row.keyword_text or row.title or "korean medical clinic",
                caption,
                index=k,
                domain_category=row.domcat or None,
            )
            if not img or not img.get("url"):
                stats["failed"] += 1
                logger.warning("  → 재생성 실패 (figure %d)", k)
                continue
            new_fig = _SRC_RE.sub(
                lambda m: f"{m.group(1)}{img['url']}{m.group(3)}", fig, count=1
            )
            new_body = new_body.replace(fig, _mark(new_fig), 1)
            stats["regenerated"] += 1
            changed = True

        if changed:
            with engine.begin() as up:
                up.execute(
                    text("UPDATE generated_contents SET body = :b WHERE id = :id"),
                    {"b": new_body, "id": row.id},
                )
            stats["posts"] += 1
            logger.info("  ✓ 저장")
        if args.sleep and n < len(rows):
            time.sleep(args.sleep)

    logger.info("완료: %s", stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
