# 🚀 blogkey-adm Streamlit Cloud 배포 — 6 클릭 가이드

메디맵 직원 전용 어드민 사이트(`blogkey-adm.streamlit.app`)를 Streamlit Community
Cloud 무료 tier 에 배포하는 단계별 가이드. 코드/secrets 템플릿은 이미 prep
완료(Phase 9-04). share.streamlit.io 에서 **클릭만 6번** 하면 됩니다.

> ℹ️ **왜 `admin.blogkey.streamlit.app` 가 아닌 `blogkey-adm.streamlit.app`?**
> Streamlit Community Cloud 무료/Hobby tier 는 nested subdomain 라우팅을 지원
> 하지 않습니다. `<slug>.streamlit.app` 한 가지 패턴만 가능. 진짜 nested 가
> 필요하면 자체 도메인 + Streamlit Teams (유료) 가 필요합니다.

---

## Pre-flight 체크리스트

코드 측 prep 은 이미 다 끝났어요 — 확인용:

- [x] `admin_app.py` (repo root) — `from src.admin.app import main` entry point
- [x] `src/admin/` — auth, app, tenants_tab, cost_tab, publications_tab,
      funnel_global_tab, sync_tab 7개 모듈
- [x] `Tenant.password_hash` 컬럼 + Alembic migration `e8a26df183bd`
- [x] `.streamlit/secrets.admin.toml.example` — Secrets 템플릿
- [x] 256 tests pass — main 브랜치에 머지 완료 (commit `4868c6a`)

배포 전 한 번만 준비할 것 (브라우저 4개 탭 띄워놓으면 편함):

| 항목 | 어디서 가져오는지 |
|---|---|
| Supabase `DATABASE_URL` | https://supabase.com/dashboard → Project → Settings → Database → Connection string (Transaction mode, pooler) |
| Gemini `GOOGLE_API_KEY` | https://aistudio.google.com/apikey |
| GA4 Property ID | (이미 보유 — `6353278443`) |
| GA4 Service Account JSON | https://console.cloud.google.com/iam-admin/serviceaccounts → Create key → JSON |
| 어드민 비밀번호 | 새로 정하세요 (blogkey 와 다른 강한 패스워드) |

---

## 6 클릭 배포

### 클릭 1 — share.streamlit.io 에서 New app

https://share.streamlit.io/ → 우상단 **New app** 버튼.

GitHub OAuth 로그인 안 된 상태면 먼저 GitHub 계정으로 로그인 (passion4050-byte
계정이어야 private repo `Marketing` 이 보임).

### 클릭 2 — Repository / Branch / Main file 입력

| 필드 | 값 |
|---|---|
| Repository | `passion4050-byte/Marketing` |
| Branch | `main` |
| Main file path | `admin_app.py` ← (★ blogkey 가 아니라 admin) |
| App URL | `blogkey-adm` (Streamlit 이 "admin" 단어를 reserved 처리해서 truncate) |

→ 최종 URL 미리보기: `https://blogkey-adm.streamlit.app` ✓

### 클릭 3 — Advanced settings → Python 3.12

**Advanced settings** 펼쳐서:
- Python version: **3.12** (`.python-version` 파일과 일치)
- Secrets: **일단 비워두고 다음 단계에서 입력** (Deploy 가 더 빠름)

### 클릭 4 — Deploy

**Deploy!** 버튼. 1~2 분 후 빌드 완료. 첫 부팅 시 화면에 빨간 에러
("ADMIN_APP_PASSWORD missing") 가 보이는 건 **정상** — 다음 단계에서 secrets
넣으면 사라집니다.

### 클릭 5 — Settings → Secrets 에 붙여넣기

앱 우상단 햄버거 메뉴 → **Settings** → **Secrets** 탭.

`.streamlit/secrets.admin.toml.example` 의 내용을 복사해서 → 본인 값으로 채우고 →
**Save**.

