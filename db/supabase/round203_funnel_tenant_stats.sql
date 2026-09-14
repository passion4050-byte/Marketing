-- Round 203 (2026-09-14) — /admin/funnel 서버측 집계 RPC
--
-- 왜:
--   ① funnel/page.tsx 가 queries·mentions 를 supabase-js 로 통째로 끌어와 JS 로 셌다.
--      PostgREST max-rows(1,000) 에 **에러 없이 잘려** 30일 측정 질의 6,792건·멘션 4,853건이
--      각각 1,000건으로 표시됐다 (fetchAllRows.ts 주석의 Round 163 사고와 같은 꼴).
--   ② "우리 멘션" 이 브랜드명 질의("밝은눈안과강남", "위서클")를 포함해 영향력을 부풀렸다.
--      실측(2026-07~09): 브랜드 질의 등장률 56~91%, 비브랜드 질의 등장률 5.7~9.6% 로 **제자리**.
--      9월 등장률 상승(10%→14%)은 브랜드 질의 측정량이 주 35→280건으로 늘어난 **구성 효과**였다.
--      → 콘텐츠가 만드는 영향력은 비브랜드 등장률로만 보인다. 그래서 둘을 나눠 돌려준다.
--
-- 브랜드 판정 (keywords.text 에 tenant 브랜드 토큰이 포함되는가, 공백 무시·대소문자 무시):
--   토큰 = tenants.name 의 3글자 이상 단어 (일반명사·'…점' 지점표기 제외)
--        + 그 단어에서 의원/피부과/안과/병원 접미사를 뗀 형태(3글자 이상 남을 때만)
--        + partner_slug (3글자 이상, '-self' 제외)
--   🔴 CLAUDE.md "자동 생성 별칭에 일반명사가 새면 측정이 허수" — 3글자 하한과 일반명사
--      제외는 그 규칙을 따른 것. 새 tenant 를 추가하면 아래 검증 쿼리로 토큰을 확인할 것.
--
-- 반환: jsonb 배열, tenant 당 1행.

CREATE OR REPLACE FUNCTION public.funnel_tenant_stats(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH tok AS (
  SELECT t.id AS tenant_id, lower(w) AS token
  FROM tenants t, regexp_split_to_table(t.name, '\s+') w
  WHERE char_length(w) >= 3
    AND w !~ '점$'
    AND w NOT IN ('피부과','안과','의원','병원','치과','한의원','한방의원','성형외과','클리닉','한방병원')
  UNION
  -- Round 204 — 제거형에도 일반명사 제외. "성형외과"·"클리닉" 은 뗄 접미사가 없어 원형이 통과했다.
  --   규칙 정본: src/content/brand_tokens.py (tests/test_brand_tokens.py 가 SQL 과의 합의를 잠금)
  SELECT t.id, lower(regexp_replace(w, '(의원|피부과|안과|병원)$', ''))
  FROM tenants t, regexp_split_to_table(t.name, '\s+') w
  WHERE w !~ '점$'
    AND w NOT IN ('피부과','안과','의원','병원','치과','한의원','한방의원','성형외과','클리닉','한방병원')
    AND char_length(regexp_replace(w, '(의원|피부과|안과|병원)$', '')) >= 3
    AND regexp_replace(w, '(의원|피부과|안과|병원)$', '') NOT IN ('피부과','안과','의원','병원','치과','한의원','한방의원','성형외과','클리닉','한방병원')
  UNION
  SELECT t.id, lower(t.partner_slug)
  FROM tenants t
  WHERE t.partner_slug IS NOT NULL
    AND char_length(t.partner_slug) >= 3
    AND t.partner_slug !~ '-self$'
),
kw AS (
  SELECT k.id, k.tenant_id,
         EXISTS (
           SELECT 1 FROM tok
           WHERE tok.tenant_id = k.tenant_id
             AND position(tok.token IN lower(replace(k.text, ' ', ''))) > 0
         ) AS branded
  FROM keywords k
),
resp AS (
  SELECT q.tenant_id, r.id AS response_id, COALESCE(kw.branded, false) AS branded,
         EXISTS (SELECT 1 FROM mentions m WHERE m.response_id = r.id AND m.is_target) AS hit
  FROM queries q
  JOIN responses r ON r.query_id = q.id
  LEFT JOIN kw ON kw.id = q.keyword_id
  WHERE q.requested_at >= now() - make_interval(days => p_days)
    AND q.engine <> 'stub'
),
q_agg AS (
  SELECT tenant_id, count(*) AS queries
  FROM queries
  WHERE requested_at >= now() - make_interval(days => p_days)
    AND engine <> 'stub'
  GROUP BY 1
),
r_agg AS (
  SELECT tenant_id,
         count(*)                                        AS responses,
         count(*) FILTER (WHERE hit)                     AS hit_responses,
         count(*) FILTER (WHERE branded)                 AS branded_responses,
         count(*) FILTER (WHERE branded AND hit)         AS branded_hits,
         count(*) FILTER (WHERE NOT branded)             AS nonbranded_responses,
         count(*) FILTER (WHERE NOT branded AND hit)     AS nonbranded_hits
  FROM resp GROUP BY 1
),
m_agg AS (
  SELECT q.tenant_id,
         count(*)                         AS mentions,
         count(*) FILTER (WHERE m.is_target) AS target_mentions
  FROM mentions m
  JOIN responses r ON r.id = m.response_id
  JOIN queries q ON q.id = r.query_id
  WHERE q.requested_at >= now() - make_interval(days => p_days)
    AND q.engine <> 'stub'
  GROUP BY 1
),
p_agg AS (
  SELECT tenant_id, count(*) AS published
  FROM generated_contents
  WHERE status = 'published' AND channel = 'blog_html'
  GROUP BY 1
)
SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'tenant_id',            t.id,
  'published',            COALESCE(p.published, 0),
  'queries',              COALESCE(qa.queries, 0),
  'responses',            COALESCE(ra.responses, 0),
  'hit_responses',        COALESCE(ra.hit_responses, 0),
  'branded_responses',    COALESCE(ra.branded_responses, 0),
  'branded_hits',         COALESCE(ra.branded_hits, 0),
  'nonbranded_responses', COALESCE(ra.nonbranded_responses, 0),
  'nonbranded_hits',      COALESCE(ra.nonbranded_hits, 0),
  'mentions',             COALESCE(ma.mentions, 0),
  'target_mentions',      COALESCE(ma.target_mentions, 0)
) ORDER BY t.id), '[]'::jsonb)
FROM tenants t
LEFT JOIN p_agg p  ON p.tenant_id  = t.id
LEFT JOIN q_agg qa ON qa.tenant_id = t.id
LEFT JOIN r_agg ra ON ra.tenant_id = t.id
LEFT JOIN m_agg ma ON ma.tenant_id = t.id;
$$;

-- 병원별 수치다. 공개 anon 키로 호출되면 안 된다 — 서버(getServerClient = service role)만.
-- Supabase 기본 권한이 새 함수에 anon/authenticated EXECUTE 를 자동 부여하므로 명시적으로 회수한다.
REVOKE ALL ON FUNCTION public.funnel_tenant_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.funnel_tenant_stats(integer) TO service_role;

-- 검증 쿼리 (토큰 확인 — 새 tenant 추가 시 실행):
--   SELECT t.name, string_agg(DISTINCT tok.token, ', ') ... (Round 203 SKILL.md 참조)
