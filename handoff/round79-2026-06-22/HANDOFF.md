# 핸드오프 — 2026-06-22 (Round 63~79 완료)

> 사무실 → 집 이어가기. 오늘 작업 컨텍스트 + 집에서 바로 이어가는 절차 + 검증.

---

## 0. 집 PC 시작 절차 (가장 먼저)

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main
```

> ⚠️ 집 PC도 처음이면 인증/권한 이슈가 있을 수 있음 (오늘 사무실에서 겪은 함정 CF·CG 참고):
> - `git pull` 시 권한 거부 → 관리자 PowerShell `takeown`+`icacls` (함정 CF)
> - push 시 인증 → `git config --global credential.helper manager` → 브라우저 로그인 (함정 CG)

그다음 Claude 데스크탑앱:
1. 폴더 선택: `C:\Users\user\Documents\Marketing`
2. 첫 메시지: **"handoff/round79-2026-06-22/HANDOFF.md 읽고 오늘 컨텍스트 파악해줘"**

---

## 1. 오늘 commit list (전부 push 완료, 원격 main)

| 라운드 | 내용 |
|---|---|
| R63 | Anthropic prefill 제거(함정 CC) + Gemini 우선 fallback + 측정 GOOGLE_API_KEY 폴백 |
| R63 | llm.py module-level logger(함정 CD) + 측정 default engine_mode=production |
| R64 | 경쟁사/자사 인용 **키워드별 드릴다운**(엔진+콘텐츠) + Top10 차트 콤팩트 |
| R65~67 | **추이 분석 차트**(엔진 드롭다운/메디맵·클라이언트 분리/경쟁사 점유) |
| R66 | **우리 현황 패널** + 매트릭스 엔진 + 드릴다운 Fragment fix |
| R68 | 자사(메디맵) 선택 시 own 키워드로 경쟁 데이터 |
| R69~70 | **도메인 클릭 이동** + **경쟁사 상세에 우리 병원 순위 강조 행** |
| R71 | **적용 인사이트 발행 prompt 주입**(apply_insights) — '적용중' 인사이트가 실제 콘텐츠에 |
| R72 | **A/B 스키마 + 생성 엔진**(run_ab_test.py) |
| R73 | **A/B 측정·분석 에이전트**(run_ab_analysis.py + 워크플로우) + 실제 ab-tests 페이지/API + **AEO 프롬프트**(7-principles 강제) + **이미지 품질** + 우리현황 패널 명확화 + 키워드표기 + 차트 라벨 |
| R74 | **A/B 완전자동 트리거**(run_ab_auto.py + ab-auto-generate.yml) + ab-tests UIUX + **미리보기 FAQ 렌더** |
| R75 | 자사/경쟁사 **기간 필터(7/30/90일)** |
| R76 | 미리보기 FAQ fix(`<script ld+json>` 추출) |
| R77 | 블로그 리스트 썸네일 제거 + content-queue 카드 FAQ 미리줄 |
| R78 | 블로그 title/description **HTML 엔티티 디코드**(`&#x27;` 깨짐 영구 차단) |
| R79 | content-queue FAQ 카드 placeholder(FAQ 아이콘) |

`git log --oneline -25` 로 최신 확인.

---

## 2. 오늘의 새 함정 (다시 만나면 즉시 인식)

| 코드 | 함정 | 정답 |
|---|---|---|
| **CC** | Sonnet 4.6 등 일부 모델 assistant prefill 미지원 → 400 | prefill 제거, 정규식 파서 의존 |
| **CD** | llm.py logger 미정의 → fallback 모드에서만 NameError | `import logging` + `logger=getLogger` |
| **CE** | Cowork sandbox mount 스테일/truncation (편집 직후 esbuild 가짜 에러) | Read 도구가 진실, Vercel 빌드가 권위 검증 |
| **CF** | repo `C:\Users\user\` 인데 로그인 계정 `owner` → .git 쓰기 거부 | 관리자 `takeown`+`icacls` |
| **CG** | git push 비번 인증 폐지 + 터미널 붙여넣기 화살표 escape | `credential.helper manager` → 브라우저 로그인 |
| **CH** | schema_org 본문 = `<script ld+json>` 래핑 → HTML 브랜치서 script 렌더 → 빈 화면 | ld+json 감지해 JSON 추출 후 Q&A 렌더 |
| **CI** | 블로그 title/description 에 `&#x27;` 노출 (본문 HTML은 브라우저 자동 디코드, text는 아님) | posts.ts dbRowToPostMeta 에서 decodeEntities |

