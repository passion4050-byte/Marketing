"""Round 73 (2026-06-22) — A/B 테스트 측정 귀속 + 자동 분석 에이전트.

status='running' 인 ab_tests 마다:
  - 변형 A/B 콘텐츠의 slug → 블로그 URL (/blog/{slug}).
  - responses.source_domains(jsonb) 의 final_url 에 그 slug 가 등장한 횟수 = 변형별 AI 인용 수.
  - ab_tests.variant_a_citations / variant_b_citations / last_measured_at 갱신.
  - 충분한 표본(MIN_TOTAL) + 명확한 차이(WIN_RATIO)면 winner + status='concluded'.

GitHub Actions 일일 cron (.github/workflows/ab-analysis.yml) 으로 실행.
결과는 수 주~수개월 누적돼야 유의미 — 데이터 한계지 코드 한계 아님.

사용: DATABASE_URL=... python scripts/run_ab_analysis.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from src.storage.db import SessionLocal  # noqa: E402

LOOKBACK_DAYS = 90
MIN_TOTAL_CITATIONS = 5  # 승자 판정 최소 표본
WIN_RATIO = 1.5          # 한쪽이 1.5배 이상이면 승자


def _slug(session, content_id) -> str | None:
    if not content_id:
        return None
    row = session.execute(
        text("SELECT slug FROM generated_contents WHERE id = :id"),
        {"id": content_id},
    ).fetchone()
    return row[0] if row and row[0] else None


def _count_citations(session, slug: str | None) -> int:
    """변형 콘텐츠(slug)가 AI 응답에 출처로 인용된 횟수.

    Round 138 (B 고도화) — 기존 버그: `%/blog/{slug}%` 만 매칭 → 파트너 콘텐츠
    (`/with-partners/{cat}/{partner}/{slug}`) URL 은 영원히 0 으로 샘. 또 source_domains
    만 보고 cited_urls 는 무시.
    수정: 경로 접두사 무관하게 slug 를 source_domains + cited_urls 양쪽에서 매칭.
    (slug 는 고유값이라 `%{slug}%` 오탐 위험 낮음.)
    """
    if not slug:
        return 0
    row = session.execute(
        text(
            "SELECT count(*) FROM responses r "
            "JOIN queries q ON q.id = r.query_id "
            "WHERE q.engine <> 'stub' "
            "AND r.created_at >= now() - make_interval(days => :days) "
            "AND (r.source_domains::text ILIKE :pat OR r.cited_urls::text ILIKE :pat)"
        ),
        {"days": LOOKBACK_DAYS, "pat": f"%{slug}%"},
    ).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def analyze(session_factory) -> dict:
    summary = {"tests": 0, "concluded": 0, "details": []}
    with session_factory() as s:
        tests = s.execute(
            text(
                "SELECT id, variant_a_content_id, variant_b_content_id "
                "FROM ab_tests WHERE status = 'running'"
            )
        ).fetchall()

    for tid, a_id, b_id in tests:
        with session_factory() as s:
            a_slug = _slug(s, a_id)
            b_slug = _slug(s, b_id)
            a_cit = _count_citations(s, a_slug)
            b_cit = _count_citations(s, b_slug)

            winner: str | None = None
            status = "running"
            total = a_cit + b_cit
            if total >= MIN_TOTAL_CITATIONS:
                if a_cit > b_cit and a_cit >= b_cit * WIN_RATIO:
                    winner, status = "A", "concluded"
                elif b_cit > a_cit and b_cit >= a_cit * WIN_RATIO:
                    winner, status = "B", "concluded"

            s.execute(
                text(
                    "UPDATE ab_tests SET "
                    "variant_a_citations = :a, variant_b_citations = :b, "
                    "last_measured_at = now(), status = :st, winner = :w, "
                    "concluded_at = CASE WHEN :st = 'concluded' THEN now() ELSE concluded_at END "
                    "WHERE id = :id"
                ),
                {"a": a_cit, "b": b_cit, "st": status, "w": winner, "id": tid},
            )
            s.commit()

        summary["tests"] += 1
        if status == "concluded":
            summary["concluded"] += 1
        summary["details"].append(
            {"test_id": tid, "a_citations": a_cit, "b_citations": b_cit, "winner": winner}
        )
    return summary


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1
    result = analyze(SessionLocal)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
