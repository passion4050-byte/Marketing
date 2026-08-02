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

import structlog  # noqa: E402
from sqlalchemy import text  # noqa: E402

from src.content.generator import generate_blog_post  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402

# 🔴 Round 144 (2026-08-02) — logger 미정의 버그.
#   109 행에서 logger.warning() 을 호출하는데 import 가 없어, 의료법 컴플라이언스
#   fail 분기(= 안전망이 실제로 발동하는 순간)에 진입하면 NameError 로
#   A/B 생성이 통째로 죽었음. s.commit() 은 먼저 실행되므로 DB 는 남고
#   ab_tests 레코드만 유실되는 형태.
logger = structlog.get_logger(__name__)


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
    *, prefer: str | None = None, variation_seed: int | None = None,
) -> int | None:
    """변형 1개 생성 → saved content id 반환 (실패 시 None).

    Round 85 (2026-06-28) — `prefer` 인자 추가. None 이면 generator.py 가 tenant 기반
    자동 결정 (자사=anthropic / 파트너=gemini). 명시 시 그 provider 우선.

    Round 86 (2026-06-28) — 함정 CV/CW 재발 방지: variant 생성 직후 partner tenant 면
    is_partner_content + partner_category 자동 태깅. 안 그러면 /blog 와 /with-partners
    둘 다 매칭 안 돼서 글 보기 404 (스마일-162 함정).
    """
    from src.content.llm import get_provider
    from src.collector.scheduler import _map_partner_category
    with session_factory() as s:
        # Round 144 — strict_prefer=True. provider 자체가 처치이므로 폴백 시 실험 중단.
        provider = get_provider(prefer=prefer, strict_prefer=True) if prefer else None
        r = generate_blog_post(
            s,
            tenant_id=tenant_id,
            keyword=keyword,
            save=True,
            apply_insights=apply_insights,
            provider=provider,
            variation_seed=variation_seed,
        )
        saved_id = getattr(r, "saved_id", None)
        if saved_id is None:
            return None
        # partner tenant 면 자동 태깅 (raw SQL — 함정 CW: ORM 미매핑 컬럼들)
        from src.storage.models import Tenant as _Tenant
        tenant = s.get(_Tenant, tenant_id)
        if tenant is not None:
            _ps = (getattr(tenant, "partner_slug", "") or "").strip().lower()
            _is_partner = bool(_ps) and _ps != "medimap-self"
            if _is_partner:
                _cat = _map_partner_category(getattr(tenant, "domain_category", None))
                if _cat:
                    s.execute(
                        text(
                            "UPDATE generated_contents SET "
                            "is_partner_content = true, "
                            "partner_category = COALESCE(NULLIF(partner_category, ''), :cat) "
                            "WHERE id = :id"
                        ),
                        {"cat": _cat, "id": saved_id},
                    )
                    s.commit()
        # Round 87 (2026-06-28) — 의료법 안전망 (compliance_status='fail' → status='draft' 강등).
        #   함정: A/B variant 발행 경로가 의료법 안전망 우회 → fail 글이 published 로 나감 → 라이브 노출.
        #   #162 (compliance='fail') 가 published 로 만들어진 사례 확인.
        _comp = s.execute(
            text("SELECT compliance_status, status FROM generated_contents WHERE id = :id"),
            {"id": saved_id},
        ).fetchone()
        if _comp and _comp[0] == "fail" and _comp[1] == "published":
            s.execute(
                text("UPDATE generated_contents SET status = 'draft' WHERE id = :id"),
                {"id": saved_id},
            )
            s.commit()
            logger.warning(
                "ab_test.compliance_fail_demoted",
                tenant_id=tenant_id, content_id=saved_id, keyword=keyword,
            )
        return saved_id


def run_ab_test(session_factory, tenant_id: int, keyword: str, hypothesis: str = "") -> dict:
    """A/B 변형 2개 생성 + ab_tests 레코드 생성. 결과 dict 반환.

    Round 85 (2026-06-28) — A/B variant 별 LLM 분기 (옵션 c):
      - 변형 A = apply_insights=False + prefer="gemini" (속도/비용 베이스라인)
      - 변형 B = apply_insights=True  + prefer="anthropic" (Claude 깊이 + 인사이트)
    가설: B(Claude+인사이트) 가 A(Gemini 베이스라인) 보다 AI 인용 더 받음.
    """
    # 🔴 Round 144 (2026-08-02) — 처치 유효성 확보.
    #   ① strict_prefer 로 provider 폴백 차단 (기존: B도 조용히 gemini → 처치 0% 적용)
    #   ② variation_seed 를 A/B 동일 값으로 고정.
    #      generator._build_variation_block() 이 random.choice 로 도입부·어조를
    #      매번 바꿔 주입하는데, 이 랜덤 교란이 처치보다 커서 표본 1쌍으로는
    #      원리적으로 효과 분리가 불가능했음.
    variation_seed = abs(hash(f"{tenant_id}:{keyword}")) % (2**31)
    a_id = _gen_variant(
        session_factory, tenant_id, keyword,
        apply_insights=False, prefer="gemini", variation_seed=variation_seed,
    )
    b_id = _gen_variant(
        session_factory, tenant_id, keyword,
        apply_insights=True, prefer="anthropic", variation_seed=variation_seed,
    )

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
