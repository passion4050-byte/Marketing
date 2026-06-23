# 내일 사무실 이어가기 가이드 — 2026-06-23

> 어제(6/22 일) 집에서 Round 80 자동 진단 완료. 사무실 PC 에서 이어가는 단방향 절차.
> 핵심: 어제 발견한 **cover NULL 군집(함정 CJ 후보)** 과 **A/B 첫 실행** 결정.

---

## 0. 사무실 PC 시작 절차 (5분)

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main
```

> 만약 어제 집에서 CHECKLIST 를 push 안 했으면 사무실에는 없음. 이 경우엔 어제 집 PC 켜서 push.

Claude 데스크탑앱:
1. 폴더 선택: `C:\Users\user\Documents\Marketing`
2. 첫 메시지:
   ```
   handoff/round80-2026-06-22-checklist/TOMORROW-OFFICE-RESUME.md 읽고
   어제 결과 점검 + Round 81 시작
   ```

---

## 1. 어제 집에서 확인한 사실 (3분 읽기)

### DB 진단 결과
- `ab_tests` = **0 rows** (A/B 인프라는 완성, 트리거 안 됨)
- `applied_insights` (active) = **0** (학습 인사이트 2개 있지만 적용 토글 안 켬)
- `learned_insights` = 2개
- cover NULL = **6편** (id 126, 128, 135, 136, 138, 139 — 모두 6/19~22 cron)

### cover NULL 패턴 (새 함정 CJ 후보)
- 전부 `gemini` provider · 본문 `<img>` 없음 · `cover_image_generated_at` NULL
- 코드 분석: `IMAGE_GEN_ENABLED` default 'true' (auto-publish.yml:61) — Secret 미설정이어도 활성화
- 즉 **함수가 호출됐는데 Pollinations + Unsplash 둘 다 실패** 했다는 의미
- **결론은 GitHub Actions 로그를 직접 봐야 나옴**

### 라이브 검증
- ✅ `/blog` 23편 정상 표시, `&#x27;` 디코드 정상
- ✅ `/admin/login` 게이트 정상
- ⚠️ Vercel 빌드는 Claude 가 확인 못 함 (personal account · MCP team 권한 없음)

---

## 2. 사무실에서 가장 먼저 (15분, 너만 가능)

### A. GitHub Actions 결과 확인 (https://github.com/passion4050-byte/Marketing/actions)

**1) `auto-publish` 최근 run 클릭 → 로그 검색**
- `IMAGE_GEN_ENABLED` 가 어떻게 평가됐는지 (`is_enabled() == True` 여야 정상)
- `Pollinations` / `Unsplash` 키워드 → 5xx 에러 또는 timeout 있나
- 결정 분기:
  - 만약 `IMAGE_GEN_ENABLED != true` 로그 → Secret 에 명시적으로 `true` 추가
  - 만약 Pollinations 5xx 반복 → fallback 강화 (Round 81-A)
  - 만약 Unsplash quota → API key 갱신

**2) `A/B auto-generate` 워크플로우 수동 트리거 (첫 실행)**
- Actions → `A/B auto-generate` → Run workflow
- 2~3분 대기 → 완료 후 Supabase `ab_tests` row 1개 이상 확인
- `/admin/content-queue` 에 A/B 변형 2개 표시 확인

**3) `Backfill drafts cover` 트리거 (cover 채우기)**
- 먼저 dry_run=`true` 로 실행 → 대상 6편 확인
- 결과 OK 면 dry_run=`false` 로 재실행 → 실제 cover URL 채움

### B. Vercel 대시보드 (https://vercel.com/dashboard)
- `geo-v2` 최신 빌드 🟢
- `medimap-blog` 최신 빌드 🟢

### C. GitHub Secrets 점검 (Settings → Secrets and variables → Actions)
- `IMAGE_GEN_ENABLED` = `true` (또는 미설정 OK)
- `ENGINE_MODE` = `production`
- `GOOGLE_API_KEY` 존재
- `ANTHROPIC_API_KEY` 존재
- `VERCEL_DEPLOY_HOOK` 존재

