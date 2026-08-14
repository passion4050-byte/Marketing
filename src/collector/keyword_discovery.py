"""Round 145 (2026-08-14) — 키워드 자동 발굴 (자동화 루프의 마지막 미구현 조각).

무엇:
    AI 가 실제로 인용하는 '경쟁사 URL 의 주제(슬러그)'에서 키워드를 자동 발굴해
    keywords 풀에 추가한다. "측정 → 학습 → A/B → 발행 → 인용·클릭 측정" 루프의
    맨 앞(키워드 발굴)을 닫는다. 지금까지 키워드는 전부 수동 시딩이었다.

신호 정의 (실데이터 검증 완료 — 2026-08-14 프로토타입 SQL):
    최근 30일 responses.source_domains 에서 경쟁사(is_self=false) final_url 의
    마지막 경로 세그먼트(슬러그)가
      - 영문 3단어 이상(주제형 슬러그) 이고
      - 서로 다른 도메인 2곳 이상에서 합계 3회 이상 인용됐으면
    → "AI 가 답을 만들 때 실제로 참조하는 주제 수요" 로 판정, 슬러그를 공백 치환해
    키워드 후보로 삼는다. (예: top-10-skin-clinics-in-seoul → top 10 skin clinics in seoul)

가드레일 (비용·품질):
    - v1 은 en 만 (검증된 신호가 en. ja/zh 슬러그도 영문이라 언어 오염 위험 → 추후).
    - 테넌트당 1회 실행에 최대 MAX_NEW_PER_TENANT(2)개.
    - 테넌트 활성 키워드 총량 MAX_ACTIVE_KW(30) 도달 시 스킵 (측정 비용 상한).
    - UNIQUE(tenant_id,text,purpose) ON CONFLICT DO NOTHING — 중복 무해.
    - 플랫폼(유튜브·위키 등) 도메인 제외.
    - category/target_brand 는 해당 테넌트 기존 해외 own 키워드에서 상속.

호출: scheduler.daily_auto_content_job 시작부에서 try/except 로 (실패해도 발행 진행).
"""
from __future__ import annotations

import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)

MAX_NEW_PER_TENANT = 2
MAX_ACTIVE_KW = 30
MIN_CITES = 3
MIN_DOMAINS = 2

# 경쟁 '병원 콘텐츠' 가 아닌 일반 플랫폼 — 슬러그가 주제형이어도 제외.
_PLATFORM_DOMS = (
    "youtube.com", "google.com", "wikipedia.org", "namu.wiki", "reddit.com",
    "tripadvisor.com", "facebook.com", "instagram.com", "tiktok.com",
    "naver.com", "daum.net", "tistory.com",
)


def discover_keywords_from_citations(session_factory) -> dict:
    """경쟁사 인용 슬러그 → 키워드 자동 발굴. {candidates, inserted} 요약 반환."""
    summary = {"candidates": 0, "inserted": 0}
    dom_not_like = " AND ".join(
        f"dom NOT LIKE '%%{d}%%'" for d in _PLATFORM_DOMS
    )
    sql = f"""
    WITH cite AS (
      SELECT q.tenant_id, k.lang,
             lower(regexp_replace((d->>'final_url'), '^.*/([^/?#]+)/?([?#].*)?$', '\\1')) AS slug,
             lower(regexp_replace(d->>'domain', '^www\\.', '')) AS dom
      FROM responses r
      JOIN queries q ON q.id = r.query_id
      JOIN keywords k ON k.id = q.keyword_id
      , jsonb_array_elements(r.source_domains) d
      WHERE r.created_at >= now() - interval '30 days'
        AND (d->>'is_self') = 'false'
        AND k.market = 'overseas'
        AND k.lang = 'en'
        AND d->>'final_url' IS NOT NULL
    ),
    cand AS (
      SELECT tenant_id, lang, replace(slug, '-', ' ') AS kw_text,
             count(*) AS cites, count(DISTINCT dom) AS doms,
             row_number() OVER (PARTITION BY tenant_id ORDER BY count(*) DESC) AS rn
      FROM cite
      WHERE slug ~ '^[a-z0-9]+(-[a-z0-9]+){{2,}}$'
        AND {dom_not_like}
        AND NOT EXISTS (
          SELECT 1 FROM keywords k2
          WHERE k2.tenant_id = cite.tenant_id AND k2.text = replace(cite.slug, '-', ' ')
        )
      GROUP BY tenant_id, lang, slug
      HAVING count(*) >= {MIN_CITES} AND count(DISTINCT dom) >= {MIN_DOMAINS}
    ),
    gated AS (
      SELECT c.* FROM cand c
      WHERE c.rn <= {MAX_NEW_PER_TENANT}
        AND (SELECT count(*) FROM keywords ka
             WHERE ka.tenant_id = c.tenant_id AND ka.is_active) < {MAX_ACTIVE_KW}
        AND EXISTS (SELECT 1 FROM tenant_products tp
                    WHERE tp.tenant_id = c.tenant_id AND tp.market = 'overseas'
                      AND tp.lang = c.lang AND tp.status = 'active')
    )
    INSERT INTO keywords (tenant_id, text, category, target_brand, is_active,
                          purpose, is_saas_marketing, market, lang)
    SELECT g.tenant_id, g.kw_text,
           COALESCE((SELECT k3.category FROM keywords k3
                     WHERE k3.tenant_id = g.tenant_id AND k3.market = 'overseas'
                       AND k3.purpose = 'own' AND k3.category IS NOT NULL
                     ORDER BY k3.id LIMIT 1), 'discovered'),
           COALESCE((SELECT k4.target_brand FROM keywords k4
                     WHERE k4.tenant_id = g.tenant_id AND k4.market = 'overseas'
                       AND k4.purpose = 'own' AND k4.target_brand IS NOT NULL
                     ORDER BY k4.id LIMIT 1),
                    (SELECT t.name FROM tenants t WHERE t.id = g.tenant_id)),
           true, 'own', false, 'overseas', g.lang
    FROM gated g
    ON CONFLICT DO NOTHING
    RETURNING tenant_id, text
    """
    try:
        with session_factory() as s:
            rows = s.execute(text(sql)).fetchall()
            s.commit()
        summary["inserted"] = len(rows)
        for r in rows:
            logger.info(
                "keyword_discovery.inserted tenant=%s keyword=%r", r[0], r[1]
            )
        if not rows:
            logger.info("keyword_discovery.no_new_candidates")
    except Exception as e:  # noqa: BLE001 — 발굴 실패가 발행을 막으면 안 됨
        logger.warning("keyword_discovery.failed: %s", e)
    return summary
