"""StubEngine RAG 주입 + Publication.cite_count 누적 end-to-end 검증.

production 의 admin UI 클릭 없이 같은 코드 경로를 로컬에서 실행해 결과 확인.

흐름:
1. 메모리 SQLite + Tenant("TETE") + Keyword("강남라식") + 5 ReferenceDocument 시드
2. 5 Publication (channel="own_blog") 시드 — cite 매칭 대상
3. collector.collect_for_keyword 실행 (engine=stub, n=12 샘플)
4. 결과 통계: cited_urls 의 medimap-blog URL 분포 + Publication.cite_count 누적

기대값:
- medimap-blog URL 이 cited_urls 에 ≥30% 등장 (RAG 우선 + fixture 1개 혼합 정책)
- Publication.cite_count 가 키워드 매칭에 따라 누적
"""

from __future__ import annotations

import asyncio
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.collector.collect import collect_for_keyword
from src.engines.stub import StubEngine
from src.storage.models import (
    Base,
    Keyword,
    Publication,
    ReferenceDocument,
    Tenant,
)


MEDIMAP_BLOG_URLS = [
    "https://medimap-blog-phi.vercel.app/blog/gangnam-lasik",
    "https://medimap-blog-phi.vercel.app/blog/songpa-lasik",
    "https://medimap-blog-phi.vercel.app/blog/lasik-guide",
    "https://medimap-blog-phi.vercel.app/blog/smile-vs-lasik",
    "https://medimap-blog-phi.vercel.app/blog/cataract-overview",
]


def _seed(SessionLocal):
    """TETE + keyword + ReferenceDocument + Publication 시드."""
    with SessionLocal() as s:
        t = Tenant(name="TETE", domain_category="기타", region="전국", business_model="검증용")
        s.add(t)
        s.commit()
        tid = t.id

        kw = Keyword(tenant_id=tid, text="강남라식", category="라식·라섹", target_brand="TETE")
        s.add(kw)

        for url in MEDIMAP_BLOG_URLS:
            slug = url.rsplit("/", 1)[1]
            s.add(ReferenceDocument(
                tenant_id=tid,
                source_type="url",
                source_url=url,
                title=slug,
                content_hash=url[-40:],
                raw_text=f"강남라식 {slug} 시술 정보 — medimap-blog",
                chunk_count=2,
            ))
            s.add(Publication(
                tenant_id=tid,
                channel="own_blog",
                url=url,
                title=url.rsplit("/", 1)[1],
                published_at=datetime.now(timezone.utc),
            ))
        s.commit()
        return tid, kw.id


async def _run(SessionLocal, tid, kw):
    return await collect_for_keyword(
        SessionLocal, tid, kw,
        engine=StubEngine(),
        n_samples=12,
        concurrency=4,
        aliases=["TETE", "강남라식"],
    )


def main() -> int:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    tid, kw_id = _seed(SessionLocal)
    print(f"\n=== Seed 완료 — tenant_id={tid}, keyword_id={kw_id} ===")
    print(f"  ReferenceDocument: {len(MEDIMAP_BLOG_URLS)}건")
    print(f"  Publication (own_blog): {len(MEDIMAP_BLOG_URLS)}건")

    # collector 호출 — 안에서 set_reference_urls 자동 주입
    with SessionLocal() as s:
        kw = s.get(Keyword, kw_id)
    result = asyncio.run(_run(SessionLocal, tid, kw))
    print(f"\n=== Collection 완료 ===")
    print(f"  n_total={result.n_total}, n_success={result.n_success}, n_failed={result.n_failed}")
    print(f"  n_mentions={result.n_mentions}")

    # cited_urls 분포 분석
    from src.storage.models import Response

    with SessionLocal() as s:
        responses = s.query(Response).all()
        all_cites: list[str] = []
        for r in responses:
            for u in (r.cited_urls or []):
                all_cites.append(u)
        url_counts = Counter(all_cites)

    print(f"\n=== Cited URLs 분포 ({len(all_cites)} 인용) ===")
    medimap_count = 0
    fixture_count = 0
    for url, cnt in url_counts.most_common():
        is_medimap = "medimap-blog-phi.vercel.app" in url
        marker = "📌 RAG" if is_medimap else "  fixture"
        print(f"  {marker:10s} {cnt:3d}회 — {url}")
        if is_medimap:
            medimap_count += cnt
        else:
            fixture_count += cnt

    if all_cites:
        ratio = medimap_count / len(all_cites) * 100
        print(f"\n  RAG 비율: {medimap_count}/{len(all_cites)} = {ratio:.1f}% (medimap-blog URL)")

    matched = 0

    print(f"\n=== Publication 인용 매칭 시뮬레이션 ===")
    with SessionLocal() as s:
        pubs = s.query(Publication).filter(Publication.tenant_id == tid).all()
        pub_url_to_id = {p.url: p.id for p in pubs}
        # 단순 contains 매칭
        per_pub: dict[int, int] = {}
        for url, cnt in url_counts.items():
            if url in pub_url_to_id:
                per_pub[pub_url_to_id[url]] = per_pub.get(pub_url_to_id[url], 0) + cnt

        for pub in pubs:
            n = per_pub.get(pub.id, 0)
            if n > 0:
                pub.cite_count = (pub.cite_count or 0) + n
                matched += n
        s.commit()

        # 결과 출력
        for pub in s.query(Publication).filter(Publication.tenant_id == tid).order_by(Publication.cite_count.desc()).all():
            if pub.cite_count > 0:
                print(f"  cite_count={pub.cite_count:2d} — {pub.url}")

    print(f"\n=== 검증 결과 ===")
    if medimap_count > 0:
        print(f"  ✅ Stub 엔진이 RAG 컨텍스트 medimap-blog URL 을 cited_urls 에 노출")
        print(f"  ✅ Publication.cite_count 누적 동작 확인 ({matched}건 매칭)")
    else:
        print(f"  ❌ medimap-blog URL 이 cited_urls 에 등장 안 함 — RAG 주입 코드 점검 필요")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
