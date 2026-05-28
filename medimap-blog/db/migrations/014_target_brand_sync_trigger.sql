-- ============================================================
-- Migration 014 — keywords.target_brand 자동 sync trigger
-- 2026-05-28
--
-- 배경:
--   사용자가 /admin/tenants 에서 tenant 의 partner_slug 를 변경했는데
--   keywords.target_brand 는 기존 값 유지. 두 컬럼이 정합성 깨짐.
--
--   해결: PostgreSQL trigger 로 tenants.partner_slug 변경 시
--   해당 tenant 의 모든 keywords 행의 target_brand 를 자동 update.
--
-- 추가: 현재 stale 데이터도 일괄 sync (1회성)
-- ============================================================

-- 1) sync trigger 함수
CREATE OR REPLACE FUNCTION sync_keywords_target_brand()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.partner_slug IS DISTINCT FROM OLD.partner_slug THEN
    UPDATE keywords
    SET target_brand = NEW.partner_slug
    WHERE tenant_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) trigger 적용 (재실행 안전)
DROP TRIGGER IF EXISTS trg_sync_target_brand ON tenants;
CREATE TRIGGER trg_sync_target_brand
AFTER UPDATE OF partner_slug ON tenants
FOR EACH ROW
EXECUTE FUNCTION sync_keywords_target_brand();

-- 3) 현재 stale 데이터 일괄 sync — tenant.partner_slug 와 keyword.target_brand 가
--    다른 행을 찾아서 tenant 의 partner_slug 로 통일
UPDATE keywords k
SET target_brand = t.partner_slug
FROM tenants t
WHERE k.tenant_id = t.id
  AND (k.target_brand IS DISTINCT FROM t.partner_slug);

-- 4) 검증 — 모든 keyword 가 tenant 의 partner_slug 와 일치하는지 확인
SELECT
  t.id          AS tenant_id,
  t.name        AS tenant_name,
  t.partner_slug AS tenant_partner_slug,
  k.target_brand,
  CASE
    WHEN t.partner_slug IS NOT DISTINCT FROM k.target_brand THEN '✓ sync'
    ELSE '✗ mismatch'
  END AS sync_status,
  count(*) AS keyword_count
FROM tenants t
LEFT JOIN keywords k ON k.tenant_id = t.id
GROUP BY t.id, t.name, t.partner_slug, k.target_brand
ORDER BY t.id, k.target_brand;
