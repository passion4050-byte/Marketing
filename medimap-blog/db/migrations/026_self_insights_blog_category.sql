-- ============================================================
-- Migration 026 — Round 24 (2026-05-29)
-- 자사 인사이트 글 87/88/89 의 blog_category 채우기
--
-- 배경: posts.ts getAllPosts() 가 blog_category=NULL 글을 모두 제외 (Round 16)
--   → 어제 cron 으로 발행된 자사 글이 /blog 에 안 나타남
--
-- 매핑:
--   87 (의료 GEO 최적화)   → ai_trend
--   88 (의료법 광고 가이드) → hospital_marketing
--   89 (병원 마케팅 GEO)   → hospital_marketing
--
-- BLOG_CATEGORY_SLUGS: content_marketing | ai_trend | hospital_marketing
-- ============================================================

UPDATE generated_contents
SET blog_category = 'ai_trend', updated_at = NOW()
WHERE id = 87 AND blog_category IS NULL;

UPDATE generated_contents
SET blog_category = 'hospital_marketing', updated_at = NOW()
WHERE id IN (88, 89) AND blog_category IS NULL;

-- 검증
SELECT id, tenant_id, title, blog_category, slug, status,
       is_partner_content, partner_category
FROM generated_contents
WHERE id IN (87, 88, 89)
ORDER BY id;
