# 메디맵 GEO/AEO SaaS — 핸드오프 Round 81 (2026-06-23)

> 사무실에서 하루 종일 진행. 집에서 이어가기용. 핵심: **의료법 컴플라이언스 안전망 복원**(가장 큰 발견) + 진료과 정밀매칭 + USD 실토큰 미터링 + AEO 표/목록 렌더 + 보안 fail-closed.

---

## 0. 집에서 이어가기 (5분)

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main      # 권한 거부 시 관리자 takeown+icacls (함정 CF)
```
Claude 데스크탑앱 → 폴더 `C:\Users\user\Documents\Marketing` 선택 →
첫 메시지: **"handoff/round81-2026-06-23/HANDOFF.md 읽고 컨텍스트 파악 + 이어서 작업"**

---

## 1. 라이브 URL / 인프라
- 블로그(자사 AEO 자산): https://medimap-blog-phi.vercel.app
- 어드민 콘솔(geo-v2): https://geo-v2-beta.vercel.app
- GitHub: https://github.com/passion4050-byte/Marketing (private, main)
- Supabase: project blogkey (`gifopyowyankfsfghhdi`) — Supabase MCP 로 직접 SQL
- Vercel 2 프로젝트: geo-v2(admin) + medimap-blog(블로그) — push 시 둘 다 자동 배포

---

## 2. 이번 라운드 한 일 (Round 81 (1)~(8) + 콘텐츠 품질)

| # | 내용 | 상태 |
|---|---|---|
| 🔴 핵심 | **의료법 컴플라이언스 룰 63개(9룰×7병원) 시드** — compliance_rules 0행이라 린터가 모든 글을 vacuous "pass" 처리 = 핵심 차별점이 꺼져 있었음. default.yaml 팀 룰로 복원 + idempotent 마이그레이션. 기능 검증 통과 | ✅ 라이브(DB) |
| (1)(2) | applied_insights 주입 품질 + **split-brain 수정** (UI는 learned_insights.applied 쓰는데 엔진은 빈 applied_insights 테이블 읽던 버그) | ✅ 푸시됨 |
| (3) | **진료과(domain_category) 정밀매칭** — 안과 인사이트는 안과 병원에만(노이즈 0). 인사이트 카테고리 백필 + 캡처 라우트 자동도출(근본수정) + Path1 apply_insights 게이트 | ✅ 푸시 + DB백필 |
| (4) | LLM_PROVIDER 안전폴백(오타→fallback) + sitemap revalidate 60→3600 + 함정 CK~CN | ✅ 푸시됨 |
| (5) | admin 미들웨어 **fail-closed**(ADMIN_PASSWORD 미설정 시 전체 public 되던 P0 보안) + learned-insights 카피 정정 | ✅ 푸시됨 |
| (6) | **AEO 표 강제** — 마크다운표→실제 `<table>` 렌더 + 프롬프트 필수화 + 생성 후 표 없으면 재시도(비차단) | ✅ 푸시됨 |
| (7) | **USD 실토큰 미터링** — provider 응답 usage 포착(Gemini/Anthropic/OpenAI) + Fallback 프록시 → 실비용 기록. cronSecret 헤더전용(보안) + 신규 tenant 자동분석 401 수정 | ✅ 푸시됨 |
| (8) | [id] 라우트 `.maybeSingle()`+404 + run_ab_test 를 learned_insights.applied 진료과매칭으로 일관화 | ✅ 푸시됨 |
| 콘텐츠 | **체크리스트/목록 렌더링** — `• 목록`도 표처럼 escape 되던 것 → `<ul>/<ol>` 렌더 | ⏳ **미푸시(아래 §3)** |

---

## 3. 집에서 가장 먼저 — 미푸시 1건 푸시

```powershell
cd "C:\Users\user\Documents\Marketing"
del .git\index.lock
git add src/content/templates/blog_html.py
git commit -m "Round 81 (9) 콘텐츠 품질 — 마크다운 체크리스트/번호목록을 <ul>/<ol> 렌더(AEO)"
git push origin main
```
(검증 완료: 목록 파서 기능테스트 + py_compile 통과. 인라인 대시 "100-200만원"은 목록으로 오인 안 함.)

---

## 4. 사용자 액션 — GitHub UI / GSC (Claude 가 못 함)

- [ ] **GitHub Secrets** (Settings → Secrets and variables → Actions)
  - `LLM_PROVIDER` → `fallback` 로 정정(또는 삭제). 현재 잘못된 값(아마 "claude")이라 A/B 가 그 값을 받아 에러났음 — 코드 폴백으로 안 죽지만 정정 권장.
  - `MAX_CONTENT_GEN_PER_DAY` = `20` (실효 지출 캡 — 이제 워크플로에 노출됨)
  - `MAX_DAILY_USD` = `5` (이제 실토큰 미터링 되니 실제 작동)
  - `ENGINE_MODE` = `production` 확인
- [ ] **A/B auto-generate** 워크플로 재Run → candidates ≥ 1, content-queue 에 A/B 변형 + ab_tests row 확인
- [ ] **GSC** sitemap 재제출(파일은 유효 확인됨, "가져올 수 없음"은 콜드 타임아웃 추정 → revalidate 하드닝 배포됨)
- [ ] (선택) 죽은 코드 정리: `git rm -r medimap-blog-v2/src/app/api/admin/insights/apply` + Supabase `DROP TABLE applied_insights` (완전 고아, 안 지워도 무해)

---

## 5. 검증 방법 (콘텐츠 품질/SEO)
- **구조 자동채점**(즉시): SQL 로 H2/표/목록/이미지 유무 채점 (Supabase MCP)
- **AI 인용 측정**(진짜 KPI, 수주~수개월): measure-ai-mentions cron 누적
- **SEO**: GSC impressions/순위(신규 도메인 색인 2~8주) + Rich Results Test(FAQ schema)

---

## 6. 새 함정 (SKILL.md 누적됨)
- **CK** split-brain(UI=learned_insights.applied vs 엔진=빈 applied_insights)
- **CL** 인사이트 domain_category NULL → Path1 조용히 빈값 / 캡처가 프론트 미전달 시 NULL 저장
- **CM** LLM_PROVIDER 오타 → 하드크래시(별칭+폴백으로 방어)
- **CN** sitemap "가져올 수 없음"은 대개 파일 문제 아님(콜드 타임아웃) — revalidate 하드닝
- **CO(신규)** compliance_rules 0행 + tenants.yaml 에 실 tenant 없음 → 린터가 모든 글 vacuous pass = 의료법 안전망 OFF. default.yaml 룰을 DB 에 시드해 복원.
- **(재확인) CE** Cowork bash 마운트가 Edit 결과를 truncated 로 읽음 → py_compile 가짜 에러. **/tmp git 클론**(비마운트)에서 origin+편집 재현해 검증이 정석.

---

## 7. 다음 작업 후보
- 콘텐츠: 정의형 첫 문장 강제, FAQPage JSON-LD 자동 삽입
- USD: check_daily_usd_budget 에 projected_cost 추정 전달(선제 차단)
- 측정 데이터 누적 후 A/B 승자 판정 + 경쟁사 추세
- (선택) FAQ/naver/instagram 채널도 토큰 미터링 확장

생성: 2026-06-23 사무실 — Round 81 종합
