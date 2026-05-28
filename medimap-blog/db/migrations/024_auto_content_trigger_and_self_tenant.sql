-- ============================================================
-- Migration 024 — Round 23 (2026-05-28)
--
-- 목표:
--   1. 신규 tenant INSERT 시 auto_content_settings row 가 자동 생성되도록 trigger.
--      → 앞으로 신규 클라이언트 추가 시 SQL 실행 0회.
--   2. 자사 인사이트 tenant '메디맵' 신설 + 키워드 3개 시드.
--   3. 자사 tenant 만 enabled=true, daily_count=3 으로 활성화 (다음 cron 에서 3편 발행).
--   4. 기존 모든 tenant 에 대해 누락된 auto_content_settings row backfill.
--   5. keywords.is_active default 가 true 임을 확인 (이미 그러면 no-op).
--
-- 안전:
--   - 모두 IF NOT EXISTS / ON CONFLICT 사용 → 재실행 안전.
--   - 자사 tenant 는 partner_slug='medimap-self' 로 식별. 충돌 시 skip.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. 기존 테이블이 있다면 updated_at default 보강
--    (Round 23 사고 후 추가 — DB-level default 가 없어서 INSERT 시 NULL violation)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS auto_content_settings
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- 1. auto_content_settings 테이블 존재 확인 (혹시 없으면 생성)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_content_settings (
  id           SERIAL PRIMARY KEY,
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  daily_count  INTEGER NOT NULL DEFAULT 1,
  channels     JSONB,
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  last_run_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_auto_setting_tenant UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_settings_enabled
  ON auto_content_settings(enabled) WHERE enabled = true;

-- ────────────────────────────────────────────────────────────
-- 2. Trigger function — tenants INSERT → auto_content_settings INSERT
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_create_content_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auto_content_settings (tenant_id, enabled, daily_count, auto_publish, updated_at)
  VALUES (NEW.id, false, 1, false, NOW())
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_content_settings ON tenants;

CREATE TRIGGER trg_auto_create_content_settings
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_content_settings();

-- ────────────────────────────────────────────────────────────
-- 3. Backfill — 기존 활성 tenant 모두에게 auto_content_settings row 생성
--    (default enabled=false. 운영자가 어드민에서 직접 토글.)
-- ────────────────────────────────────────────────────────────

INSERT INTO auto_content_settings (tenant_id, enabled, daily_count, auto_publish, updated_at)
SELECT t.id, false, 1, false, NOW()
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM auto_content_settings a WHERE a.tenant_id = t.id
);

-- ────────────────────────────────────────────────────────────
-- 4. 자사 인사이트 tenant '메디맵' 신설
--    partner_slug='medimap-self' 로 식별 (영문 slug 충돌 회피).
--    business_model='self' 로 파트너와 구분 → /with-partners 에서 노출 안 됨.
-- ────────────────────────────────────────────────────────────

-- region 은 NOT NULL 이므로 자사 본사 위치 '서울' 명시.
-- address/naver_place_url/phone/homepage 도 안전망으로 명시 (혹시 다른 NOT NULL 보정).
INSERT INTO tenants (
  name, domain_category, region, business_model,
  partner_slug, status, joined_at, created_at,
  password_hash,
  address, naver_place_url, phone, homepage
)
VALUES (
  '메디맵', '자사인사이트', '서울', 'self',
  'medimap-self', 'active', '2026-05-28', NOW(),
  'placeholder-self-tenant',
  '서울특별시', '', '', 'https://medi-map.co.kr'
)
ON CONFLICT (partner_slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. 자사 tenant 의 키워드 3개 시드 + active 활성화
-- ────────────────────────────────────────────────────────────

INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT t.id, '의료 GEO 최적화', '자사인사이트', 'medimap-self', true
FROM tenants t
WHERE t.partner_slug = 'medimap-self'
  AND NOT EXISTS (
    SELECT 1 FROM keywords k
    WHERE k.tenant_id = t.id AND k.text = '의료 GEO 최적화'
  );

INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT t.id, '의료법 광고 가이드', '자사인사이트', 'medimap-self', true
FROM tenants t
WHERE t.partner_slug = 'medimap-self'
  AND NOT EXISTS (
    SELECT 1 FROM keywords k
    WHERE k.tenant_id = t.id AND k.text = '의료법 광고 가이드'
  );

INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT t.id, '병원 마케팅 GEO', '자사인사이트', 'medimap-self', true
FROM tenants t
WHERE t.partner_slug = 'medimap-self'
  AND NOT EXISTS (
    SELECT 1 FROM keywords k
    WHERE k.tenant_id = t.id AND k.text = '병원 마케팅 GEO'
  );

-- ────────────────────────────────────────────────────────────
-- 6. 자사 tenant 의 auto_content_settings 활성화
--    (다음 cron 에서 자동 발행 3편 — enabled=true, daily_count=3, auto_publish=true)
--    파트너 6개는 enabled=false 유지 → cron 으로 발행 안 함 (수동 SQL 로 별도 처리).
-- ────────────────────────────────────────────────────────────

UPDATE auto_content_settings
SET enabled = true,
    daily_count = 3,
    auto_publish = true,
    channels = '["blog_html"]'::jsonb,
    updated_at = NOW()
WHERE tenant_id = (SELECT id FROM tenants WHERE partner_slug = 'medimap-self');

-- ────────────────────────────────────────────────────────────
-- 7. 신규 파트너 3개 (바를정·벨리셀·밝은눈안과 부산) 키워드 활성화 + 보강
--    현재 is_active=0 인 키워드들을 활성화 + 부족하면 시드 추가.
-- ────────────────────────────────────────────────────────────

-- 기존 키워드 모두 active 화
UPDATE keywords
SET is_active = true
WHERE tenant_id IN (
  SELECT id FROM tenants WHERE partner_slug IN ('barujeong', 'bellisel', 'bgn-busan')
)
AND is_active = false;

-- ────────────────────────────────────────────────────────────
-- 8. 검증
-- ────────────────────────────────────────────────────────────

-- 8.1 자동 발행 활성 상태
SELECT t.id, t.name, t.partner_slug, t.business_model,
       a.enabled, a.daily_count, a.auto_publish, a.channels
FROM tenants t
LEFT JOIN auto_content_settings a ON a.tenant_id = t.id
ORDER BY t.id;

-- 8.2 자사 tenant 키워드 확인
SELECT k.id, k.tenant_id, k.text, k.is_active, k.target_brand
FROM keywords k
JOIN tenants t ON t.id = k.tenant_id
WHERE t.partner_slug = 'medimap-self'
ORDER BY k.id;

-- 8.3 trigger 등록 확인
SELECT tgname, tgrelid::regclass AS table_name, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_auto_create_content_settings';
