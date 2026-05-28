-- ============================================================
-- Migration 020 — 새 파트너 tenant 3개 추가
-- 2026-05-28
--
-- 사용자가 TETE/메디맵 tenant 의도적으로 삭제 후 실제 파트너로 교체:
--   - 바를정 한방의원 (한방의원)
--   - 벨리셀 피부과 (피부과)
--   - 밝은눈안과부산 (안과)
--
-- partner_slug 영문:
--   - barujeong
--   - bellisel
--   - bgn-busan
--
-- 참고: '한방의원' 카테고리는 기존 PARTNER_CATEGORY_SLUGS 에 없음.
-- 향후 partners.ts 에 'oriental_medicine' 추가 필요 (별도 라운드).
-- 일단 tenant 만 INSERT, with-partners 라우트 노출은 추후.
-- ============================================================

INSERT INTO tenants (
  name, domain_category, region, business_model,
  partner_slug, status, joined_at, created_at,
  password_hash
)
VALUES
  ('바를정 한방의원',     '한방의원', '서울', 'partner', 'barujeong', 'active', '2026-05-28', now(), 'placeholder-reset-required'),
  ('벨리셀 피부과',       '피부과',   '서울', 'partner', 'bellisel',  'active', '2026-05-28', now(), 'placeholder-reset-required'),
  ('밝은눈안과 부산',     '안과',     '부산', 'partner', 'bgn-busan', 'active', '2026-05-28', now(), 'placeholder-reset-required')
ON CONFLICT (partner_slug) DO NOTHING;

-- 검증 — 전체 tenant 목록
SELECT id, name, partner_slug, domain_category, region, status
FROM tenants
ORDER BY id;
