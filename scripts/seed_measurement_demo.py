"""Phase 5-T3.3 — 측정 데모 시드 CLI.

지정된 tenant + keyword 에 대해 14일치 더미 Query/Response/Mention 을 생성한다.
패턴: 7일 안정 (mention share ~ 0.3) → 7일 증가 (0.4 → 0.85). Mann-Kendall 이 명백히
significant 가 되도록.

사용 예:
    python scripts/seed_measurement_demo.py --tenant 1 --keyword "강남 라식 잘하는 곳"

기존 keyword 가 없으면 새로 만듦. 같은 날 동일 sample 이 이미 있으면 추가 생성.
StubEngine 견본 응답을 그대로 사용 — 멘션 추출이 정상 동작.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

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


def main() -> int:
    p = argparse.ArgumentParser(description="측정 데모 시드 — 14일치 더미 데이터")
    p.add_argument("--tenant", type=int, required=True, help="tenant_id (예: 1)")
    p.add_argument("--keyword", required=True, help="키워드 (없으면 생성)")
    p.add_argument("--brand", default="", help="타겟 브랜드 (비우면 tenant 이름)")
    p.add_argument("--days", type=int, default=14, help="총 일 수 (기본 14)")
    p.add_argument("--samples-per-day", type=int, default=10, help="일별 샘플 수")
    args = p.parse_args()

    from src.engines import get_engine
    from src.parser.mentions import extract_mentions
    from src.storage.db import get_session_factory
    from src.storage.models import (
        Keyword,
        LlmCallLog,
        Mention,
        Query,
        Response,
        Tenant,
    )

    SessionLocal = get_session_factory()
    engine_obj = get_engine("stub")

    with SessionLocal() as s:
        tenant = s.get(Tenant, args.tenant)
        if tenant is None:
            print(f"❌ tenant_id={args.tenant} 미존재. scripts/init_db.py 먼저 실행.")
            return 2
        target_brand = (args.brand or tenant.name).strip()

        kw = (
            s.query(Keyword)
            .filter(Keyword.tenant_id == args.tenant, Keyword.text == args.keyword)
            .first()
        )
        if kw is None:
            kw = Keyword(
                tenant_id=args.tenant, text=args.keyword,
                target_brand=target_brand, is_active=True,
            )
            s.add(kw)
            s.commit()
            print(f"➕ 키워드 생성: id={kw.id} text={args.keyword}")
        keyword_id = kw.id

    rng = random.Random(42)  # 결정론
    now = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
    sample_idx_global = 0

    inserted = {"queries": 0, "responses": 0, "mentions": 0}

    for day_offset in range(args.days):
        d = now - timedelta(days=args.days - 1 - day_offset)
        # share 패턴: 7일 안정(0.3) → 7일 증가(0.4..0.85)
        if day_offset < 7:
            target_share = 0.3
        else:
            t = (day_offset - 7) / max(1, args.days - 8)
            target_share = 0.4 + t * 0.45  # 0.4 → 0.85

        for sidx in range(args.samples_per_day):
            sample_idx_global += 1
            include_target = rng.random() < target_share
            prompt = f"키워드: {args.keyword}\nsample_index: {sample_idx_global}"
            engine_resp = asyncio.run(engine_obj.query(prompt))
            text = engine_resp.text
            # 더미 데이터에서도 share 패턴이 보이도록 target 미포함 응답은 brand 부분 치환
            if not include_target:
                text = text.replace(target_brand, "기타 안과")

            with SessionLocal() as s:
                q = Query(
                    tenant_id=args.tenant,
                    keyword_id=keyword_id,
                    engine="stub",
                    prompt=prompt,
                    sample_index=sample_idx_global,
                    cost_usd=0.0,
                    requested_at=d,
                )
                s.add(q)
                s.flush()
                r = Response(
                    query_id=q.id,
                    raw_text=text,
                    cited_urls=engine_resp.cited_urls or [],
                    latency_ms=engine_resp.latency_ms,
                    created_at=d,
                )
                s.add(r)
                s.flush()

                mentions_found = extract_mentions(text, target_brand=target_brand)
                for em in mentions_found:
                    s.add(Mention(
                        response_id=r.id, tenant_id=args.tenant,
                        brand=em.brand, is_target=em.is_target,
                        is_competitor=em.is_competitor,
                        position=em.position, weight=em.weight,
                        sentiment="negative" if em.is_negative else None,
                        context_snippet=em.context_snippet, created_at=d,
                    ))
                    inserted["mentions"] += 1

                s.add(LlmCallLog(
                    tenant_id=args.tenant, provider="stub", model="stub",
                    channel="measurement", keyword=args.keyword,
                    input_tokens=0, output_tokens=0, cost_usd=0.0,
                    status="success", called_at=d,
                ))
                s.commit()
                inserted["queries"] += 1
                inserted["responses"] += 1

        print(f"📅 {d.date().isoformat()}  share≈{target_share:.2f}  +{args.samples_per_day} samples")

    print(
        f"\n✅ 시드 완료 — tenant={args.tenant} keyword='{args.keyword}' "
        f"queries={inserted['queries']} responses={inserted['responses']} "
        f"mentions={inserted['mentions']}"
    )
    print("📡 측정 탭 → 키워드별 시계열 섹션에서 확인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