### D. Search Console (https://search.google.com/search-console)
- `medimap-blog-phi.vercel.app` → Sitemaps → `/sitemap.xml` 상태 변화 (24~48h 경과 후 "성공"으로)

---

## 3. Round 81 후보 작업 (우선순위 순)

| 우선순위 | 작업 | 트리거 조건 |
|---|---|---|
| 🔴 P0 | **함정 CJ 확정 + fix** — cover NULL 원인 코드 수정 + SKILL.md 누적 | §2-A-1 로그 결과에 따라 |
| 🟠 P1 | **A/B 첫 실행 결과 검증** — content-queue 에 A/B 2개 + ab_tests row 표시 | §2-A-2 실행 후 |
| 🟠 P1 | **적용 인사이트 활성화** — learned_insights 2개 검토 → /admin 에서 "적용" 토글 → applied_insights row 생성 → 다음 cron 글에 반영 | DB 진단에서 발견 |
| 🟡 P2 | **AEO 프롬프트 효과 검증** — 6/23 KST 12시 cron 글이 H2 자연어 질문 / 표 / 4줄 단락 적용됐는지 | 자동 발행 후 |
| 🟢 P3 | **A/B 측정 데이터 누적** — ab-analysis.yml 매일 06:00 cron 작동 확인 | A/B 발행 후 |

---

## 4. 어제 작업의 미해결 항목

- [ ] **CHECKLIST.md push** — 어제 집 PC 에서 commit + push 했는지 확인. 안 했으면 사무실에서는 없음
- [ ] cover NULL 6편 원인 확정 (§2-A-1)
- [ ] A/B 첫 트리거 (§2-A-2)
- [ ] Backfill cover 실행 (§2-A-3)
- [ ] Round 81 결정 (P0~P3 중)

---

## 5. 어제 push 안 했으면 (집 PC 에서 먼저)

집 PC 에서:
```powershell
cd "C:\Users\user\Documents\Marketing"
git status                # round80-2026-06-22-checklist/ 새 폴더 확인
git add handoff/round80-2026-06-22-checklist/
git commit -m "Round 80 핸드오프 — 집 진단 결과 + 내일 사무실 가이드"
git push origin main
```

만약 push 시 GCM 인증 화면 안 뜨면:
```powershell
git config --global credential.helper manager
git push origin main      # 브라우저 로그인
```

---

## 6. 빠른 컨텍스트 복원용 핵심 문서

| 파일 | 용도 |
|---|---|
| `handoff/round79-2026-06-22/HANDOFF.md` | 어제 사무실 작업(Round 63~79) 핸드오프 |
| `handoff/round80-2026-06-22-checklist/CHECKLIST.md` | 어제 집 진단 결과 + 너의 직접 체크리스트 |
| `handoff/round80-2026-06-22-checklist/TOMORROW-OFFICE-RESUME.md` | **이 파일** — 사무실 첫 30분 가이드 |
| `SKILL.md` | Round 1~79 누적 (함정 CC~CI 명시) |
| `.planning/PROJECT.md` | 프로젝트 전체 컨텍스트 |

---

## 7. 사무실 PC 환경 메모 (어제 함정)

- repo path 가 `C:\Users\user\Documents\Marketing` 인데 로그인 계정이 `owner` 일 수 있음 → `.git` 쓰기 거부 시 관리자 PowerShell `takeown`+`icacls` (함정 CF)
- git push 시 GCM 브라우저 인증 필요 (함정 CG, 한 번 인증하면 캐시됨)
- Cowork sandbox mount 스테일 있음 → 편집 후 esbuild 가짜 에러는 무시, Vercel 빌드가 권위 (함정 CE)

---

생성: 2026-06-22 KST 집 — Round 80 자동 진단 후 사무실 이어가기용
