"""Pollinations URL → Supabase Storage 일괄 마이그레이션.

Round 26 (2026-05-29) — 이미지 X 박스 영구 해결.

대상:
    - generated_contents.cover_image_url (필드 단위)
    - generated_contents.body 안 <img src="https://image.pollinations.ai/..."> (HTML 파싱)

처리:
    1. SUPABASE 환경변수 + DATABASE_URL 검증
    2. 마이그레이션 대상 글 조회 (status='published' 만)
    3. 각 글의 Pollinations URL 추출
    4. fetch_image_bytes → upload_bytes_to_storage → 새 public URL
    5. body 안 URL 치환 + cover_image_url UPDATE
    6. 진행 상황 stdout (각 글 / 각 URL)

사용:
    DATABASE_URL=postgresql://... \\
    SUPABASE_URL=https://....supabase.co \\
    SUPABASE_SERVICE_ROLE_KEY=eyJ... \\
        python scripts/migrate_pollinations_to_storage.py

GitHub Actions 에서 한 번만 수동 트리거 또는 로컬에서 직접 실행. 멱등 — 이미 Storage URL 인 글은 skip.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

POLLINATIONS_PATTERN = re.compile(
    r'https?://image\.pollinations\.ai/[^\s"\'<>)]+',
    re.IGNORECASE,
)


def _required_env() -> None:
    """필수 env 검증 + trailing whitespace/quote 정리 (안전망)."""
    missing = []
    for key in ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        raw = os.environ.get(key) or ""
        cleaned = raw.strip().strip('"').strip("'")
        if not cleaned:
            missing.append(key)
            continue
        if cleaned != raw:
            print(f"WARNING: {key} 에 공백/따옴표가 있어 정리함 (len {len(raw)} → {len(cleaned)})")
            os.environ[key] = cleaned
    if missing:
        print(f"ERROR: 필수 env 미설정 — {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)


def main() -> int:
    _required_env()

    # delayed imports (env 검증 후)
    from sqlalchemy import create_engine, text
    from src.content.image_uploader import fetch_image_bytes, upload_bytes_to_storage

    engine = create_engine(os.environ["DATABASE_URL"], future=True)
    summary = {
        "rows_scanned": 0,
        "cover_migrated": 0,
        "body_urls_migrated": 0,
        "errors": 0,
        "skipped_already_storage": 0,
    }

    with engine.begin() as conn:
        rows = conn.execute(text(
            """
            SELECT id, title, body, cover_image_url, status
            FROM generated_contents
            WHERE status = 'published'
              AND ((cover_image_url IS NOT NULL AND cover_image_url LIKE '%pollinations.ai%')
                   OR body LIKE '%pollinations.ai%')
            ORDER BY id
            """
        )).mappings().all()

        print(f"마이그레이션 대상 글: {len(rows)} 편")
        summary["rows_scanned"] = len(rows)

        for row in rows:
            content_id = row["id"]
            title = (row["title"] or "")[:50]
            body = row["body"] or ""
            cover_url = row["cover_image_url"]

            print(f"\n[{content_id}] {title}")
            new_body = body
            new_cover = cover_url

            # 1. cover_image_url
            if cover_url and "pollinations.ai" in cover_url and "storage/v1/object" not in cover_url:
                bytes_ = fetch_image_bytes(cover_url)
                if bytes_:
                    new_url = upload_bytes_to_storage(
                        bytes_, name_hint=f"cover-{title}", subdir="cover"
                    )
                    if new_url:
                        new_cover = new_url
                        summary["cover_migrated"] += 1
                        print(f"  cover  ✓ → {new_url[-60:]}")
                    else:
                        summary["errors"] += 1
                        print(f"  cover  ✗ Storage 업로드 실패")
                else:
                    summary["errors"] += 1
                    print(f"  cover  ✗ Pollinations fetch 실패")
            elif cover_url and "storage/v1/object" in cover_url:
                summary["skipped_already_storage"] += 1
                print(f"  cover  - 이미 Storage")

            # 2. body 안 모든 Pollinations URL
            unique_urls = list(set(POLLINATIONS_PATTERN.findall(body)))
            print(f"  body Pollinations URL: {len(unique_urls)} 개")
            for src_url in unique_urls:
                bytes_ = fetch_image_bytes(src_url)
                if not bytes_:
                    summary["errors"] += 1
                    print(f"    ✗ fetch 실패 {src_url[-40:]}")
                    continue
                new_url = upload_bytes_to_storage(
                    bytes_, name_hint=f"body-{content_id}", subdir="body"
                )
                if not new_url:
                    summary["errors"] += 1
                    print(f"    ✗ upload 실패 {src_url[-40:]}")
                    continue
                new_body = new_body.replace(src_url, new_url)
                summary["body_urls_migrated"] += 1
                print(f"    ✓ {new_url[-60:]}")

            # 3. DB UPDATE — 변경 있을 때만
            if new_body != body or new_cover != cover_url:
                conn.execute(
                    text(
                        "UPDATE generated_contents "
                        "SET body=:b, cover_image_url=:c, updated_at=NOW() "
                        "WHERE id=:id"
                    ),
                    {"b": new_body, "c": new_cover, "id": content_id},
                )

    print()
    print("=" * 60)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["errors"] == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