> ⚠️ 가장 흔한 실수 5가지:
> 1. `DATABASE_URL` 에 **Transaction mode (port 6543, pooler)** 가 아니라 Direct
>    mode 를 넣음 → Streamlit Cloud 의 짧은 connection 한도에서 고갈됨.
> 2. `GA4_SERVICE_ACCOUNT_JSON` 의 `private_key` 안에 진짜 줄바꿈을 넣음 →
>    TOML 파서가 깨짐. `\n` (literal backslash-n) 로 escape 필요.
> 3. blogkey 와 **다른** Supabase URL 을 넣음 → 어드민이 발급한 password_hash 를
>    blogkey 가 verify 못 함 (격리 동작 안 함).
> 4. `ADMIN_APP_PASSWORD` 와 `APP_PASSWORD` (blogkey 의 게이트) 를 같은 값으로 둠.
>    어드민은 직원만, blogkey 는 클라이언트용 — 분리하세요.
> 5. private_key 의 BEGIN/END 줄 양쪽 `-----` 를 한쪽만 escape — 양쪽 다 그대로 두면 됩니다.

### 클릭 6 — Reboot app

Settings → **Reboot app** (또는 Save 후 Streamlit 이 자동 재시작).
30초 후 `https://blogkey-adm.streamlit.app` 접속 → ADMIN_APP_PASSWORD 입력 →
5탭 (🏢 테넌트 / 💸 비용 / 📍 발행 / 🔄 Funnel / 🔗 동기화) 보이면 완료. ✓

---

## 배포 후 — blogkey 격리 활성화

어드민이 라이브가 됐어도 blogkey 측에 격리 플래그를 켜야 클라이언트가 본인
테넌트만 보게 됩니다.

1. https://share.streamlit.io/ → blogkey 앱 선택 → Settings → Secrets
2. 한 줄 추가:
   ```toml
   TENANT_AUTH_REQUIRED = "true"
   ```
3. Reboot.

이 시점부터 blogkey 접속자는 어드민이 발급한 `?tenant=N&pw=...` 링크가 있어야
자기 테넌트를 볼 수 있습니다. 미인증 접속은 로그인 폼을 보게 됩니다.

> ℹ️ **롤백 방법**: `TENANT_AUTH_REQUIRED` 키를 제거하거나 `"false"` 로 바꾸면
> 즉시 기존 동작(모든 테넌트 노출) 으로 복귀.

---

## 첫 클라이언트에 비번 발급 — 동작 검증

1. `https://blogkey-adm.streamlit.app` 접속 → ADMIN_APP_PASSWORD
2. 🏢 테넌트 탭 → 🔑 클라이언트 비밀번호 발급/리셋 펼치기
3. 테넌트 선택 → 🎲 새 비밀번호 발급
4. 화면에 1회 표시되는 평문 + 자동 생성된 접속 URL (`https://blogkey.streamlit.app/?tenant=N&pw=...`) 클립보드 복사
5. 시크릿 브라우저에서 그 URL 접속 → 해당 테넌트만 picker 에 보이는지 확인

verify 통과되면 9-04 격리가 production 에서 정상 동작 중. URL 의 `pw` 쿼리는
Streamlit 이 받자마자 자동 삭제하므로 history 에 남지 않습니다.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 빌드 후 `ModuleNotFoundError: src.admin` | Main file path 가 `src/dashboard/app.py` 로 잘못 지정됨 | Settings → Main file path 를 `admin_app.py` 로 수정 → Reboot |
| 🏢 테넌트 탭에서 `password_hash` 컬럼 없음 경고 | Streamlit ORM stale module 캐시 | Settings → Reboot app (전체 재시작) |
| Funnel 탭 GA4 row 가 비어있음 | Service Account 에 Property Viewer 권한 미부여 | GA4 → Property Access Management → 서비스 어카운트 이메일 추가 (Viewer) |
| blogkey 에서 인증해도 picker 빈 채로 stop | 어드민이 발급한 비번을 blogkey 와 **다른** DB 에 저장 | 어드민/blogkey 둘 다 동일한 `DATABASE_URL` 을 secrets 에 두었는지 확인 |
| URL `?tenant=N&pw=...` 인증 실패 | URL 인코딩 — pw 에 특수문자 포함 시 깨짐 | 화면 로그인 폼으로 폴백, 또는 비번 재발급 (영숫자만 14자) |

---

## 참고 — 관련 파일

- `admin_app.py` — repo root entry
- `src/admin/app.py:main` — 5탭 라우팅
- `src/admin/auth.py` — `ADMIN_APP_PASSWORD` 게이트
- `src/admin/passwords.py` — pbkdf2_sha256 hash/verify
- `src/dashboard/tenant_auth.py` — blogkey 측 URL 쿼리 인증
- `.planning/ROADMAP.md` Phase 9 — 4 plans 모두 완료 표시