---

## 3. 남은 작업 / 다음 액션

### 즉시 (운영)
- [ ] **Backfill drafts cover** 워크플로우 실행 → 빈 커버 블로그 draft 에 이미지 생성 (dry_run=true 로 대상 확인 후 false 로 실제)
- [ ] GitHub Secret **`IMAGE_GEN_ENABLED=true`** 확인 (이게 꺼져 #134 등 커버 null 이었을 가능성)
- [ ] GitHub Secret **`ENGINE_MODE=production`** 확인 (AI 인용 측정 실제 동작)
- [ ] sitemap GSC "가져올 수 없음" — 재제출 후 24~48h 경과 확인 (코드 정상, GSC 지연)

### A/B 시스템 (인프라 완성, 결과는 시간 필요)
- A/B 완전자동 트리거 = `ab-auto-generate.yml` (월요일 주간 cron). 적용 인사이트 있는 병원 키워드를 골라 A(베이스라인)/B(인사이트) 변형 2개를 검수 큐에 생성.
- A/B 측정·분석 = `ab-analysis.yml` (매일 06:00 KST). 변형 URL별 AI 인용수 비교 → 충분 표본+명확 차이면 자동 승자.
- ⚠️ **결과(승자)는 수 주~수개월** — 현재 우리 점유 2.2%, 측정 누적 필요. 코드 한계 아닌 데이터 한계.
- 첫 검증: Actions → "A/B auto-generate" 수동 Run → content-queue 에 A/B 2개 생성 + /admin/ab-tests 표시 확인.

### 콘텐츠 품질 (다음 cron 발행부터 적용)
- AEO 프롬프트(R73) → 새 글이 H2 자연어 질문·정의형 문장·표/체크리스트·4줄 단락 형태로. 기존 #134/#135 는 이전 생성물이라 그대로.
- 이미지 품질(R73) → 새 cover 가 1600×900 + 강화 프롬프트.

---

## 4. 라이브 URL / 인프라

| 사이트 | URL | 용도 |
|---|---|---|
| medimap-blog | https://medimap-blog-phi.vercel.app | 자사 블로그 (SSG, AEO 자산) |
| admin (geo-v2) | https://geo-v2-beta.vercel.app | 운영자 콘솔 (인용분석·A/B·검수큐) |
| GitHub | https://github.com/passion4050-byte/Marketing | private repo, main |
| Supabase | project `blogkey` (gifopyowyankfsfghhdi) | DB (ab_tests 등 R72 스키마 적용됨) |

**Vercel 2 프로젝트**: `geo-v2`(admin) + `medimap-blog`(블로그) — push 시 둘 다 자동 배포.

---

## 5. 검증 체크리스트 (집에서 git pull 후 / 새 배포 후)

- [ ] Vercel **geo-v2 + medimap-blog 둘 다 🟢 Ready**
- [ ] `/blog` — 썸네일 없음 + `&#x27;` 가 `'` 로 정상
- [ ] `/admin/competitors?tenantId=4` — 기간 토글(7/30/90), 우리 병원 순위 행, 도메인 클릭 이동, 차트 라벨 다 보임
- [ ] `/admin/citations` — 기간 토글, 도메인 클릭
- [ ] `/admin/content-queue` — FAQ 글 미리보기 Q&A, FAQ 카드 아이콘
- [ ] `/admin/ab-tests` — 페이지 정상 (A/B 생성 후 데이터 표시)

---

## 6. 핵심 운영 메모

- **LLM_PROVIDER=fallback** (Gemini 무료 주력 → 막히면 Claude). Gemini 무료 = 하루 20콜 한계.
- **편집 검증은 Vercel 빌드** (mount 스테일로 로컬 tsc 불가 — 함정 CE).
- **push는 GCM 브라우저 인증** (함정 CG 해결됨, 한 번 인증하면 캐시).
- **DB 스키마 변경은 Supabase MCP** (apply_migration). ab_tests 는 이미 적용됨.

---

오늘 Round 63~79 누적 — 파이프라인 복구부터 경쟁사 분석 UI·A/B 풀스택·콘텐츠 품질까지. 집에서 이 파일 + Claude 앱으로 자연스럽게 이어집니다.
