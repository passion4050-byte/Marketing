-- ============================================================
-- Migration 006 — tenants.email 컬럼 추가 + 3 테넌트 placeholder 채움
-- 2026-05-26
--
-- 배경: /admin/reports 의 "이메일 발송" 버튼이 동작하려면
--       tenants 에 email 컬럼이 있어야 함. mock 시절엔 contact 라는
--       이름의 mock 컬럼이 있었지만 prod 스키마엔 없음.
-- ============================================================

alter table tenants
  add column if not exists email varchar(255);

-- BGN / 모우림 placeholder (사용자가 admin UI 에서 추후 수정)
update tenants set email = 'passion4050@gmail.com' where partner_slug = 'bgn'    and email is null;
update tenants set email = 'passion4050@gmail.com' where partner_slug = 'mourim' and email is null;
update tenants set email = 'passion4050@gmail.com' where partner_slug = 'tete'   and email is null;

-- 검증
select id, name, partner_slug, email, phone from tenants order by name;
