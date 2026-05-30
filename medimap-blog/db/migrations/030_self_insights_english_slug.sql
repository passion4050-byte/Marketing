-- ============================================================
-- Migration 030 — Round 29 (2026-05-30)
-- 자사 6편 (87, 88, 89, 93, 94, 97) slug 영문화 — AEO/GEO 안정성
--
-- 배경: Perplexity·ChatGPT 가 한글 URL 을 잘못 인코딩하거나 인용 시 깨짐.
--       Google·Bing 도 영문 URL 우선.
--
-- 옛 slug (한글):                          새 slug (영문):
--   의료-GEO-최적화-87                       medical-geo-7-principles-87
--   의료법-광고-가이드라인-88                  medical-law-advertising-guide-88
--   병원-마케팅-GEO-입문-89                   hospital-marketing-geo-intro-89
--   환자가-우리-병원을-93                     patient-search-channel-93
--   안전하고-신뢰받는-94                     medical-law-compliance-checklist-94
--   병원-마케팅-GEO-97                       empathy-content-strategy-97
--
-- 주의: 옛 slug 로 외부 공유된 URL 은 404. medimap-blog 의 /blog/[slug] 라우트는
--       force-dynamic 이라 새 slug 즉시 적용. 옛 slug redirect 처리는 다음 라운드.
-- ============================================================

UPDATE generated_contents SET slug = 'medical-geo-7-principles-87', updated_at = NOW() WHERE id = 87;
UPDATE generated_contents SET slug = 'medical-law-advertising-guide-88', updated_at = NOW() WHERE id = 88;
UPDATE generated_contents SET slug = 'hospital-marketing-geo-intro-89', updated_at = NOW() WHERE id = 89;
UPDATE generated_contents SET slug = 'patient-search-channel-93', updated_at = NOW() WHERE id = 93;
UPDATE generated_contents SET slug = 'medical-law-compliance-checklist-94', updated_at = NOW() WHERE id = 94;
UPDATE generated_contents SET slug = 'empathy-content-strategy-97', updated_at = NOW() WHERE id = 97;

-- 검증
SELECT id, status, LEFT(title, 50) AS title_short, slug
FROM generated_contents
WHERE id IN (87, 88, 89, 93, 94, 97)
ORDER BY id;
