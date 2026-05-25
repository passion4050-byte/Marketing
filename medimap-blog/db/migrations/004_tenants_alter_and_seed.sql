-- ============================================================
-- Migration 004 — tenants 운영 컬럼 추가 + BGN/모우림 시드
-- 2026-05-25
--
-- 목적:
--   1. /admin/tenants UI 가 사용하는 status / publish_count / monthly_cost / joined_at 컬럼을 tenants 에 추가
--   2. BGN, 모우림 row 를 default 값으로 INSERT (운동 후 admin UI 에서 세부 수정)
--   3. partner_slug unique 제약 보존 + 기존 TETE row 영향 0
--
-- 실행: Supabase Dashboard → SQL Editor → 통째 paste → RUN
-- 안전: 모두 IF NOT EXISTS / ON CONFLICT — 재실행 idempotent
-- ============================================================

-- 1) 운영 정보 컬럼 추가
alter table tenants
  add column if not exists status text default 'trial' check (status in ('active','paused','trial'));

alter table tenants
  add column if not exists publish_count int default 0;

alter table tenants
  add column if not exists monthly_cost numeric(10,2) default 0;

alter table tenants
  add column if not exists joined_at date default current_date;

-- 2) BGN / 모우림 INSERT (default 값, partner_slug 충돌 시 skip)
insert into tenants (name, domain_category, region, partner_slug, business_model, status, joined_at)
values
  ('BGN 밝은눈안과 잠실', '안과',     '잠실', 'bgn',    '라식·라섹·스마일라식',  'active', current_date),
  ('모우림 모발이식의원', '모발이식', '강남', 'mourim', 'FUE 비절개식 모발이식', 'active', current_date)
on conflict (partner_slug) do nothing;

-- 3) TETE row 의 status 보정 (NULL → 'active')
update tenants set status = 'active' where partner_slug = 'tete' and (status is null or status = 'trial');

-- 4) 검증
select id, name, domain_category, region, partner_slug, status, joined_at
from tenants
order by name;
