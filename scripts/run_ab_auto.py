"""Round 74 (2026-06-22) — 완전 자동 A/B 생성 트리거.

정책 (보수적 — 비용·검수 부담 관리):
  1. applied_insights 가 1개 이상 활성인 tenant 만 대상 (B 변형이 A 와 달라야 의미 있음).
  2. 그 tenant 의 활성 키워드 중, 아직 진행 중(pending/running) ab_test 가 없는 키워드를 후보로.
  3. 가장 오래 A/B 안 한 tenant 우선 (last ab_test 시각 ASC, 없으면 최우선) — 자연 rotation.
  4. 1회 실행당 MAX_NEW 개(기본 1), tenant 당 최대 1개 생성.

주간 cron(.github/workflows/ab-auto-generate.yml) 으로 실행.
생성된 변형 2개는 draft(검수 큐)로 저장 → 운영자 승인 후 발행 (함정 T 안전망 유지).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from scripts.run_ab_test import run_ab_test  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402

MAX_NEW = int(os.environ.get("AB_AUTO_MAX_NEW", "1"))


def _candidates(session):
    """적용 인사이트 있는 tenant × 진행 중 A/B 없는 활성 키워드. rotation 순 정렬."""
    rows = session.execute(
        text(
            """
            SELECT k.tenant_id, k.text AS keyword,
                   (SELECT max(started_at) FROM ab_tests a WHERE a.tenant_id = k.tenant_id) AS last_test,
                   tn.name AS tenant_name, tn.partner_slug
            FROM keywords k
            JOIN tenants tn ON tn.id = k.tenant_id
            WHERE k.is_active = true
              -- 🔴 Round 204 — 이 경로는 게이트가 하나도 없었다. 발행 대상 선택 경로는
              --   로테이션·타깃에 더해 **여기가 세 번째**다(CLAUDE.md "두 경로 모두에" 의 확장).
              --   실사고: 2026-09-08 모우림 `헤어라인교정`(purpose=competitor_landscape,
              --   content_eligible=false — R173 이 발행에서 뺀 헤드 키워드)이 이 경로로 발행됐다.
              AND COALESCE(k.purpose, 'own') = 'own'
              AND COALESCE(k.content_eligible, true) = true
              AND COALESCE(k.lang, 'ko') = 'ko'
              -- R174i — 어드민 일시정지 병원에 글을 내면 안 된다(fail-open: null 은 active).
              AND COALESCE(lower(tn.status), 'active') NOT IN ('paused', 'churned')
              AND k.tenant_id IN (
                    -- Round 81: UI 가 쓰는 learned_insights.applied + 같은 진료과(domain_category) 매칭.
                    -- (기존엔 빈 applied_insights 테이블을 봐서 split-brain. 또 tenant 단순매칭이면
                    --  같은 진료과 타 병원이 후보에서 빠짐 → 진료과 단위로 확장.)
                    SELECT t.id FROM tenants t
                    WHERE t.domain_category IN (
                            SELECT domain_category FROM learned_insights
                            WHERE applied = true AND domain_category IS NOT NULL
                          )
                  )
              AND NOT EXISTS (
                    SELECT 1 FROM ab_tests a
                    WHERE a.tenant_id = k.tenant_id
                      AND a.keyword = k.text
                      AND a.status IN ('pending', 'running')
                  )
            ORDER BY last_test ASC NULLS FIRST, k.tenant_id, k.id
            """
        )
    ).fetchall()
    # Round 204 — 브랜드명 질의("밝은눈안과강남")는 글과 무관하게 56~91% 등장한다.
    #   변형 A/B 로 차이를 볼 수 있는 곳은 비브랜드 질의뿐이다(6~14% 구간).
    #   규칙은 발행 로테이션·어드민 funnel RPC 와 같은 src/content/brand_tokens.py.
    from src.content.brand_tokens import brand_tokens, is_branded

    _tok_cache: dict[int, set[str]] = {}
    out = []
    for tenant_id, keyword, last_test, tenant_name, partner_slug in rows:
        if tenant_id not in _tok_cache:
            _tok_cache[tenant_id] = brand_tokens(tenant_name, partner_slug)
        if is_branded(keyword, _tok_cache[tenant_id]):
            continue
        out.append((tenant_id, keyword, last_test))
    return out


def run_auto(session_factory) -> dict:
    with session_factory() as s:
        cands = _candidates(s)

    created: list[dict] = []
    seen_tenants: set[int] = set()
    for tenant_id, keyword, _last in cands:
        if len(created) >= MAX_NEW:
            break
        if tenant_id in seen_tenants:  # tenant 당 1개 (다양성)
            continue
        seen_tenants.add(tenant_id)
        try:
            res = run_ab_test(
                session_factory,
                tenant_id,
                keyword,
                hypothesis="학습 인사이트 반영(B)이 기존 방식(A)보다 AI 인용을 더 받는다",
            )
            created.append({"tenant_id": tenant_id, "keyword": keyword, **res})
        except Exception as e:  # noqa: BLE001
            created.append({"tenant_id": tenant_id, "keyword": keyword, "error": str(e)})

    return {"candidates": len(cands), "created": len(created), "details": created}


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1
    result = run_auto(SessionLocal)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
