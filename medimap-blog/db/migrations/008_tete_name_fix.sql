-- ============================================================
-- Migration 008 — TETE 의 tenant.name 정정
-- 2026-05-26
--
-- 배경: 직전까지 TETE 의 name 이 '메디맵' 으로 들어가 있어 with-partners
--       breadcrumb 에 '메디맵' 으로 표시됨. 실제로는 TETE 강남 안과가 정확.
--       또한 prod 의 domain_category 가 '기타' 였는데 안과 파트너이므로 '안과' 로
--       정정. 이렇게 해야 향후 자동발행 cron 의 partner_category 매핑이 정확.
-- ============================================================

update tenants
   set name = 'TETE 강남 안과'
 where partner_slug = 'tete'
   and name <> 'TETE 강남 안과';

update tenants
   set domain_category = '안과'
 where partner_slug = 'tete'
   and domain_category <> '안과';

-- 검증
select id, name, domain_category, region, partner_slug, status from tenants order by name;
