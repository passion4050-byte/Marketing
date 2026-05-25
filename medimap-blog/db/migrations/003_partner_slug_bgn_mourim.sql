-- ============================================================
-- BGN / 모우림 partner_slug 백필 (수동 실행)
-- 2026-05-25
--
-- 컨텍스트: 002_with_partners.sql 의 wildcard update (name ILIKE '%BGN%') 가
-- 일부 환경에서 매칭에 실패한 사례 — 실제 id 를 확인한 뒤 명시적으로 update.
--
-- 실행 순서:
--   1) Supabase Dashboard → SQL Editor → 아래 STEP 1 실행 → 결과 캡쳐
--   2) STEP 2 의 <ID> 를 실제 id 로 치환 → 실행
--   3) STEP 3 으로 검증
-- ============================================================

-- ─── STEP 1 : 현재 상태 확인 ────────────────────────────────
select id, name, partner_slug, category
from tenants
where name ilike '%BGN%'
   or name ilike '%밝은눈%'
   or name ilike '%모우림%'
   or name ilike '%Mourim%'
order by name;

-- ─── STEP 2 : 수동 update (id 치환 후 실행) ─────────────────
-- BGN
-- 예: name = 'BGN 밝은눈안과 잠실' 인 row 의 id 를 확인한 뒤 아래 한 줄 실행
update tenants
   set partner_slug = 'bgn'
 where id = '<BGN_TENANT_ID>'
   and partner_slug is null;

-- 모우림
update tenants
   set partner_slug = 'mourim'
 where id = '<MOURIM_TENANT_ID>'
   and partner_slug is null;

-- ─── (대안) ILIKE 기반 일괄 update — 환경에 따라 1줄만 채택 ──
-- update tenants set partner_slug = 'bgn'    where partner_slug is null and (name ilike '%BGN%' or name ilike '%밝은눈%');
-- update tenants set partner_slug = 'mourim' where partner_slug is null and (name ilike '%모우림%' or name ilike '%Mourim%');

-- ─── STEP 3 : 검증 ──────────────────────────────────────────
select partner_slug, name
from tenants
where partner_slug in ('bgn', 'tete', 'mourim')
order by partner_slug;

-- 기대 결과:
--   partner_slug | name
--   ─────────────┼────────────────────
--   bgn          | BGN 밝은눈안과 잠실
--   mourim       | 모우림 모발이식
--   tete         | TETE 강남 안과
