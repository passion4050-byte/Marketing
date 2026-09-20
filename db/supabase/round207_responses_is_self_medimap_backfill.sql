-- Round 207 (2026-09-20) — responses.source_domains 의 medi-map is_self 플래그 정정 (12행)
--
-- 배경: R203 은 citation_events 의 medi-map 허수 14행을 지웠지만, 자사 목록이 **두 곳**인 걸
--   놓쳤다. scripts/collect_citation_events.py 의 SELF_HOSTS 만 고치고
--   src/parser/source_resolver.py 의 SELF_DOMAINS 는 medi-map 을 그대로 두어,
--   해석 배치가 매일 is_self=true 를 새로 써넣고 있었다.
--
-- 증상 (2026-09-20 어드민 /admin/citations 실측):
--   5-Tier 차트 "위서클 자체" 54  vs  "위서클 자사 인용 증거" 64회  — 차이 10.
--   두 숫자가 서로 다른 자사 판정을 쓴다:
--     · 5-Tier   → classifyDomain(JS) ← domain_classifications (medi-map = T4, 정상)
--     · 증거표   → citations_dashboard RPC 의 is_self ← responses.source_domains 에
--                  **이미 박혀 있는 플래그** (source_resolver 가 씀, 오염됨)
--   RPC 가 계산하는 값이 아니라 저장된 값이라, 코드만 고쳐선 과거 행이 안 낫는다.
--
-- 대상 12행 (전 기간). 전부 우리 글이 아님 — /search?q= · /hospital/view/ ·
--   /contents/view/ · /event? 뿐이며 content_id 는 전부 null:
--   3631(07-16) 7300(08-13) 8888(08-23) 9446(08-30) 9962(09-01) 12040(09-07)
--   13011(09-10) 13029(09-10) 13449(09-12) 13869(09-12) 14289(09-14) 14710(09-15)
--
-- 정본: 자사 = wecircle.co.kr(+서브도메인) · medimap-blog-phi.vercel.app(Vercel alias).
--   medi-map.co.kr 은 전 직장 메디맵의 병원찾기 플랫폼이며 T4 다 (R180b·R203).
--
-- 코드 쪽 짝: src/parser/source_resolver.py SELF_DOMAINS 에서 medi-map 2줄 제거.
--   ⚠ 코드만 고치면 과거 행이, 데이터만 고치면 내일 다시 오염된다. 둘 다 해야 한다.

-- 원소 순서를 보존하며 medi-map 원소의 is_self 만 false 로 뒤집는다.
-- (행을 지우지 않는다 — 인용 사실 자체는 남기고 "자사" 라벨만 뗀다.)
UPDATE responses r
SET source_domains = (
  SELECT jsonb_agg(
           CASE WHEN (t.elem->>'domain') ILIKE '%medi-map%'
                     AND (t.elem->>'is_self')::boolean IS TRUE
                THEN jsonb_set(t.elem, '{is_self}', 'false'::jsonb)
                ELSE t.elem END
           ORDER BY t.ord)::json
  FROM jsonb_array_elements(r.source_domains::jsonb) WITH ORDINALITY AS t(elem, ord)
)
WHERE r.id IN (3631,7300,8888,9446,9962,12040,13011,13029,13449,13869,14289,14710);

-- 판정용 검증 (UPDATE 반환값으로 성패를 보지 말 것 — R191b).
--   기대: still_self_medimap=0 · damaged_rows=0 · medimap_rows_total 은 그대로(=14, 라벨만 변경)
SELECT
  (SELECT count(*) FROM responses r CROSS JOIN LATERAL jsonb_array_elements(r.source_domains::jsonb) sd
     WHERE (sd->>'domain') ILIKE '%medi-map%' AND (sd->>'is_self')::boolean IS TRUE) AS still_self_medimap,
  (SELECT count(*) FROM responses r CROSS JOIN LATERAL jsonb_array_elements(r.source_domains::jsonb) sd
     WHERE (sd->>'domain') ILIKE '%medi-map%') AS medimap_rows_total,
  (SELECT count(*) FROM responses
     WHERE id IN (3631,7300,8888,9446,9962,12040,13011,13029,13449,13869,14289,14710)
       AND (source_domains IS NULL OR jsonb_array_length(source_domains::jsonb)=0)) AS damaged_rows;

-- 2026-09-20 실행 결과: still_self_medimap=0 · medimap_rows_total=14 · damaged_rows=0
-- 교차검증: 최근 30일 is_self=true 원소 59건, 도메인 breakdown 결과 **전부 wecircle.co.kr**.
