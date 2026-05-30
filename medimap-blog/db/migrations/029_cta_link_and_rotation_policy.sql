-- ============================================================
-- Migration 029 — Round 28 (2026-05-30)
-- 1. 자사 6편 본문 CTA href 수정 (medi-map.co.kr/contact → /contact)
-- 2. 새 cron 글 3편 (98, 99, 100) reject
-- 3. auto_content_settings 일괄: daily_count=1, auto_publish=false (검수 단계)
-- 4. 자사 cron 재개 (검수 경유)
-- ============================================================

-- 1. CTA href 수정 — 자사 6편 본문의 '진단 신청' 버튼
UPDATE generated_contents
SET body = REPLACE(body, 'https://medi-map.co.kr/contact', '/contact'),
    updated_at = NOW()
WHERE tenant_id = 12
  AND status = 'published'
  AND body LIKE '%https://medi-map.co.kr/contact%';

-- 2. 새 cron 글 (98, 99, 100) reject (자사 옛 LLM 패턴, 정성 안 들어간 초안)
UPDATE generated_contents
SET status = 'rejected', updated_at = NOW()
WHERE id IN (98, 99, 100);

-- 3. auto_content_settings 일괄 정책:
--    - 자사 (tenant 12): enabled=true 재개, daily_count=1, auto_publish=false (검수 단계)
--    - 파트너 6개 (4,5,6,8,9,10): enabled=true 유지, daily_count=1, auto_publish=false 통일
--    scheduler.py 의 Round 28 로테이션 로직이 last_run_at ASC 로 1개씩 선택.
UPDATE auto_content_settings
SET enabled = true, daily_count = 1, auto_publish = false, updated_at = NOW()
WHERE tenant_id IN (4, 5, 6, 8, 9, 10, 12);

-- 4. 검증 — auto_content_settings 최종 상태
SELECT a.tenant_id, t.name, t.business_model, t.partner_slug,
       a.enabled, a.daily_count, a.auto_publish, a.last_run_at
FROM auto_content_settings a
JOIN tenants t ON t.id = a.tenant_id
WHERE a.enabled = true
ORDER BY t.business_model DESC, a.last_run_at NULLS FIRST;

-- 5. 검증 — CTA href 변경 + cron 글 reject 확인
SELECT id, status, blog_category, LEFT(title, 50) AS title_short,
       body LIKE '%href="/contact"%' AS has_new_cta,
       body LIKE '%medi-map.co.kr/contact%' AS has_old_cta
FROM generated_contents
WHERE tenant_id = 12
ORDER BY id;
