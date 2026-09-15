-- Round 206 (2026-09-15) — 제목까지 같은 중복 발행 글 noindex (데이터 변경, 적용 완료).
--
-- 대상 선정: 같은 tenant·lang 에서 정규화 제목(한/영/숫자/한자/가나만 남김)이 같은 published blog_html 묶음 24개.
--   묶음마다 1편 유지 — 정렬: AI 인용 수 DESC → GSC 90일 클릭 DESC → 노출 DESC → 먼저 발행.
--   나머지 중 아직 noindex 가 아닌 22편을 noindex=true. (청담디어·밝은눈 416~419 등은 R172/R178 에서 이미 처리돼 있었다)
-- 효과: medimap-blog 가 robots "noindex, follow" + 사이트맵 제외. 페이지 자체는 열린다.
-- 라이브 확인: #773 → <meta name="robots" content="noindex, follow"/> (X-Vercel-Cache MISS), 유지본 #597 → robots 메타 없음.
-- ⚠ #787(BGN 잠실)은 AI 인용 2건이 있었지만 유지본 #664 도 인용 2건 + 노출 1 이라 규칙대로 787 을 내렸다.

UPDATE generated_contents SET noindex = true
 WHERE id IN (787,595,742,796,799,832,809,696,847,756,817,757,815,693,670,727,773,825,710,781,737,791)
   AND status = 'published' AND channel = 'blog_html' AND COALESCE(lang,'ko') = 'ko'
   AND NOT COALESCE(noindex, false);

-- 되돌리기:
-- UPDATE generated_contents SET noindex = false
--  WHERE id IN (787,595,742,796,799,832,809,696,847,756,817,757,815,693,670,727,773,825,710,781,737,791);
