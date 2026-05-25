-- ============================================================
-- MEDIMAP — With Partners 콘텐츠 구조 마이그레이션
-- 2026-05-25
-- 
-- 목적: medimap-blog-phi 에 /with-partners/[category]/[partner]/[slug] 
--       라우트를 위한 컬럼 추가. 메디맵 자사 글과 파트너 클라이언트 글 분리.
--
-- 실행: Supabase Dashboard → SQL Editor → New Query → 통째 paste → RUN
-- 안전: 모두 IF NOT EXISTS / additive — 기존 데이터 영향 0
-- ============================================================

-- 1) tenants 테이블에 partner_slug 추가 (URL 영문 식별자)
alter table tenants
  add column if not exists partner_slug text unique;

-- 기존 테넌트들에 partner_slug 시드 (예시 — 실제 데이터에 맞게 조정)
update tenants set partner_slug = 'bgn'    where name ilike '%BGN%' and partner_slug is null;
update tenants set partner_slug = 'tete'   where name ilike '%TETE%' and partner_slug is null;
update tenants set partner_slug = 'mourim' where name ilike '%모우림%' and partner_slug is null;

create index if not exists tenants_partner_slug_idx on tenants(partner_slug);

-- 2) generated_contents 에 카테고리 + 파트너 콘텐츠 플래그 추가
alter table generated_contents
  add column if not exists partner_category text;

alter table generated_contents
  add column if not exists is_partner_content boolean default false not null;

-- 카테고리 체크 (6종)
alter table generated_contents
  drop constraint if exists generated_contents_partner_category_check;

alter table generated_contents
  add constraint generated_contents_partner_category_check
  check (
    partner_category is null
    or partner_category in ('eyeclinic', 'derma', 'plastic', 'dental', 'internal', 'hair')
  );

-- 파트너 콘텐츠 인덱스 (조회 빠르게)
create index if not exists generated_contents_partner_idx
  on generated_contents(partner_category, tenant_id, status)
  where is_partner_content = true;

create index if not exists generated_contents_partner_published_idx
  on generated_contents(partner_category, published_at desc)
  where is_partner_content = true and status = 'published';

-- 3) 검증 쿼리 (실행 후 확인용)
-- select column_name, data_type from information_schema.columns
-- where table_name = 'generated_contents' and column_name in ('partner_category', 'is_partner_content');
-- select column_name, data_type from information_schema.columns
-- where table_name = 'tenants' and column_name = 'partner_slug';
-- select partner_slug, name from tenants where partner_slug is not null;

-- 4) 향후 마이그레이션 (지금은 미실행 — 검증 후)
-- alter table tenants alter column partner_slug set not null;
