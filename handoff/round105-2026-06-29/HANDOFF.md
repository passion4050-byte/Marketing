# wecircle GEO/AEO SaaS — 핸드오프 Round 105 (2026-06-29)

> Round 82~104-c 종합. 사무실 세션(Round 102~104-c) push 완료 + 집 세션(Round 105) 이미지 강화 진입 지점.
> 다음 세션 이어가기용.

---

## 0. 집/사무실에서 이어가기

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main
```
Claude 데스크탑앱 → 폴더 `C:\Users\user\Documents\Marketing` 선택 →
첫 메시지: **"handoff/round105-2026-06-29/HANDOFF.md 읽고 컨텍스트 파악 + 이어서 작업"**

---

## 1. 라이브 URL / 인프라

- **자사 콘텐츠**: https://wecircle.co.kr (Round 90 커스텀 도메인)
- 어드민: https://geo-v2-beta.vercel.app
- GitHub: https://github.com/passion4050-byte/Marketing (main, 최신 commit `16e9eb4`)
- Supabase: `gifopyowyankfsfghhdi` (Supabase MCP)
- Vercel 프로젝트 2개 (geo-v2 + medimap-blog) — 각각 자동배포

---

## 2. Round 102~104-c 완료 (사무실 세션에서 push)

### Round 102 — wecircle.co.kr 도메인 마이그레이션 완결
- 측정 자사판별 버그 (medimap → wecircle 도메인 인용 인식) 수정
- IndexNow / sitemap / admin 도메인 정합

### Round 103 — Claude·ChatGPT 도메인 인용 측정 활성화
- 3엔진 웹검색 활성 → 오늘까지는 Gemini 도메인 인용만 채워졌지만, 다음 cron 부터 Claude/OpenAI 도 채워짐
- 대시보드 추이 "Claude/ChatGPT 데이터 부족" = 버그 아님. 오늘부터 누적 시작

### Round 104 — 대시보드 전면 고도화 (4단계)
- ①-a/b/c: 세부경로 추적 + 드릴다운 + 자동학습 (경쟁사 인용 경로 학습)
- ②: Top 콘텐츠 압축
- ③: 차트 세부데이터
- ④: 홈 빈영역 측정·엔진 현황 카드 + 톤 정리

### Round 104-b — ①-c 자동학습 (DB 직접)
- `learned_insights` 진료과별 5건 등록 (id 8~12: 안과·자사·피부과·모발이식·한방)
- source_url=`internal://competitor_citations`, applied=false → 사용자 토글 후 자동 주입

### Round 104-c — 썸네일 다양성 + 엔진 필터 + ①-c 적용
- **썸네일**: `unsplash_client.py search_unsplash_photo` → alt_description 인물단어 후순위 + 상위 8 후보 중 랜덤 선택. **신규 생성 글부터 적용** (기존 draft 171 등은 재생성 시 교체)
- **엔진 클릭 필터**: `urlsByEngine` 추가, `CitationBreakdown.tsx` 엔진 칩 클릭 시 해당 엔진 URL 만 표시
- **①-c 적용중 토글 ON** (SQL 직접): 5건 전부 applied=true → 다음 cron 글부터 진료과별 경쟁사 인용 주제 prompt 주입

---

## 3. Round 105 (오늘 밤 집 세션) — 이미지 이중 안전망 강화

### 이유

Round 104-c 조치 (unsplash_client 레벨 인물 후순위 + 랜덤) 만으로는 부족:
- Unsplash 자체가 "clinic doctor" 검색해도 백인 결과가 대부분
- 인물 후순위만으로는 여전히 백인 배경/의사 등장 가능
- 사용자 요구 = "한국 모델 원함, 외국인 지양" — 정확도 100% 필요

### 조치

- `keyword_to_unsplash_query` 를 **사람 없는 "clinic interior equipment"** query 로 통일 (Round 105)
- 자사 인사이트 Unsplash 을 **옵트인** 으로 강등 (`USE_UNSPLASH_FOR_SELF_CONTENT=true` 시에만) → DALL-E 실패 시 Pollinations realistic ("no people") 로 바로

### 변경 파일

- `src/content/image_picker.py` (Round 105)
- `handoff/round105-2026-06-29/HANDOFF.md` (신규)
- `SKILL.md` (Round 105 누적)

---

## 4. DB 상태 (2026-06-29 실측)

### 발행 콘텐츠 (Round 82 이후 누적)

| tenant | 발행 | 검수 대기 | compliance_fail |
|---|---|---|---|
| BGN 밝은눈안과 (4) | 3 | 0 | 0 |
| 밴스모자이너 (5) | 4 | 0 | 0 |
| 지우피부과 (6) | 6 | 0 | 0 |
| 바를정 한방 (8) | 3 | 0 | 0 |
| 벨리셀 피부과 (9) | 4 | 0 | 0 |
| 밝은눈안과 부산 (10) | 3 | 0 | 0 |
| 메디맵 자사 (12) | 13 | 2 | 1 |
| **합계** | **36** | **2** | **1** |

### AI 측정 (BGN=4, 30일)

- gemini 145 queries → 110 mentions (68% 언급률) ✅ 정상
- claude 103 queries → 46 mentions (34% 언급률) ✅ 정상
- openai 23 queries → **0 mentions** (실제 응답에는 4.3% 언급, 파싱 실패 아님) ⚠️ AI 학습 데이터 상 BGN 노출 부족

