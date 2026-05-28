-- ============================================================
-- 진단 SQL — 파트너 6편 + 자사 3편 batch 발행 전 상태 점검
-- 2026-05-28 Round 23
--
-- 이 파일은 발행 트리거 전 어떤 상태인지 알기 위한 SELECT only.
-- 실행해도 데이터에 영향 없음.
-- ============================================================

-- 1. 활성 테넌트 + partner_slug + domain_category 현황
SELECT id, name, partner_slug, domain_category, region, status, business_model
FROM tenants
ORDER BY id;

-- 2. 각 테넌트별 발행된 글 개수 + draft 개수
SELECT
  t.id AS tenant_id,
  t.name,
  t.partner_slug,
  t.domain_category,
  COUNT(*) FILTER (WHERE g.status = 'published') AS published_cnt,
  COUNT(*) FILTER (WHERE g.status = 'draft') AS draft_cnt,
  COUNT(*) FILTER (WHERE g.status = 'rejected') AS rejected_cnt,
  COUNT(*) AS total
FROM tenants t
LEFT JOIN generated_contents g ON g.tenant_id = t.id
GROUP BY t.id, t.name, t.partner_slug, t.domain_category
ORDER BY t.id;

-- 3. 자사 인사이트(73/74/75) tenant_id 확인 — '메디맵' 자사 tenant 는 어느 id ?
SELECT id, title, tenant_id, status, is_partner_content, partner_category, slug
FROM generated_contents
WHERE id IN (73, 74, 75)
ORDER BY id;

-- 4. 각 테넌트별 active 키워드 개수
SELECT
  t.id AS tenant_id,
  t.name,
  COUNT(*) FILTER (WHERE k.is_active = true) AS active_kw,
  COUNT(*) AS total_kw,
  STRING_AGG(k.text, ', ' ORDER BY k.id) FILTER (WHERE k.is_active = true) AS active_keywords
FROM tenants t
LEFT JOIN keywords k ON k.tenant_id = t.id
GROUP BY t.id, t.name
ORDER BY t.id;

-- 5. AutoContentSetting (자동발행 정책) 상태 — daily_count 가 핵심
-- 테이블명 추정: auto_content_settings (소문자 snake_case)
-- 만약 다른 이름이면 에러 메시지 보고 수정
SELECT *
FROM auto_content_settings
ORDER BY tenant_id;
