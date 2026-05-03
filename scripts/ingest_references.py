"""Reference Library 인덱싱 CLI — Phase 3-T3.1.

URL/파일/직접 텍스트/배치 URL 파일을 받아 chunker + embedder + Chroma + ReferenceDocument
로 인덱싱한다. content_hash 중복은 자동 차단.

사용 예:
    # 단일 URL
    python scripts/ingest_references.py --tenant 1 --url https://example.com/article

    # 텍스트 파일 (.txt / .md)
    python scripts/ingest_references.py --tenant 1 --file ./docs/clinic_intro.md

    # 직접 텍스트
    python scripts/ingest_references.py --tenant 1 --text "백내장 관련 내용 ..."

    # URL 배치 — 한 줄에 한 URL
    python scripts/ingest_references.py --tenant 1 --batch ./urls.txt

환경변수:
    EMBEDDING_PROVIDER  stub|gemini|openai (기본 stub)
    GOOGLE_API_KEY      gemini 사용 시
    OPENAI_API_KEY      openai 사용 시
    DATABASE_URL        SQLAlchemy URL (기본 ./data/app.db)
    CHROMA_PERSIST_DIR  Chroma 저장 경로 (기본 ./data/chroma)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Windows 콘솔 한글 출력
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from src.reference.indexer import IndexResult, index_text, index_url  # noqa: E402
from src.storage.db import get_session_factory  # noqa: E402
from src.storage.models import ReferenceDocument, Tenant  # noqa: E402


_STATUS_ICON = {
    "indexed": "✅",
    "duplicate": "♻️",
    "empty": "⚠️",
    "fetch_failed": "❌",
    "embed_failed": "❌",
}


def _print_result(label: str, result: IndexResult) -> None:
    icon = _STATUS_ICON.get(result.status, "•")
    line = f"{icon} {label} — {result.status}"
    if result.document_id is not None:
        line += f" · doc_id={result.document_id}"
    if result.chunk_count:
        line += f" · chunks={result.chunk_count}"
    if result.error_msg:
        line += f" · {result.error_msg}"
    print(line)


def _list_tenant_documents(tenant_id: int) -> None:
    """현재 인덱싱 상태 출력."""
    SessionLocal = get_session_factory()
    with SessionLocal() as s:
        docs = (
            s.query(ReferenceDocument)
            .filter(ReferenceDocument.tenant_id == tenant_id)
            .order_by(ReferenceDocument.indexed_at.desc())
            .all()
        )
        if not docs:
            print(f"(tenant_id={tenant_id} 인덱스 비어있음)")
            return
        print(f"\n[tenant_id={tenant_id}] 인덱싱된 ReferenceDocument {len(docs)}건:")
        for d in docs:
            url = d.source_url or "(text)"
            ts = d.indexed_at.isoformat(timespec="seconds") if d.indexed_at else "-"
            print(f"  · #{d.id:<4} {url[:60]:<60} chunks={d.chunk_count} indexed_at={ts}")


def main() -> int:
    p = argparse.ArgumentParser(description="Reference Library 인덱싱 CLI")
    p.add_argument("--tenant", type=int, required=True, help="tenant_id (예: 1)")

    src = p.add_mutually_exclusive_group()
    src.add_argument("--url", help="단일 URL 인덱싱")
    src.add_argument("--file", help="텍스트 파일 인덱싱 (.txt / .md)")
    src.add_argument("--text", help="직접 텍스트 인덱싱")
    src.add_argument("--batch", help="URL 배치 파일 (한 줄 1 URL)")
    src.add_argument("--list", action="store_true", help="현재 인덱싱된 문서 목록 출력")

    p.add_argument("--max-tokens", type=int, default=500, help="청크당 max tokens (기본 500)")
    p.add_argument("--overlap", type=int, default=100, help="청크 overlap tokens (기본 100)")

    args = p.parse_args()

    SessionLocal = get_session_factory()
    with SessionLocal() as s:
        tenant = s.get(Tenant, args.tenant)
        if tenant is None:
            print(f"❌ tenant_id={args.tenant} 미존재. scripts/init_db.py 먼저 실행하세요.", file=sys.stderr)
            return 2

    if args.list or not (args.url or args.file or args.text or args.batch):
        _list_tenant_documents(args.tenant)
        if not (args.url or args.file or args.text or args.batch):
            return 0

    indexed = duplicate = failed = 0

    if args.url:
        with SessionLocal() as s:
            r = index_url(
                s, args.tenant, args.url,
                max_tokens=args.max_tokens, overlap_tokens=args.overlap,
            )
            _print_result(args.url, r)
            indexed += r.status == "indexed"
            duplicate += r.status == "duplicate"
            failed += r.status not in ("indexed", "duplicate")

    elif args.file:
        path = Path(args.file).expanduser().resolve()
        if not path.exists():
            print(f"❌ 파일 미존재: {path}", file=sys.stderr)
            return 2
        text = path.read_text(encoding="utf-8")
        with SessionLocal() as s:
            r = index_text(
                s, args.tenant, text,
                source_type="file",
                source_url=None,
                title=path.name,
                max_tokens=args.max_tokens, overlap_tokens=args.overlap,
            )
            _print_result(str(path), r)
            indexed += r.status == "indexed"
            duplicate += r.status == "duplicate"
            failed += r.status not in ("indexed", "duplicate")

    elif args.text:
        with SessionLocal() as s:
            r = index_text(
                s, args.tenant, args.text,
                source_type="text",
                max_tokens=args.max_tokens, overlap_tokens=args.overlap,
            )
            _print_result("(--text)", r)
            indexed += r.status == "indexed"
            duplicate += r.status == "duplicate"
            failed += r.status not in ("indexed", "duplicate")

    elif args.batch:
        path = Path(args.batch).expanduser().resolve()
        if not path.exists():
            print(f"❌ 배치 파일 미존재: {path}", file=sys.stderr)
            return 2
        urls = [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
        print(f"배치 인덱싱: {len(urls)} URLs")
        for u in urls:
            with SessionLocal() as s:
                r = index_url(
                    s, args.tenant, u,
                    max_tokens=args.max_tokens, overlap_tokens=args.overlap,
                )
                _print_result(u, r)
                indexed += r.status == "indexed"
                duplicate += r.status == "duplicate"
                failed += r.status not in ("indexed", "duplicate")

    print(f"\n요약: indexed={indexed} duplicate={duplicate} failed={failed}")
    if args.list or args.batch:
        _list_tenant_documents(args.tenant)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