### 자동 학습 (Round 96 + 104-b)

- `learned_insights` 11건 누적: AUTO 6건 + T5 도메인 5건 + Round 104-b 5건 (진료과별)
- Round 104-c 에서 5건 전부 applied=true 처리 → 다음 cron 글부터 반영

### 이미지 소스 분포 (id 165~174)

- Unsplash: 3건 (자사, 외국인 문제) — Round 105 강화로 신규 발행부터 개선
- Pollinations: 3건 (파트너, "no people")
- **DALL-E: 0건** ← 유료 결제인데 GH Secret OPENAI_API_KEY 미등록 의심

---

## 5. 🔴 사용자 즉시 액션

### 5-1. GitHub Actions Secrets 재확인 (5분)

Settings → Secrets and variables → Actions:

| Secret | 값 | 용도 |
|---|---|---|
| `OPENAI_API_KEY` | `sk-proj-...` | **DALL-E 3 + OpenAI 측정 (필수)** |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude 측정 + 자사글 라우팅 |
| `GEMINI_API_KEY` | `AIza...` | Gemini 측정 + 파트너글 |
| `UNSPLASH_ACCESS_KEY` | 이미 등록 | fallback |
| `LLM_PROVIDER` | `gemini` (선택, 소문자, 공백/따옴표 없이) | 미설정 시 warning 뜨지만 정상 fallback |
| `IMAGE_PROVIDER` | `dalle` (선택, default) |  |
| `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 이미 등록 |  |

**OPENAI_API_KEY 등록 확인 후 auto-publish workflow 수동 Run** → 로그에서 `dalle.enabled` / `dalle.api_call` / `dalle.url_received` 라인 확인. `dalle.disabled` 뜨면 여전히 문제.

### 5-2. GSC + 네이버 서치어드바이저 sitemap 재제출 (10분)

**Google Search Console:**
1. https://search.google.com/search-console/
2. 좌측 속성 선택 → wecircle.co.kr (없으면 "속성 추가" → "도메인" → wecircle.co.kr → TXT 레코드 가비아 DNS 등록)
3. 좌측 메뉴 "Sitemaps" 클릭
4. 새 sitemap URL 입력: `sitemap.xml` (그냥 파일명. 도메인은 자동 prepend)
5. "제출" 클릭
6. 성공 시 상태 "성공" + 발견된 URL 수 표시. 실패 시 URL 형식/robots.txt 확인
7. 며칠 후 "색인 생성 범위" 에서 색인 페이지 수 확인

**네이버 서치어드바이저:**
1. https://searchadvisor.naver.com/
2. "웹마스터 도구" → 사이트 등록 → wecircle.co.kr
3. HTML 태그 인증 (Vercel 은 next.js metadata 로 verification meta 추가 가능) 또는 HTML 파일 업로드 (public 폴더에 넣고 push)
4. 인증 완료 → "요청 → 사이트맵 제출" → `https://wecircle.co.kr/sitemap.xml`
5. "요청 → RSS 제출" → 있으면 추가
6. "요청 → 웹 페이지 수집" 에서 개별 페이지 직접 크롤 요청 가능 (홈 + 주요 콘텐츠 5~10개)

### 5-3. /admin/learned-insights (Round 104-b 이미 완료)

- ①-c 는 이미 오늘 낮에 사용자 요청으로 적용 완료 (5건 applied=true)
- 그 외 id=6 "표 평균 0.8개" baseline 은 아직 미토글 상태 — 원한다면 UI 에서 토글

---

## 6. 다음 라운드 후보 (Round 106+)

- **#3 측정·엔진 현황 카드 고도화** (사무실 세션 큐): 홈 카드 엔진 클릭 → per-engine 수치 + 인용 숫자 클릭 → 콘텐츠 드릴다운
- DALL-E 실제 호출 성공 검증 (Secret 확인 후 workflow run)
- Claude/ChatGPT 도메인 인용 채움 확인 (Round 103 웹검색 활성 후 며칠)
- 자동학습 적용된 cron 글에 경쟁사 주제 반영 검증 (Round 104-b/c 이후 다음 cron)
- medimap-blog AI 인용 0건 → wecircle.co.kr 첫 인용 감지 모니터링
- 검수 대기 draft 재생성 (id 171, 173, 174 — Round 104-c 이후로 재생성하면 개선된 썸네일)

---

## 7. 함정 누적 (Round 82~105)

- **DK** Auto Pattern Learning Threshold (Round 96)
- **DL** 두 Vercel 프로젝트 분리 빌드 (Round 98)
- **DM** DALL-E GH Secret OPENAI_API_KEY 미등록 의심 (Round 102/105)
- **DN** LLM_PROVIDER='***' warning 오탐 (실제로는 FallbackProvider 로 정상 Gemini)
- **DO** Round 104-c unsplash_client 인물 후순위만으론 부족 → Round 105 image_picker query 통일 강화

이전 함정 CK~CS 는 round81 handoff 참조.

---

생성: 2026-06-29 집 — Round 104-c 사무실 push 후 이미지 이중 안전망 추가 (Round 105).
