-- ============================================================
-- Migration 010 — /blog 자사 인사이트 카테고리 분리
-- 2026-05-27
--
-- 배경:
--   /blog (메디맵 자사 인사이트) vs /with-partners (파트너 의료 콘텐츠) 분리.
--   기존 generated_contents 에 blog_category 컬럼 추가하여 자사 인사이트는
--   3 카테고리로 분류:
--     - content_marketing  : 콘텐츠 마케팅 인사이트
--     - ai_trend           : AI 및 마케팅 트렌드
--     - hospital_marketing : 병원 마케터 노하우
--
--   파트너 콘텐츠 (is_partner_content=true, partner_category=eyeclinic 등) 는
--   blog_category = NULL.
--
-- 운영 모델:
--   매일 8AM KST 자동 발행 — 자사 인사이트 3개 (카테고리별 1개) + 파트너 1개 rotate
-- ============================================================

-- 1) blog_category 컬럼 추가
ALTER TABLE generated_contents
ADD COLUMN IF NOT EXISTS blog_category VARCHAR(50);

-- 2) CHECK 제약 — 데이터 무결성
ALTER TABLE generated_contents
DROP CONSTRAINT IF EXISTS chk_blog_category;

ALTER TABLE generated_contents
ADD CONSTRAINT chk_blog_category
CHECK (
  blog_category IS NULL
  OR blog_category IN ('content_marketing', 'ai_trend', 'hospital_marketing')
);

-- 3) 인덱스 — /blog 페이지 카테고리 필터 + 발행일 정렬
CREATE INDEX IF NOT EXISTS idx_gc_blog_category_status_pub
ON generated_contents(blog_category, status, published_at DESC)
WHERE blog_category IS NOT NULL;

-- 4) 검증
SELECT
  column_name,
  data_type,
  is_nullable,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'generated_contents'
  AND column_name IN ('blog_category', 'partner_category', 'is_partner_content')
ORDER BY column_name;

-- 5) 현재 콘텐츠 분포 확인
SELECT
  CASE
    WHEN is_partner_content = true THEN 'partner_content (with-partners)'
    WHEN blog_category IS NOT NULL THEN 'blog_category = ' || blog_category
    ELSE 'uncategorized (기존 자동 발행 글)'
  END AS content_type,
  count(*) AS n
FROM generated_contents
WHERE status = 'published'
GROUP BY 1
ORDER BY n DESC;
