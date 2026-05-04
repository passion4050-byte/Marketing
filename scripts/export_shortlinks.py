"""SaaS DB → medimap-blog/content/shortlinks.json export.

Phase 7-04. 빌드 시점에 호출하면 활성 ShortLink 들을 정적 매니페스트로 출력해
Next.js redirect 라우트가 사용한다. 별도 실행 환경 간 네트워크 종속을 피하는 단순 패턴.

Usage:
    python scripts/export_shortlinks.py [--out medimap-blog/content/shortlinks.json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.storage.db import get_session_factory  # noqa: E402
from src.storage.models import ShortLink  # noqa: E402


def export_shortlinks(out_path: Path) -> int:
    SessionLocal = get_session_factory()
    with SessionLocal() as s:
        rows = s.query(ShortLink).filter(ShortLink.is_active.is_(True)).all()
        manifest: dict[str, dict] = {}
        for r in rows:
            manifest[r.slug] = {
                "target_url": r.target_url,
                "label": r.label or "",
                "publication_id": r.publication_id,
                "is_active": True,
            }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return len(manifest)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "medimap-blog" / "content" / "shortlinks.json",
        help="Output path for shortlinks manifest",
    )
    args = parser.parse_args()
    n = export_shortlinks(args.out)
    print(f"Exported {n} shortlinks to {args.out}")


if __name__ == "__main__":
    main()
