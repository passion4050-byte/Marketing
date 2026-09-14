-- Round 203 (2026-09-14) — citation_events 의 medi-map.co.kr 허수 14행 제거
--
-- 원인: scripts/collect_citation_events.py SELF_HOSTS 에 Round 197 이 medi-map.co.kr 을
--       "구 브랜드 도메인" 으로 넣었다. 실제로는 전 직장 메디맵의 병원찾기 플랫폼이다.
--       14행 전부 /search?q=… · /hospital/view/… · /event?… · /contents/view/7 ·
--       global.medi-map.co.kr — content_id 전부 null, 우리 글 0건.
--
-- ⚠ 실행 순서: 스크립트 수정 커밋이 main 에 반영된 **뒤** 실행할 것.
--   먼저 지우면 measure-ai-mentions.yml 의 collect 단계(DAYS=30)가 옛 코드로 다시 넣는다.
--
-- 백업 (id · response_id · engine · tenant_id · keyword_id · cited_url):
--   24  9962  claude 4  746 https://medi-map.co.kr/search?q=%EB%B0%9D%EC%9D%80%EB%88%88%EC%95%88%EA%B3%BC
--   25  10380 claude 4  746 (동일 search URL)
--   26  5234  gemini 6  25  https://global.medi-map.co.kr/
--   32  9446  claude 4  746 (동일 search URL)
--   33  7300  gemini 4  13  https://medi-map.co.kr/event?department=%EC%95%88%EA%B3%BC&subDepartment=%EB%9D%BC%EC%8B%9D%C2%B7%EB%9D%BC%EC%84%B9
--   34  4115  gemini 6  25  https://global.medi-map.co.kr/
--   35  3631  gemini 4  124 https://medi-map.co.kr/hospital/view/H000026
--   36  8888  claude 4  545 https://medi-map.co.kr/contents/view/7
--   40  12040 gemini 9  756 https://medi-map.co.kr/hospital/view/H000097/%EB%B2%A8%EB%A6%AC%EC%85%80%EC%9D%98%EC%9B%90
--   102 13029 claude 4  746 (동일 search URL)
--   105 13011 claude 19 547 https://medi-map.co.kr/contents/view/7
--   137 13449 claude 4  746 (동일 search URL)
--   165 13869 claude 4  746 (동일 search URL)
--   189 14289 claude 4  746 (동일 search URL)
-- 복구가 필요하면 원본 responses 에서 재생성 가능(response_id 기준).

-- 사전 확인: 14 이어야 한다
SELECT count(*) FROM citation_events
WHERE NOT (cited_url ~* '^https?://([a-z0-9-]+\.)*(wecircle\.co\.kr|medimap-blog-phi\.vercel\.app)([/?#:]|$)'
        OR cited_url ~* '^([a-z0-9-]+\.)*(wecircle\.co\.kr|medimap-blog-phi\.vercel\.app)$');

DELETE FROM citation_events
WHERE NOT (cited_url ~* '^https?://([a-z0-9-]+\.)*(wecircle\.co\.kr|medimap-blog-phi\.vercel\.app)([/?#:]|$)'
        OR cited_url ~* '^([a-z0-9-]+\.)*(wecircle\.co\.kr|medimap-blog-phi\.vercel\.app)$');
