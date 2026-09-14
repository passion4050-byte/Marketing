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

# 🔴 Round 203 — Round 197 의 "구 브랜드 도메인" 추가는 **오진이었다. 되돌린다.**
#   medi-map.co.kr 은 우리 옛 도메인이 아니라 **전 직장 메디맵의 병원찾기 플랫폼**이다
#   (title "메디맵 | 잘하는 병원 찾기, 실시간 후기 & 시술 가격 비교", wecircle 로 리다이렉트 안 됨).
#   실측: 이 도메인으로 들어간 citation_events 14건이 **전부** /search?q=… · /hospital/view/… ·
#   /event?… · global.medi-map.co.kr — 우리 글은 0건. "자사 인용" 61건 중 23% 가 허수였다.
#   Round 180b(src/content/learned_pattern.py)가 이미 같은 결론을 냈는데 197 이 되살렸다.
#   어드민 domain_classifications 도 medi-map.co.kr = T4(의료 플랫폼)로 옳게 분류돼 있다.
SELF_HOSTS = ("wecircle.co.kr", "medimap-blog-phi.vercel.app")

# 🔴 Round 197 — 인용 출처가 **두 곳**이다. 하나만 읽으면 엔진 하나가 통째로 안 보인다.
#   ① source_domains — Gemini 전용. cited_urls 가 vertexaisearch 리다이렉트라
#      HTTP 로 따라가 최종 도메인을 넣어둔 것. 해석 배치가 돌아야 채워진다.
#   ② cited_urls     — Claude·OpenAI 는 **처음부터 실제 URL** 을 준다. 해석이 필요 없다.
#   기존 SQL 은 ① 만 읽었다. 그래서 Claude 가 우리를 인용한 4건(2026-08-23~09-02)이
#   citation_events 에 **한 건도 없었고**, "인용 9건 전부 Gemini" 라는 잘못된 결론이 나왔다.
#   → 둘을 UNION 한다. 같은 (response_id, cited_url) 은 ON CONFLICT 로 멱등.
INSERT_SQL = """
WITH self_hit AS (
  -- ① 해석된 source_domains (Gemini 리다이렉트 경로)
  SELECT r.id AS response_id, r.created_at AS occurred_at, q.engine, q.keyword_id,
         COALESCE(x->>'final_url', x->>'domain') AS cited_url
  FROM responses r
  JOIN queries q ON q.id = r.query_id,
  LATERAL jsonb_array_elements(COALESCE(r.source_domains, '[]'::jsonb)) x
  WHERE r.created_at >= now() - make_interval(days => :days)
    AND (COALESCE(x->>'final_url','') ~* :urlre OR COALESCE(x->>'domain','') ~* :domre)

  UNION

  -- ② 원본 cited_urls (Claude·OpenAI 는 실제 URL 을 직접 준다)
  SELECT r.id, r.created_at, q.engine, q.keyword_id, u AS cited_url
  FROM responses r
  JOIN queries q ON q.id = r.query_id,
  LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(r.cited_urls::jsonb) = 'array'
         THEN r.cited_urls::jsonb ELSE '[]'::jsonb END
  ) u
  WHERE r.created_at >= now() - make_interval(days => :days)
    AND u ~* :urlre
), src AS (
  SELECT h.response_id, h.occurred_at, h.engine,
         k.tenant_id, k.id AS keyword_id, k.text AS keyword_text,
         COALESCE(k.lang,'ko') AS lang, h.cited_url
  FROM self_hit h
  JOIN keywords k ON k.id = h.keyword_id
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


def host_patterns() -> dict[str, str]:
    """자사 호스트 판정 정규식 — **호스트 위치에 고정**한다 (Round 203).

    이전 패턴은 URL 어디에든 부분일치했다. 그러면 `https://other.com/?ref=wecircle.co.kr`
    같은 남의 URL 도 자사 인용이 된다. 서브도메인(geo.wecircle.co.kr 등)은 허용.
    """
    hosts = "|".join(h.replace(".", r"\.") for h in SELF_HOSTS)
    return {
        "urlre": rf"^https?://([a-z0-9-]+\.)*({hosts})([/?#:]|$)",
        "domre": rf"^([a-z0-9-]+\.)*({hosts})$",
    }


def main() -> int:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    days = int(os.environ.get("DAYS", "30") or "30")

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.begin() as conn:
        res = conn.execute(text(INSERT_SQL), {"days": days, **host_patterns()})
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
