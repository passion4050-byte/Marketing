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
                   (SELECT max(started_at) FROM ab_tests a WHERE a.tenant_id = k.tenant_id) AS last_test
            FROM keywords k
            WHERE k.is_active = true
              AND k.tenant_id IN (
                    -- Round 81: UI 토글이 쓰는 learned_insights.applied 를 직접 읽음.
                    -- (기존엔 applied_insights 테이블을 봤으나 UI 와 desync — split-brain 버그)
                    SELECT DISTINCT tenant_id FROM learned_insights
                    WHERE applied = true AND tenant_id IS NOT NULL
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
    return rows


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
