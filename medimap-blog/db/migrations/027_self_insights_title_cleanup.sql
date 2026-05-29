-- ============================================================
-- Migration 027 — Round 25 후속 (2026-05-29)
-- 자사 인사이트 11편 정리: 핵심 6편 제목 재작성 + 5편 reject + HTML entity 디코딩
--
-- 정리 대상:
--   유지: 87, 88, 89 (시드) + 93, 94, 97 (cron 추가)
--   reject: 90, 91, 92, 95, 96 (중복/유사 내용)
--
-- 핵심: 키워드별로 1편씩 + 차별화된 cron 글 3편 = 총 6편 유지
--   - "의료 GEO 최적화" 키워드: 87
--   - "의료법 광고 가이드" 키워드: 88, 94, 88 의 후속 (94 가 분석 관점)
--   - "병원 마케팅 GEO" 키워드: 89, 93 (환자 관점), 97 (콘텐츠 전략)
-- ============================================================

-- 1. HTML entity 디코딩 — 11편 전체 title/body/excerpt
-- &#x27; → '   |   &quot; → "   |   &amp; → &
UPDATE generated_contents
SET title = REPLACE(REPLACE(REPLACE(title, '&#x27;', ''''), '&quot;', '"'), '&amp;', '&'),
    body = REPLACE(REPLACE(REPLACE(body, '&#x27;', ''''), '&quot;', '"'), '&amp;', '&'),
    excerpt = REPLACE(REPLACE(REPLACE(COALESCE(excerpt, ''), '&#x27;', ''''), '&quot;', '"'), '&amp;', '&'),
    updated_at = NOW()
WHERE tenant_id = 12 AND id BETWEEN 87 AND 97;


-- 2. 핵심 6편 제목 재작성 (#숫자 제거 + 이모지 정리 + 차별화)
UPDATE generated_contents
SET title = '의료 GEO 최적화 — AI 검색에 우리 병원이 노출되는 7가지 원칙',
    updated_at = NOW()
WHERE id = 87;

UPDATE generated_contents
SET title = '의료법 광고 가이드라인 — 의료기관 운영자가 알아야 할 핵심 정리',
    updated_at = NOW()
WHERE id = 88;

UPDATE generated_contents
SET title = '병원 마케팅 GEO 입문 — AI 검색 시대의 환자 유입 전략',
    updated_at = NOW()
WHERE id = 89;

UPDATE generated_contents
SET title = '환자가 우리 병원을 어디서 찾을까? 병원 마케팅 GEO의 중요성',
    updated_at = NOW()
WHERE id = 93;

UPDATE generated_contents
SET title = '안전하고 신뢰받는 병원 마케팅의 시작 — 의료법 광고 가이드 실무',
    updated_at = NOW()
WHERE id = 94;

UPDATE generated_contents
SET title = '병원 마케팅 GEO — 환자와 가까워지는 콘텐츠 전략',
    updated_at = NOW()
WHERE id = 97;


-- 3. 5편 reject (status='rejected') — 중복/유사 내용
-- 90: 89 와 키워드 동일 + 제목 유사
-- 91: 87 과 키워드 동일 + 제목 유사
-- 92: 88 과 키워드 동일 + 제목 유사
-- 95: 87, 91 과 키워드 동일
-- 96: 88, 92, 94 와 키워드 동일
UPDATE generated_contents
SET status = 'rejected', updated_at = NOW()
WHERE id IN (90, 91, 92, 95, 96);


-- 4. 검증 — 자사 11편 최종 상태
SELECT id, status, blog_category,
       LEFT(title, 60) as title_short
FROM generated_contents
WHERE tenant_id = 12
ORDER BY id;
