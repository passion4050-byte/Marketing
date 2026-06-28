"""Round 72 (2026-06-22) — A/B 콘텐츠 테스트 생성 엔진.

하나의 tenant + keyword 로 변형 2개를 생성:
  - 변형 A = 베이스라인 (apply_insights=False) — 기존 스타일
  - 변형 B = 학습 인사이트 반영 (apply_insights=True) — '적용중' 인사이트 prompt 주입

둘 다 draft(status) 로 저장 → 기존 검수 큐 + 컴플라이언스 린트 안전망을 그대로 거침
(함정 T: 라이브 직행 금지). 그리고 ab_tests 레코드로 두 변형을 묶는다.

사용:
    python scripts/run_ab_test.py <tenant_id> "<keyword>" ["<hypothesis>"]
또는 cron 에서:
    from scripts.run_ab_test import run_ab_test
    run_ab_test(SessionLocal, tenant_id, keyword)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from src.content.generator import generate_blog_post  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402


def _applied_insight_ids(session, tenant_id: int) -> list[int]:
    # Round 81 — 변형 B 에 실제 주입되는 소스(learned_insights.applied, 같은 진료과)를 기록.
    #   기존엔 빈 applied_insights 테이블을 읽어 항상 [] 였음(split-brain 잔재). 이제 정확히 기록.
    rows = session.execute(
        text(
            """
            SELECT li.id FROM learned_insights li
            JOIN tenants t ON t.id = :t
            WHERE li.applied = true
              AND li.domain_category IS NOT NULL
              AND li.domain_category = t.domain_category
            """
        ),
        {"t": tenant_id},
    ).fetchall()
    return [r[0] for r in rows]


def _gen_variant(
    session_factory, tenant_id: int, keyword: str, apply_insights: bool,
    *, prefer: str | None = None,
) -> int | None:
    """변형 1개 생성 → saved content id 반환 (실패 시 None).

    Round 85 (2026-06-28) — `prefer` 인자 추가. None 이면 generator.py 가 tenant 기반
    자동 결정 (자사=anthropic / 파트너=gemini). 명시 시 그 provider 우선.
    """
    from src.content.llm import get_provider
    with session_factory() as s:
        provider = get_provider(prefer=prefer) if prefer else None
        r = generate_blog_post(
            s,
            tenant_id=tenant_id,
            keyword=keyword,
            save=True,
            apply_insights=apply_insights,
            provider=provider,
        )
        return getattr(r, "saved_id", None)


def run_ab_test(session_factory, tenant_id: int, keyword: str, hypothesis: str = "") -> dict:
    """A/B 변형 2개 생성 + ab_tests 레코드 생성. 결과 dict 반환.

    Round 85 (2026-06-28) — A/B variant 별 LLM 분기 (옵션 c):
      - 변형 A = apply_insights=False + prefer="gemini" (속도/비용 베이스라인)
      - 변형 B = apply_insights=True  + prefer="anthropic" (Claude 깊이 + 인사이트)
    가설: B(Claude+인사이트) 가 A(Gemini 베이스라인) 보다 AI 인용 더 받음.
    """
    a_id = _gen_variant(session_factory, tenant_id, keyword, apply_insights=False, prefer="gemini")
    b_id = _gen_variant(session_factory, tenant_id, keyword, apply_insights=True, prefer="anthropic")

    with session_factory() as s:
        insight_ids = _applied_insight_ids(s, tenant_id)
        row = s.execute(
            text(
                """
                INSERT INTO ab_tests
                    (tenant_id, keyword, hypothesis, applied_insight_ids,
                     variant_a_content_id, variant_b_content_id, status)
                VALUES (:t, :k, :h, :ins, :a, :b, 'running')
                RETURNING id
                """
            ),
            {
                "t": tenant_id,
                "k": keyword,
                "h": hypothesis or None,
                "ins": json.dumps(insight_ids),
                "a": a_id,
                "b": b_id,
            },
        ).fetchone()
        test_id = row[0] if row else None
        if test_id is not None:
            if a_id:
                s.execute(
                    text("UPDATE generated_contents SET ab_test_id = :tid, ab_variant = 'A' WHERE id = :cid"),
                    {"tid": test_id, "cid": a_id},
                )
            if b_id:
                s.execute(
                    text("UPDATE generated_contents SET ab_test_id = :tid, ab_variant = 'B' WHERE id = :cid"),
                    {"tid": test_id, "cid": b_id},
                )
        s.commit()

    return {
        "test_id": test_id,
        "variant_a_content_id": a_id,
        "variant_b_content_id": b_id,
        "applied_insight_ids": insight_ids,
        "note": "두 변형은 draft(검수 큐)로 저장됨 — 운영자 승인 후 발행.",
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(
            'usage: python scripts/run_ab_test.py <tenant_id> "<keyword>" ["<hypothesis>"]',
            file=sys.stderr,
        )
        return 1
    tenant_id = int(sys.argv[1])
    keyword = sys.argv[2]
    hypothesis = sys.argv[3] if len(sys.argv) > 3 else ""
    result = run_ab_test(SessionLocal, tenant_id, keyword, hypothesis)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
