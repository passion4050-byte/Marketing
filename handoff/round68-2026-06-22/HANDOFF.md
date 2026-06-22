# 핸드오프 — 2026-06-22 (Round 63~68 완료)

> 집/사무실 PC 이어가기용 컨텍스트. 오늘 함정(CC·logger·mount·git) + 새 기능 정리.

---

## 0. 오늘 commit list (전부 push 완료, 원격 main)

| Hash | 라운드 | 내용 |
|---|---|---|
| 01d3e76 | R63 | Anthropic prefill 제거(함정 CC) + Gemini 우선 fallback + 측정 GOOGLE_API_KEY 폴백 |
| 8b4a8cb | R63 fix | `llm.py` module-level logger 추가 (fallback NameError) |
| 7b1d2ff | R63 | 측정 워크플로우 default engine_mode=production (stub 함정 제거) |
| 13c3c14 | R64 | 경쟁사/자사 인용 **키워드별 드릴다운**(엔진+콘텐츠) + Top10 차트 콤팩트화 |
| e5cc5e3 | R65 | 경쟁사 페이지 **추이 분석 차트** (키워드 드롭다운 + 토글) |
| 511ab98 | R66 | 추이 경쟁사 점유+우리 라인 + **우리 현황 패널** + 매트릭스 엔진 + 드릴다운 Fragment fix |
| 826cf8f | R67~68 | 추이 엔진 드롭다운/메디맵·클라이언트 분리 + 패널 명확화 + 키워드 clamp fix + 메디맵 안내배너 + **자사 선택 시 own 키워드 경쟁 데이터** |

**현재 최신 commit**: `826cf8f` (Vercel geo-v2 🟢 Ready)

**미해결(다음 작업)**: sitemap "가져올 수 없음" (Google Search Console) — 별도 진행 예정.

---

## 1. 오늘 발견한 함정 (★ 새 환경/코드 함정 — 다시 만나면 즉시 인식)

### CC (CRITICAL) — Anthropic 모델 prefill 미지원
- 증상: cron #74 exit 3, errors=2, drafts=0, **비용 $0** (400 은 토큰 청구 전 거부).
- 로그: `Anthropic 호출 실패: 400 invalid_request_error — This model does not support assistant message prefill`.
- 원인: Sonnet 4.6 등 일부 모델이 assistant prefill(`{"role":"assistant","content":"{"}`)을 거부. Round 58 의 BU fix(prefill)가 모델 비호환으로 역효과.
- 정답: `generate_blog_post`/`generate_faq` 에서 prefill + 직후 `{` prepend 제거. `_parse_blog_json`/`_parse_qa_json` 가 정규식으로 JSON 추출하므로 안전.
- 교훈: prefill 같은 모델별 비표준 트릭보다 **견고한 파서**에 의존. (근본 해법: Tool use structured output)

### CD — llm.py module-level logger 누락 (fallback 모드에서만 발현)
- 증상: cron #76 `name 'logger' is not defined`, blog_html·schema_org 둘 다.
- 원인: `FallbackProvider.__init__`/`_build_provider_chain` 이 `logger.info/warning` 사용하는데 llm.py 에 `logger` 정의 없음. `LLM_PROVIDER=anthropic` 단일 모드에선 FallbackProvider 미생성이라 안 드러났던 잠복 버그.
- 정답: `import logging` + `logger = logging.getLogger(__name__)` 추가.
- 교훈: provider/엔진 추가 시 그 모듈의 logger 정의 여부 항상 확인.

### CE — Cowork sandbox mount 스테일/truncation (환경)
- 증상: 방금 Write/Edit 한 파일을 bash 마운트(`/sessions/.../mnt/...`)로 읽으면 **잘린(EOF) / null 바이트(`콘�`)** 로 보임. `git status` 도 과장. esbuild/py_compile 가 가짜 syntax error.
- 정답: **Read 도구(호스트)가 진실**. bash 마운트로 편집 직후 검증 금지. 독립 검증은 `/tmp` 클론에 동일 편집 적용 후 esbuild, 또는 **Vercel 빌드가 권위적 typecheck**.
- 교훈: 마운트 기반 grep/compile 결과가 의심스러우면 Read 로 재확인.

### CF — git 권한 (Windows 크로스 계정)
- 증상: PowerShell `git fetch/reset/config` 전부 `Permission denied` (.git/FETCH_HEAD, index.lock, config).
- 원인: repo 가 `C:\Users\user\...` 인데 로그인 계정 `owner` → `.git` 쓰기 권한 없음. 6/1 이후 fetch 불가로 로컬 R57 고착 + CRLF 노이즈 477파일.
- 정답: **관리자 PowerShell** `takeown /f "경로" /r /d y` + `icacls "경로" /grant "$($env:USERNAME):(OI)(CI)F" /t` → 이후 `git fetch && git reset --hard origin/main` + `git config core.autocrlf true`.

