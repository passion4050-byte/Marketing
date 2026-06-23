# 라운드 80 — 종합 검증 체크리스트 (한 번에 체크)

> 2026-06-22 집에서 자동 진행 후 사용자가 한 번에 검증.
> Round 63~79 의 결과물(A/B 풀스택·AEO 프롬프트·HTML entity·이미지)이 다음 cron 부터 실제 작동하는지 확인.

---

## 0. 자동 진행 요약 (Claude 가 한 일)

| 항목 | 상태 | 결과 |
|---|---|---|
| HANDOFF.md 컨텍스트 파악 | ✅ | Round 63~79 17개 라운드 + 함정 CC~CI 파악 |
| Supabase DB 진단 | ✅ | 아래 §1 |
| 라이브 URL 2개 WebFetch | ✅ | /blog 정상(23편), /admin/ab-tests 게이트 정상 |
| Vercel 빌드 상태 | ⚠️ | personal account + project.json 없음 → 사용자 UI 확인 |
| cover NULL 패턴 진단 | ✅ | 6/19~22 cron 글 6편 cover NULL — Pollinations/Unsplash 실패 의심 |

---

## 1. Supabase DB 현황 (방금 확인)

| 테이블 | 행수 | 메모 |
|---|---|---|
| `tenants` | 7 | 정상 |
| `keywords` (active) | 46 | 정상 |
| `learned_insights` | 2 | 학습 인사이트 2개 존재 |
| `applied_insights` (is_active=true) | **0** | **적용 인사이트 없음** — Round 71 prompt 주입 인프라는 완성, 데이터 비어 있음 |
| `ab_tests` | **0** | **A/B 아직 안 돌아감** — Round 74 cron(주간 월요일) 트리거 대기 |

**자사 콘텐츠 (tenant_id=12 등):** published 18, draft 1, with_cover 20, no_cover 3
**파트너 콘텐츠:** published 14, draft 1, with_cover 10, no_cover 4

---

## 2. cover NULL 디테일 — 새 함정 후보 CJ

오늘(6/22) 새로 생긴 draft 2편 + 그 전 published 4편이 모두 cover NULL.

| id | tenant | status | provider | created | 제목 |
|---|---|---|---|---|---|
| 139 | 6 (jiwoo) | draft | gemini | 06-22 10:43 | jiwooclinic #139 |
| 138 | 12 (자사) | draft | gemini | 06-22 10:43 | 의료 GEO 최적화 #138 |
| 136 | 12 (자사) | published | gemini | 06-22 03:58 | 메디맵과 함께하는… (오늘 KST 12시 cron) |
| 135 | 9 (스킨) | published | gemini | 06-22 00:45 | 스킨부스터 #135 |
| 128 | 12 (자사) | published | gemini | 06-20 00:06 | 의료 GEO 최적화 #128 |
| 126 | 12 (자사) | published | gemini | 06-19 00:23 | 의료 GEO 최적화 #126 |

- 본문에 `<img>` 도 없음(`has_inline_img=false`) → cover 뿐 아니라 본문 일러스트도 누락.
- `cover_image_generated_at` 도 NULL → `generate_image_for_content()` 가 `None` 반환 또는 호출 자체가 안 됨.
- **Workflow default** 는 `IMAGE_GEN_ENABLED=true` (auto-publish.yml:61). Secret 미설정이어도 true 가 들어감.
- 즉 **함수가 호출됐는데 이미지 생성이 실패** 했을 가능성 높음 (Pollinations 5xx / Unsplash quota / 네트워크).

**확인 액션 (사용자):**
- [ ] GitHub Actions → `auto-publish` 최근 run 로그에서 `image_picker` 관련 라인 검색 (`is_enabled`, `Pollinations`, `Unsplash`, `IMAGE_GEN_ENABLED`)
- [ ] 만약 `IMAGE_GEN_ENABLED != true — 이미지 생성 skip` 가 보이면 → Secret 에 `IMAGE_GEN_ENABLED=true` 명시 추가
- [ ] 만약 Pollinations/Unsplash 가 5xx 면 → `Backfill drafts cover` 워크플로우 수동 트리거(dry_run=false)

---

## 3. 사용자 직접 액션 — GitHub UI (Claude 가 못 함)

### A. GitHub Secrets 확인 (Settings → Secrets and variables → Actions)

