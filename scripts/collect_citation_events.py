"""Round 180 (2026-08-30) — AI 인용 이벤트 수집 (제품 축 전환의 계기판).

배경:
    제품을 "월 N편 발행"에서 "키워드 N개 상위 진입 + AI 인용 증명"으로 바꾼다.
    그러려면 인용을 편당·키워드당·아키타입당으로 세는 정본이 필요하다.
    지금까지는 responses.source_domains(jsonb)를 매번 스캔해야 해서 집계가 사실상
    불가능했고, 그래서 "무엇이 인용을 만드는가"를 아무도 몰랐다.

실측 근거 (이 스크립트를 만든 이유):
    전 기간 wecircle.co.kr 인용 6건 중 4건이 **단 한 편** —
    /with-partners/hair/vandsmosigner/gangnam-hair-transplant-recovery-6month-guide
    (GSC 3위·18노출). 나머지 369편(평균 17위)은 0건.
    → 인용은 랭킹의 함수. 그리고 6건 전부 gemini(구글 검색 그라운딩).

멱등: UNIQUE(response_id, cited_url) + ON CONFLICT DO NOTHING.
실행: python scripts/collect_citation_events.py   (환경변수 DAYS 로 소급 기간, 기본 30)
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("citation-events")

SELF_HOSTS = ("wecircle.co.kr",)

INSERT_SQL = """
WITH src AS (
  SELECT r.id                AS response_id,
         r.created_at        AS occurred_at,
         q.engine            AS engine,
         k.tenant_id         AS tenant_id,
         k.id                AS keyword_id,
         k.text              AS keyword_text,
         COALESCE(k.lang,'ko') AS lang,
         COALESCE(x->>'final_url', x->>'domain') AS cited_url
  FROM responses r
  JOIN queries  q ON q.id = r.query_id
  JOIN keywords k ON k.id = q.keyword_id,
  LATERAL jsonb_array_elements(COALESCE(r.source_domains, '[]'::jsonb)) x
  WHERE r.created_at >= now() - make_interval(days => :days)
    AND (
      COALESCE(x->>'final_url','') ILIKE '%wecircle.co.kr%'
      OR COALESCE(x->>'domain','') ILIKE '%wecircle.co.kr%'
    )
), resolved AS (
  SELECT s.*,
         gc.id            AS content_id,
         gc.structure_type AS structure_type
  FROM src s
  LEFT JOIN LATERAL (
    SELECT g.id, g.structure_type
    FROM generated_contents g
    WHERE g.slug IS NOT NULL
      AND g.slug <> ''
      AND s.cited_url ILIKE '%/' || g.slug
    ORDER BY (g.status = 'published') DESC, g.id DESC
    LIMIT 1
  ) gc ON true
)
INSERT INTO citation_events
  (response_id, occurred_at, engine, tenant_id, keyword_id, keyword_text, lang,
   cited_url, content_id, structure_type)
SELECT response_id, occurred_at, engine, tenant_id, keyword_id, keyword_text, lang,
       cited_url, content_id, structure_type
FROM resolved
ON CONFLICT (response_id, cited_url) DO NOTHING
"""

SUMMARY_SQL = """
SELECT engine,
       count(*)                                   AS cites,
       count(DISTINCT keyword_id)                 AS keywords,
       count(*) FILTER (WHERE content_id IS NULL) AS unresolved
FROM citation_events
WHERE occurred_at >= now() - make_interval(days => :days)
GROUP BY 1 ORDER BY 2 DESC
"""


def main() -> int:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    days = int(os.environ.get("DAYS", "30") or "30")

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.begin() as conn:
        res = conn.execute(text(INSERT_SQL), {"days": days})
        inserted = res.rowcount if res.rowcount is not None else -1
    logger.info("신규 인용 이벤트: %s 건 (소급 %d일)", inserted, days)

    with engine.connect() as conn:
        rows = conn.execute(text(SUMMARY_SQL), {"days": days}).mappings().all()

    if not rows:
        logger.info("최근 %d일 인용 0건.", days)
    for r in rows:
        logger.info(
            "engine=%s cites=%d keywords=%d url_미해결=%d",
            r["engine"], r["cites"], r["keywords"], r["unresolved"],
        )

    # GitHub Actions job summary
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as fh:
            fh.write(f"## AI 인용 이벤트 (최근 {days}일)\n\n")
            fh.write(f"- 신규 수집: **{inserted}** 건\n\n")
            if rows:
                fh.write("| engine | 인용 | 키워드 | URL 미해결 |\n|---|---:|---:|---:|\n")
                for r in rows:
                    fh.write(
                        f"| {r['engine']} | {r['cites']} | {r['keywords']} | {r['unresolved']} |\n"
                    )
            else:
                fh.write("이 기간 인용 **0건**.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
