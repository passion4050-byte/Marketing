"""Production Supabase 직결 — TETE + 강남라식 keyword 로 stub 엔진 수집 실행.

blogkey 측정 탭의 🔄 수집 실행 버튼과 동일한 코드 경로.
collector 가 자동으로 ReferenceDocument 를 stub 엔진에 set_reference_urls 주입 →
cited_urls 에 medimap-blog URL 이 노출됨.

사용법
    DATABASE_URL="postgresql://..." python scripts/run_production_collection.py
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.collector.collect import collect_for_keyword
from src.engines.stub import StubEngine
from src.storage.models import Keyword, Response, Tenant


N_SAMPLES = 12
TARGET_TENANT = "TETE"
TARGET_KEYWORD = "강남라식"


def _mask_dsn(dsn: str) -> str:
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", dsn)


def main() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn or not dsn.startswith(("postgresql://", "postgres://")):
        print("ERROR: production Postgres DATABASE_URL 필요")
        return 1
    print(f"Connecting to: {_mask_dsn(dsn)}")

    engine = create_engine(dsn, pool_pre_ping=True, future=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with SessionLocal() as s:
        t = s.query(Tenant).filter(Tenant.name == TARGET_TENANT).first()
        if t is None:
            print(f"ERROR: 테넌트 '{TARGET_TENANT}' 미존재")
            return 1
        tid = t.id
        kw = (
            s.query(Keyword)
            .filter(Keyword.tenant_id == tid, Keyword.text == TARGET_KEYWORD)
            .first()
        )
        if kw is None:
            print(f"ERROR: 키워드 '{TARGET_KEYWORD}' 미존재 (TETE 의 측정 탭에서 등록 필요)")
            return 1
        kw_id = kw.id
        print(f"TETE 발견 — tenant_id={tid}, keyword_id={kw_id} ('{TARGET_KEYWORD}')")

        # 기존 Response 개수
        prev_responses = s.query(Response).count()
        print(f"기존 Response 행 수 (전체): {prev_responses}")

    # 수집 실행
    print(f"\nCollecting {N_SAMPLES} samples (engine=stub, RAG 자동 주입)...")
    with SessionLocal() as s:
        kw_obj = s.get(Keyword, kw_id)
    result = asyncio.run(
        collect_for_keyword(
            SessionLocal, tid, kw_obj,
            engine=StubEngine(),
            n_samples=N_SAMPLES,
            concurrency=3,
            aliases=["TETE"],
        )
    )
    print(f"  n_total={result.n_total}, n_success={result.n_success}, n_failed={result.n_failed}")
    print(f"  n_mentions={result.n_mentions}")
    if result.error_msg:
        print(f"  error_msg={result.error_msg}")

    # 신규 Response 의 cited_urls 분포
    with SessionLocal() as s:
        # 가장 최근 N_SAMPLES 개 Response (방금 추가된 것들)
        recent = (
            s.query(Response)
            .order_by(Response.id.desc())
            .limit(N_SAMPLES)
            .all()
        )
        all_cites: list[str] = []
        for r in recent:
            for u in (r.cited_urls or []):
                all_cites.append(u)

    counts = Counter(all_cites)
    print(f"\n=== 신규 {N_SAMPLES} 샘플의 cited_urls 분포 (총 {len(all_cites)} 인용) ===")
    medimap_count = 0
    for url, cnt in counts.most_common():
        is_medimap = ("wecircle.co.kr" in url) or ("medimap-blog-phi.vercel.app" in url)
        marker = "📌 RAG  " if is_medimap else "  fixture"
        print(f"  {marker} {cnt:3d}회 — {url}")
        if is_medimap:
            medimap_count += cnt

    if all_cites:
        ratio = medimap_count / len(all_cites) * 100
        print(f"\n  RAG 비율: {medimap_count}/{len(all_cites)} = {ratio:.1f}%")
        if medimap_count > 0:
            print("\n  ✅ stub 엔진이 RAG 컨텍스트의 medimap-blog URL 을 cited_urls 에 노출")
        else:
            print("\n  ❌ medimap-blog URL 미노출 — set_reference_urls 주입 점검 필요")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