- [ ] `IMAGE_GEN_ENABLED` = `true` (또는 미설정이면 OK, default 가 true 임)
- [ ] `ENGINE_MODE` = `production` (AI 인용 실측정. stub 이면 측정 가짜)
- [ ] `ANTHROPIC_API_KEY` 존재 (fallback)
- [ ] `GOOGLE_API_KEY` 존재 (Gemini 무료 — 주력)
- [ ] `LLM_PROVIDER` = `fallback` (Gemini → Claude 순)
- [ ] `VERCEL_DEPLOY_HOOK` 존재 (auto-publish 후 medimap-blog 재배포)
- [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 존재

### B. GitHub Actions 수동 트리거

- [ ] **`A/B auto-generate`** → Run workflow → 완료 후 결과 확인:
  - `content-queue` 검수 큐에 A(베이스라인)/B(인사이트) 변형 2개 새로 생김
  - Supabase `ab_tests` 테이블 row 1개 이상
- [ ] **`Backfill drafts cover`** → dry_run=`true` Run → 대상 글 6편 확인
- [ ] **`Backfill drafts cover`** → dry_run=`false` Run → 실제 cover URL 채움
- [ ] **`auto-publish`** 마지막 run 로그 → image_picker 라인 검색

### C. Vercel 빌드 status (https://vercel.com/dashboard)

- [ ] **geo-v2** project → Deployments → 최신 commit 🟢 Ready
- [ ] **medimap-blog** project → Deployments → 최신 commit 🟢 Ready (Round 77~79 push 반영)

### D. Google Search Console (https://search.google.com/search-console)

- [ ] 속성 `medimap-blog-phi.vercel.app` → Sitemaps
- [ ] `/sitemap.xml` 상태 — "가져올 수 없음" → "성공" 으로 바뀌었는지 (24~48h 경과 후)
- [ ] 안 바뀌었으면 "제출" 버튼 다시 클릭

---

## 4. 화면 검증 체크리스트 (브라우저로 한 번에)

| URL | 체크 포인트 |
|---|---|
| https://medimap-blog-phi.vercel.app/ | 홈 정상, 카카오톡 플로팅, 한글 깨짐 없음 |
| https://medimap-blog-phi.vercel.app/blog | **23편 표시** (현재 확인됨), `&#x27;` 가 `'` 로 정상 디코드 (함정 CI fix) |
| https://medimap-blog-phi.vercel.app/blog/medical-geo-7-principles-87 | 자사 v3 재작성 글 — 실사 톤 이미지 |
| https://medimap-blog-phi.vercel.app/blog/medimap-insights-116 | 어제 entity 깨졌던 글 — 이제 `'` 정상 |
| https://medimap-blog-phi.vercel.app/sitemap.xml | XML 정상 (binary content-type OK) |
| https://geo-v2-beta.vercel.app/admin/login | 로그인 게이트 표시 (확인됨) |
| https://geo-v2-beta.vercel.app/admin/ab-tests | 로그인 후 → 페이지 정상 (데이터는 §3-B Run 후) |
| https://geo-v2-beta.vercel.app/admin/competitors?tenantId=4 | 기간 토글 7/30/90, 우리 병원 순위 강조 행 |
| https://geo-v2-beta.vercel.app/admin/citations | 기간 토글, 도메인 클릭 이동 |
| https://geo-v2-beta.vercel.app/admin/content-queue | FAQ 글 Q&A 미리보기, FAQ 카드 아이콘 |

---

## 5. 다음 cron 부터 적용되는 콘텐츠 품질 (Round 73 AEO 프롬프트)

- 현재 #134, #135 등은 **이전 생성물** — H2 자연어 질문 형식 미적용
- **다음 KST 08:00 cron** (또는 09:00 추정) 부터 새 글은:
  - H2 가 자연어 질문 (예: "라식 후 안약은 며칠 동안 넣어야 하나요?")
  - 정의형 첫 문장 (50자 이내)
  - 표/체크리스트 1개 이상
  - 4줄 단락
  - 1600×900 cover + 강화 프롬프트

검증 시점: **6/23 KST 12시 이후** 새 글 ID 가 생기면 그걸로 비교.

---

## 6. A/B 결과 타임라인 (현실적)

- ✅ **인프라**: 풀스택 완성 (Round 72~74)
- ⏳ **데이터**: 자동 트리거 수동 1회 → A/B 글 2개 큐 진입 → 검수 후 발행 → AI 측정 cron(매일 06:00 KST) 누적
- 🎯 **승자 판정**: 변형별 AI 인용 충분 표본 (현재 우리 점유 2.2% → 수 주 ~ 수개월)

⚠️ **한계는 데이터 누적 시간 — 코드 아님**

---

## 7. 새 함정 (이번 라운드 발견 시 SKILL 누적 후보)

- **CJ (의심)** — cron 발행 글 cover NULL 군집 발생. `IMAGE_GEN_ENABLED` default true 인데도 이미지 생성 실패.
  원인 후보: Pollinations 5xx 일시 장애 / Unsplash quota / 네트워크 / `is_enabled()` 가 빈문자열 평가 시 false.
  검증: GitHub Actions run 로그 → 결정 후 SKILL.md 누적 + Edit 으로 image_picker fallback 강화.

---

## 8. 한 번에 체크하기 — 최단 절차

1. **GitHub Actions** (https://github.com/passion4050-byte/Marketing/actions)
   - `A/B auto-generate` Run workflow → 2~3분 대기 → 완료
   - `Backfill drafts cover` Run workflow (dry_run=false) → 2분
   - `auto-publish` 최근 run 클릭 → image 관련 로그 줄 확인
2. **Vercel** (https://vercel.com/dashboard) → 두 프로젝트 🟢
3. **Search Console** → sitemap 상태
4. **블로그 + 어드민** → §4 URL 5~6개 새 탭으로 한 번에 확인
5. **결과 보고** → 함정 CJ 원인 + 다음 라운드 결정

---

생성: 2026-06-22 KST 사무실/집 이어가기 — Round 80 자동 진행 결과
