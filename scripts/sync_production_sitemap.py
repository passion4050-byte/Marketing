"""Production Supabase 직결 — medimap-blog sitemap → TETE ReferenceDocument 동기화.

admin UI 의 🔗 블로그 동기화 와 동일한 코드 경로를 CLI 로 실행. OPENAI_API_KEY
의존성을 피하기 위해 임베딩/청킹은 생략하고 ReferenceDocument 만 생성 — stub
엔진의 RAG 주입은 source_url 만 읽으므로 충분.

사용법
    DATABASE_URL="postgresql://..." python scripts/sync_production_sitemap.py

환경변수 미설정 시 안전하게 종료. 비밀번호는 출력에 절대 노출 X.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.storage.models import ReferenceDocument, Tenant


SITEMAP_URL = "https://medimap-blog-phi.vercel.app/sitemap.xml"
TARGET_TENANT_NAME = "TETE"


def _mask_dsn(dsn: str) -> str:
    """비밀번호 마스킹. user:***@host:port/db 형태로."""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", dsn)


def _parse_sitemap(url: str) -> list[str]:
    with httpx.Client(timeout=20.0, follow_redirects=True) as c:
        r = c.get(url)
        r.raise_for_status()
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", r.text)


def _fetch_body(url: str) -> str:
    """글 본문 fetch — HTML 그대로 (stub RAG 는 source_url 만 사용하므로 충분)."""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; medimap-bot)"}
    with httpx.Client(timeout=30.0, follow_redirects=True, headers=headers) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.text


def main() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: DATABASE_URL 환경변수 미설정")
        return 1
    if not dsn.startswith(("postgresql://", "postgres://")):
        print(f"ERROR: production Postgres DSN 이어야 함 — 현재: {_mask_dsn(dsn)}")
        return 1
    print(f"Connecting to: {_mask_dsn(dsn)}")

    engine = create_engine(dsn, pool_pre_ping=True, future=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    # TETE 찾기
    with SessionLocal() as s:
        tete = s.query(Tenant).filter(Tenant.name == TARGET_TENANT_NAME).first()
        if tete is None:
            print(f"ERROR: 테넌트 '{TARGET_TENANT_NAME}' 미존재 — 어드민에서 먼저 생성")
            return 1
        tid = tete.id
        print(f"TETE 테넌트 발견 — id={tid}")

    # sitemap parse
    print(f"\nFetching sitemap: {SITEMAP_URL}")
    try:
        all_urls = _parse_sitemap(SITEMAP_URL)
    except Exception as e:
        print(f"ERROR: sitemap fetch 실패 — {e}")
        return 1
    blog_urls = [
        u for u in all_urls
        if "/blog/" in u and not u.rstrip("/").endswith("/blog")
    ]
    print(f"  Total URLs: {len(all_urls)}")
    print(f"  Blog post URLs: {len(blog_urls)}")
    for u in blog_urls:
        print(f"    - {u}")

    # 각 URL ingest
    print(f"\nIngesting to ReferenceDocument (tenant_id={tid})...")
    ingested = 0
    skipped = 0
    failed = 0
    for url in blog_urls:
        try:
            body = _fetch_body(url)
        except Exception as e:
            print(f"  ❌ FETCH FAIL {url} — {type(e).__name__}: {str(e)[:80]}")
            failed += 1
            continue

        content_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        with SessionLocal() as s:
            existing = s.query(ReferenceDocument).filter(
                ReferenceDocument.tenant_id == tid,
                ReferenceDocument.content_hash == content_hash,
            ).first()
            if existing is not None:
                print(f"  ⏭️  SKIP   {url} (already indexed, doc_id={existing.id})")
                skipped += 1
                continue

            slug = url.rsplit("/", 1)[-1]
            doc = ReferenceDocument(
                tenant_id=tid,
                source_type="url",
                source_url=url,
                title=slug,
                content_hash=content_hash,
                raw_text=body[:200000],  # 200KB cap
                chunk_count=0,  # stub RAG 는 chunks 불필요
            )
            s.add(doc)
            s.commit()
            print(f"  ✅ INGEST {url} (doc_id={doc.id})")
            ingested += 1

    print(f"\n=== 결과 ===")
    print(f"  ingested={ingested}, skipped={skipped}, failed={failed}")

    # 현재 TETE 의 ReferenceDocument 총 개수 + URL 리스트
    with SessionLocal() as s:
        all_docs = s.query(ReferenceDocument).filter(
            ReferenceDocument.tenant_id == tid
        ).all()
        print(f"\n  TETE 의 ReferenceDocument 총: {len(all_docs)} 건")
        for d in all_docs:
            print(f"    [#{d.id}] {d.source_url or '(no url)'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
