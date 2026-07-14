"""기존 blog_html 콘텐츠의 raw_qa_pairs 백필 — body FAQ 섹션을 평면 배열로 채운다.

_generate_draft 의 FAQ 파서(_extract_faq_pairs)와 동일 로직. FAPage JSON-LD + AEO FAQ
점수가 이미 발행/드래프트된 자동콘텐츠에도 소급 적용되게 한다. 이미 채워진 건 건너뜀.

사용:
    DATABASE_URL=postgresql://... python scripts/backfill_faq.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.collector.scheduler import _extract_faq_pairs  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402
from src.storage.models import GeneratedContent  # noqa: E402


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1

    updated = 0
    scanned = 0
    with SessionLocal() as s:
        rows = (
            s.query(GeneratedContent)
            .filter(GeneratedContent.channel == "blog_html")
            .all()
        )
        for obj in rows:
            scanned += 1
            cur = getattr(obj, "raw_qa_pairs", None)
            if isinstance(cur, list) and len(cur) > 0:
                continue  # 이미 채워짐
            pairs = _extract_faq_pairs(getattr(obj, "body", "") or "")
            if pairs:
                obj.raw_qa_pairs = pairs
                updated += 1
        if updated:
            s.commit()

    print(f"scanned={scanned} updated={updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
