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

    🔴 Round 146 (2026-08-15) — 한글 슬러그 percent-encoded 매칭 추가.
      A/B 7·8 의 변형 슬러그는 '라식-349' 류 한글인데, AI 가 인용한 URL 은 DB 에
      '%EB%9D%BC%EC%84%B9-385' 로 percent-encoded 저장된다 (경쟁사 인코딩 URL
      수집 실증). raw 한글 ILIKE 만으로는 **인용돼도 영원히 0** — 지표 측정
      자체가 불능이던 상태. quote(slug) 변형을 OR 로 추가한다.
      국내 발행의 64% 가 한글 슬러그라 이 매칭 없이는 A/B 판정이 성립 안 함.
    """
    if not slug:
        return 0
    from urllib.parse import quote as _urlquote

    encoded = _urlquote(slug, safe="-")  # '라식-349' → '%EB%9D%BC%EC%8B%9D-349'
    row = session.execute(
        text(
            "SELECT count(*) FROM responses r "
            "JOIN queries q ON q.id = r.query_id "
            "WHERE q.engine <> 'stub' "
            "AND r.created_at >= now() - make_interval(days => :days) "
            "AND (r.source_domains::text ILIKE :pat OR r.cited_urls::text ILIKE :pat "
            "     OR r.source_domains::text ILIKE :pat_enc OR r.cited_urls::text ILIKE :pat_enc)"
        ),
        {"days": LOOKBACK_DAYS, "pat": f"%{slug}%", "pat_enc": f"%{encoded}%"},
    ).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def _count_clicks(session, content_id) -> int:
    """Round 154 (배치 C2) — 변형 콘텐츠의 상담 클릭 수 (콘텐츠 shortlink 'p{id}').

    인용만으로는 표본이 희소해 A/B 가 수개월 무승부로 남는다(실측: 3연속 무효).
    클릭은 실제 전환 신호이자 훨씬 조기 관측 가능 — 판정 점수에 결합한다.
    """
    if not content_id:
        return 0
    row = session.execute(
        text(
            "SELECT count(*) FROM shortlink_clicks sc "
            "JOIN shortlinks sl ON sl.id = sc.shortlink_id "
            "WHERE sl.slug = :slug "
            "AND sc.clicked_at >= now() - make_interval(days => :days)"
        ),
        {"slug": f"p{content_id}", "days": LOOKBACK_DAYS},
    ).fetchone()
    return int(row[0]) if row and row[0] is not None else 0


def _archive_winner_pattern(session, test_id: int, content_id) -> bool:
    """Round 154 (배치 C5) — 승자 변형의 구조 패턴을 learned_insights 에 적립.

    concluded 되는 순간 승자 body 의 구조(H2/단어/표/리스트)를 스냅샷해
    같은 진료과 신규 생성 프롬프트에 자동 주입(applied=true — 로더가 즉시 소비).
    중복 방지: 같은 test_id 로 이미 적립돼 있으면 skip.
    """
    import re as _re

    if not content_id:
        return False
    dup = session.execute(
        text("SELECT 1 FROM learned_insights WHERE notes LIKE :pat LIMIT 1"),
        {"pat": f"AB_WINNER test={test_id}%"},
    ).fetchone()
    if dup:
        return False
    row = session.execute(
        text(
            "SELECT gc.body, gc.keyword_text, gc.slug, t.domain_category "
            "FROM generated_contents gc LEFT JOIN tenants t ON t.id = gc.tenant_id "
            "WHERE gc.id = :id"
        ),
        {"id": content_id},
    ).fetchone()
    if not row or not row[0]:
        return False
    body, keyword, slug, category = row[0], row[1] or "", row[2] or "", (row[3] or "").strip()
    if not category:
        return False  # category 없으면 주입 안 함 (Round 146 null 오염 규약)
    plain = _re.sub(r"<[^>]+>", " ", body)
    patterns = {
        "h2_count": len(_re.findall(r"<h2[\s>]", body, _re.IGNORECASE)),
        "word_count": len(plain.split()),
        "table_count": len(_re.findall(r"<table[\s>]", body, _re.IGNORECASE)),
        "ul_ol_count": len(_re.findall(r"<[uo]l[\s>]", body, _re.IGNORECASE)),
        "image_count": len(_re.findall(r"<img[\s>]", body, _re.IGNORECASE)),
    }
    import json as _json

    session.execute(
        text(
            "INSERT INTO learned_insights "
            "(source_url, source_domain, source_tier, domain_category, keyword, patterns, "
            " diagnosis, recommendations, notes, applied, applied_at) "
            "VALUES (:url, 'wecircle.co.kr', 'AB_WINNER', :cat, :kw, cast(:pat AS jsonb), "
            " :diag, :rec, :notes, true, now())"
        ),
        {
            "url": f"https://wecircle.co.kr/blog/{slug}",
            "cat": category,
            "kw": keyword[:120],
            "pat": _json.dumps({"scope": "ab_winner", "per_url": [patterns]}),
            "diag": "A/B 테스트 승자 변형 — 인용+클릭 결합 점수 우세. 구조를 동일 진료과에 재적용.",
            "rec": "✅ 승자 구조 반복 적용 (A/B 실측 검증됨)",
            "notes": f"AB_WINNER test={test_id} content={content_id}",
        },
    )
    return True


def analyze(session_factory) -> dict:
    summary = {"tests": 0, "concluded": 0, "winner_archived": 0, "details": []}
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
            # Round 154 (배치 C2) — 클릭 결합 점수: score = 인용 + 클릭.
            #   두 신호 모두 '성공'이며 클릭이 조기 신호. 임계값은 기존 유지.
            a_clk = _count_clicks(s, a_id)
            b_clk = _count_clicks(s, b_id)
            a_score = a_cit + a_clk
            b_score = b_cit + b_clk

            winner: str | None = None
            status = "running"
            total = a_score + b_score
            if total >= MIN_TOTAL_CITATIONS:
                if a_score > b_score and a_score >= b_score * WIN_RATIO:
                    winner, status = "A", "concluded"
                elif b_score > a_score and b_score >= a_score * WIN_RATIO:
                    winner, status = "B", "concluded"

            s.execute(
                text(
                    "UPDATE ab_tests SET "
                    "variant_a_citations = :a, variant_b_citations = :b, "
                    "variant_a_clicks = :ac, variant_b_clicks = :bc, "
                    "last_measured_at = now(), status = :st, winner = :w, "
                    "concluded_at = CASE WHEN :st = 'concluded' THEN now() ELSE concluded_at END "
                    "WHERE id = :id"
                ),
                {
                    "a": a_cit, "b": b_cit, "ac": a_clk, "bc": b_clk,
                    "st": status, "w": winner, "id": tid,
                },
            )
            # Round 154 (배치 C5) — 승자 패턴 적립 (같은 트랜잭션)
            if status == "concluded" and winner:
                win_id = a_id if winner == "A" else b_id
                try:
                    if _archive_winner_pattern(s, tid, win_id):
                        summary["winner_archived"] += 1
                except Exception as e:  # noqa: BLE001
                    print(f"WARN winner archive 실패 test={tid}: {e}", file=sys.stderr)
            s.commit()

        summary["tests"] += 1
        if status == "concluded":
            summary["concluded"] += 1
        summary["details"].append(
            {
                "test_id": tid,
                "a_citations": a_cit, "b_citations": b_cit,
                "a_clicks": a_clk, "b_clicks": b_clk,
                "winner": winner,
            }
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
