# Anthropic LLM 환경변수 등록 가이드 (Round 58)

> Round 58 코드 fix 후 환경변수를 두 곳에 등록해야 작동합니다. POC 단계.

---

## ⚠️ 보안 메모

- API key 가 채팅에 평문 노출됐습니다 (POC 라 진행하셨음)
- **작업 마무리 후** https://console.anthropic.com → Settings → API Keys 에서 해당 key Revoke + 새 key 발급 권장
- 새 key 발급 후 아래 두 곳 (Vercel + GitHub) 값만 교체하면 됩니다

---

## 등록할 환경변수 3개 (공통)

| Key | Value |
|---|---|
| `LLM_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (사용자가 받은 값) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |

---

## 1. Vercel 환경변수 등록 (Next.js admin / API)

**대상**: `geo-v2-beta.vercel.app` (관리자 콘솔 + 차트·키워드 측정 API)

### 단계
1. https://vercel.com 접속 → 로그인
2. 좌측 프로젝트 list → `medimap-blog-v2` 선택
3. 상단 탭 → **Settings**
4. 좌측 메뉴 → **Environment Variables**
5. **Add New** 클릭
6. 입력:
   - **Name**: `LLM_PROVIDER`
   - **Value**: `anthropic`
   - **Environment**: ✅ Production ✅ Preview ✅ Development (모두)
   - **Save**
7. 동일 방법으로 `ANTHROPIC_API_KEY` 와 `ANTHROPIC_MODEL` 도 추가
8. **재배포 강제**: Deployments 탭 → 최상단 배포 → 우측 `⋯` → **Redeploy** → "Use existing Build Cache" 체크 해제 → **Redeploy**

> 환경변수 추가만으로는 기존 배포에 반영 안 됨. 반드시 Redeploy 필요.

---

## 2. GitHub Actions Secrets 등록 (Python cron 발행)

**대상**: 매일 23:00 UTC (KST 08:00) `auto-publish.yml` workflow 가 사용

### 단계
1. https://github.com/passion4050-byte/Marketing 접속
2. 상단 탭 → **Settings**
3. 좌측 메뉴 → **Secrets and variables** → **Actions**
4. **New repository secret** 클릭
5. 입력:
   - **Name**: `LLM_PROVIDER`
   - **Secret**: `anthropic`
   - **Add secret**
6. 동일 방법으로 `ANTHROPIC_API_KEY` 와 `ANTHROPIC_MODEL` 도 추가

> 이미 다른 secrets (`CRON_SECRET`, `VERCEL_DEPLOY_HOOK`, `RESEND_API_KEY` 등) 있는 곳에 추가하면 됨.

---

## 3. 등록 검증

### Vercel 측 검증 (5분 후)
- https://geo-v2-beta.vercel.app/admin 접속
- `/admin/cost` 페이지 → 다음 LLM 호출 후 model 컬럼 = `claude-sonnet-4-6` 확인
- 또는 Vercel Functions 탭 로그에서 anthropic API 호출 확인

### GitHub Actions 측 검증 (다음 cron 후)
- 매일 23:00 UTC (KST 08:00) `auto-publish.yml` 자동 실행
- https://github.com/passion4050-byte/Marketing/actions → 최신 run 클릭
- 로그에서 `LLM_PROVIDER=anthropic` `model=claude-sonnet-4-6` 출력 확인
- 또는 `auto-publish` workflow 의 `workflow_dispatch` 로 수동 실행 (가장 빠른 검증)

### 즉시 검증 — 수동 cron 트리거
1. https://github.com/passion4050-byte/Marketing/actions
2. 좌측 list → `auto-publish` workflow
3. 우측 **Run workflow** → main branch 선택 → **Run workflow**
4. 1~3분 후 실행 결과 확인
5. 로그에 anthropic 사용 표시 + 새 콘텐츠 1편 생성되면 성공

---

## 4. 비용 모니터링

Claude Sonnet 4.6 단가 (1M 토큰당):
- Input: $3.0
- Output: $15.0

콘텐츠 1편당 예상:
- Prompt: ~3K tokens → $0.009
- Completion: ~3K tokens → $0.045
- **편당 약 $0.05 (한화 ~70원)**

월 10편 발행 시 ~$0.5 (700원). 매우 저렴. Sonnet → Haiku 다운그레이드는 비용 절감 효과 미미.

비용 가드레일 (`MAX_DAILY_USD` 환경변수, default $5) — 충분히 안전.

---

## 5. 코드 변경 push 확인

Round 58 코드 변경:
- `medimap-blog-v2/src/lib/llm/factory.ts`
- `src/content/llm.py`
- `src/content/cost.py`
- `SKILL.md` (Round 58 누적)

**push 후 Vercel 자동 재배포 트리거** — 별도 Redeploy 불필요 (코드 변경이 트리거).

다만 **환경변수만 변경했을 때는 Redeploy 수동 필요** (위 1번 마지막 단계 참조).

---

## 6. fallback 동작 확인

`_build_provider_chain()` 의 우선순위:
1. Anthropic (지금 등록)
2. Gemini (GOOGLE_API_KEY 있으면)
3. OpenAI (OPENAI_API_KEY 있으면)
4. Stub (어떤 key 도 없으면)

Anthropic 5xx 에러 시 자동으로 Gemini fallback. Gemini 도 안 되면 OpenAI. 모두 실패 시 stub (콘텐츠 발행 안 됨).

→ 안전한 fallback chain 이미 구성됨. POC 안심.

---

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `/admin/cost` 에서 model 이 여전히 haiku | Vercel Redeploy 안 했음 | Section 1 마지막 단계 |
| GitHub Actions 로그 `ANTHROPIC_API_KEY missing` | Secret 등록 안 됨 / 오타 | Section 2 다시 확인 |
| 401 Unauthorized | API key 오류 / revoke 됨 | https://console.anthropic.com 에서 key 상태 확인 |
| 429 Rate limit | 빠른 연속 호출 | 자동으로 Gemini fallback (chain 구성됨) |
| 비용 $1+ 초과 | MAX_DAILY_USD 가드레일 작동 | 정상. 다음 날까지 대기 |