### CG — git push 인증 (PAT/비밀번호 폐지)
- 증상: `git push` → `Password authentication is not supported`. 터미널에 토큰 붙여넣기도 화살표키 escape(`%1B%5BD`) 섞여 실패.
- 정답: `git config --global credential.helper manager` → `git push` 시 **브라우저 로그인** 창. (이후 자동 캐시). 또는 PAT(classic, `repo`+`workflow` scope)로.
- 주의: 워크플로우 파일(.github/workflows) push 는 PAT 에 **`workflow` scope 필수**.

---

## 2. 새 기능 (오늘 추가, 운영 메모)

### 콘텐츠 발행 (자동 cron)
- **LLM_PROVIDER=fallback** (GitHub Secret) — Gemini(무료) 주력 → 막히면 Claude(유료) 자동 대체.
- 코드 체인 순서: **Gemini > Anthropic > OpenAI > Stub** (`_build_provider_chain`).
- ⚠️ **Gemini 무료 tier = 하루 20요청**. 초과 시 429 → Claude 로 강등(유료). 발행량 늘면 Gemini 유료 전환 검토.

### AI 인용 측정 (경쟁/시장 모니터링)
- **ENGINE_MODE=production** (GitHub Secret) — 매일 07:00 KST 스케줄 측정이 실제 4엔진(claude/gemini/perplexity/openai) 호출. (기본 stub = 가짜 데모. 반드시 production 유지)
- 측정 워크플로우 default engine_mode 도 production 으로 변경 (수동 실행 함정 제거).
- 자사 own 키워드: `Measure AI mentions`. 경쟁사 keyword: `Measure competitor mentions` (별도).
- `GOOGLE_API_KEY || GEMINI_API_KEY` 폴백 추가.

### 어드민 — 인용 분석 UI 고도화 (geo-v2)
- **키워드별 드릴다운** (`CitationBreakdown.tsx`): 도메인 행 펼침 → 키워드 → 인용수 → AI 엔진 → 콘텐츠 URL. 경쟁사·자사 양쪽.
- **추이 분석 카드** (`TrendAnalysisCard.tsx`, `/api/admin/competitors/trends`): 30일 멀티라인.
  - 탭 "경쟁사 점유 현황": 메디맵(파랑)·선택 클라이언트(민트)·경쟁사 도메인 top6.
  - 탭 "AI 엔진별 인용": + 엔진 드롭다운(한 엔진 필터).
  - 키워드 드롭다운. (클라이언트별 탭은 R67 에서 제거)
- **우리 현황 패널**: 점유율 스택 바 + 메디맵 GEO 콘텐츠(T1)/병원 홈페이지(T2) 분해.
- 키워드 매트릭스에 **AI 엔진별 인용 횟수** 컬럼.
- **메디맵(자사) 선택 시 own 키워드로 경쟁 데이터** 표시 (R68). 그 외 클라이언트는 competitor_landscape.
- 키워드 셀 `line-clamp-1`(td 직접) → div+`line-clamp-2` (2줄 잘림 fix).

---

## 3. 라이브 URL

| 사이트 | URL | 용도 |
|---|---|---|
| medimap-blog | https://medimap-blog-phi.vercel.app | 자사 블로그 (SSG, AEO 자산) |
| admin v2 (geo-v2) | https://geo-v2-beta.vercel.app | 운영자 콘솔 (인용 분석 등) |
| GitHub | https://github.com/passion4050-byte/Marketing | private repo |
| Search Console | https://search.google.com/search-console | SEO 모니터링 |

---

## 4. 다음 작업 (우선순위)

1. **sitemap "가져올 수 없음" 수정** (진행 예정) — `medimap-blog-phi.vercel.app/sitemap.xml` 을 Google 이 못 읽음. route/content-type/SSG 진단.
2. 핸드오프 R62 의 미완 항목: 클라이언트 이메일 등록(밴스모자이너·BGN·바를정·벨리셀 등), 발송일 분산.
3. Anthropic API key 보안 — POC 중 노출. (단, 현재 fallback 으로 동작 중) 필요 시 revoke + 재발급.
4. 콘텐츠 검수 큐 운영 (geo-v2 /admin/content-queue).

---

## 5. 빠른 컨텍스트 복원 시퀀스 (새 세션)

> "오늘 작업 이어가기:
> 1. handoff/round68-2026-06-22/HANDOFF.md 읽기
> 2. SKILL.md 의 Round 58~62 + 함정 CC 섹션 훑기
> 3. `git log --oneline -10` 으로 최신 확인 (최신 826cf8f 이후 있는지)
> 4. 작업 환경: repo `C:\Users\user\Documents\Marketing`, push 는 GCM 브라우저 인증, 편집 검증은 Vercel 빌드"

---

오늘 Round 63~68 누적. 핵심 파이프라인 복구 + 경쟁사 분석 UI 대폭 고도화 완료. 다음은 sitemap.
