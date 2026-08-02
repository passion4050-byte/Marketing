<!-- 사용자 명시 규칙 (2026-06-20) — Claude 가 무조건 지켜야 함 -->
## 🔴 사용자 명시 규칙 — Skill 저장

사용자가 "스킬 저장", "스킬 업데이트", "스킬 누적" 비슷한 요청을 하면 **반드시 다음 두 가지 동시 진행**:

1. **`.skill` 패키지 + Save skill 버튼** (정상 Claude 흐름)
   - `mcp__cowork__present_files` 로 사용자에게 카드 표시
   - 사용자가 "Save skill" 버튼 클릭 → 시스템에 영구 설치
   - **이걸 빼먹지 말 것. 사용자가 "원래 버튼 흐름이었잖아" 라고 지적했음.**

2. **GitHub 저장**: `C:\Users\user\Documents\Marketing\SKILL.md` 갱신 + git commit + push
   - 다중 PC 동기화 (사무실 ↔ 집)
   - git push 안내까지 반드시 포함

**하나만 하면 안 됨**. 둘 다 동시 진행이 사용자 요구사항.

---

<!-- 모델 핸드오프 프로토콜 (2026-07-07) — Fable 5 세션 실사고에서 확립. 모든 모델(Sonnet/Opus/Haiku) 무조건 준수 -->
## 🔴 모델 공통 작업 프로토콜

### 세션 시작 루틴
1. 새 기기/오랜만이면 사용자에게 `git pull` 먼저 안내
2. `SKILL.md` 최신 Round 섹션 + "다음 라운드 후보" 읽고 착수 (또는 geo-snapshot 스킬 트리거)
3. 코드 수정 전 Supabase MCP 로 관련 DB 실상태 확인 — 추측으로 고치지 말 것

### 파일 시스템 진실 규칙 (🔴 함정 ED)
- 호스트 파일 정본 = Read/Edit/Write 도구. Edit/Write 성공 = 파일 무결
- 샌드박스 bash 의 wc/tail 불일치·NUL·중간 절단 = **마운트 동기화 지연일 뿐, 파일 손상 아님**. 특히 SKILL.md 같은 대형 파일은 편집 직후 마운트에 수십 초~무기한 미반영 가능 → 그럴 땐 /tmp 사본에 동일 편집을 파이썬으로 재적용(anchor assert 필수)해서 진행
- 마운트에서 git commit/push 금지. **push 는 항상 사용자 로컬 터미널** — 완성된 한 줄 명령어 제공
- 샌드박스 산출물을 사용자에게 줄 땐 Write 도구(호스트 경로) 또는 outputs 복사+present_files 만 신뢰. outputs 에 직접 zip 생성이 막히면(Operation not permitted) /tmp 에 만들고 cp

### 빌드 게이트 (push 명령 제공 전 필수 — 실사고 3회 예방 실증)
- .tsx/.ts 수정: 수정본 /tmp 사본 확보(마운트 동기화 확인 or 재적용) → `npx --yes esbuild --loader:.tsx=tsx <파일> --outfile=/dev/null` PASS 확인
- .py 수정: `python3 -m py_compile <파일>`
- 게이트 없이 push 명령 주는 것 금지

### 🔴 esbuild 는 타입을 못 잡는다 — Next 규약 수동 체크 필수 (실사고 Round 144)
esbuild 는 **문법만** 본다. 타입 에러는 Vercel 빌드에서 처음 터지고, 실패해도
이전 성공 빌드가 계속 서빙되므로 **"배포됐는데 화면이 그대로"** 로 나타난다.
push 전 아래를 눈으로 확인할 것:

- **이 프로젝트는 Next.js 14.2.13** — 페이지 컴포넌트의 `params`/`searchParams` 는
  **동기 객체**다. Next 15 스타일 `params: Promise<{...}>` 로 쓰면 PageProps 타입
  검사에서 빌드가 깨진다.
  - `page.tsx` → `{ params: { id: string } }` (await 금지)
  - `route.ts` → `params: Promise<{...}>` 패턴이 기존 5개 파일에 있고 동작함(핸들러는 PageProps 검사 대상 아님)
  - 검사 한 줄: `grep -rln "params: Promise" src/app --include=page.tsx` → **결과 0이어야 정상**
- 공유 인터페이스(예: `ReportMetrics`) 필드명을 바꾸면 **소비처 전수 grep** 필수
- 배포 후 화면이 안 바뀌면 캐시를 의심하기 전에 **빌드 실패를 먼저 의심**할 것

### 🔴 신규 라우트 추가 시 — 동적 세그먼트명 충돌 (실사고 Round 144)
Next.js 는 **같은 depth 에 서로 다른 동적 세그먼트명**을 허용하지 않는다.
`/r/[slug]`(ShortLink)가 있는데 `/r/[tenantId]/...` 를 추가해서 빌드가 통째로 깨졌다.
```
Error: You cannot use different slug names for the same dynamic path ('slug' !== 'tenantId').
```
이건 **타입 에러가 아니라 라우트 트리 에러** — esbuild·tsc 둘 다 못 잡고 `next build` 만 잡는다.

**신규 동적 라우트 추가 전 필수 검사 1줄:**
```bash
find src/app -type d -name '\[*\]' | while read d; do echo "$(dirname "$d")|$(basename "$d")"; done \
 | sort | awk -F'|' '{a[$1]=a[$1]" "$2} END {for(p in a){n=split(a[p],arr," "); if(n>1) print "CONFLICT: "p" → "a[p]}}'
```
→ **출력이 비어야 정상.** 현재 예약된 최상위 경로: `/r`(ShortLink) · `/report`(클라이언트 보고서)

### 🔴 route.ts 는 정해진 export 만 허용 (실사고 Round 144)
`export const MATURE_DAYS = 42` 같은 임의 상수를 route.ts 에서 export 하면
`"MATURE_DAYS" is not a valid Route export field` 로 빌드 실패.
허용: `GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS · runtime · dynamic · revalidate ·
fetchCache · dynamicParams · preferredRegion · maxDuration · generateStaticParams · config`
공유가 필요하면 **별도 lib 파일로 분리**할 것.

### ✅ 게이트 스크립트 (push 전 1회 실행 — 손으로 치지 말 것)
```bash
cd medimap-blog-v2 && bash scripts/build-gate.sh
```
위 3대 함정(세그먼트 충돌 · route export · Promise params) + UI 내부용어를 한 번에 검사.
**RESULT: ✅ PASS 아니면 push 금지.**

### 배포 검증 (Round 144 이후 필수)
push 후 "됐겠지" 금지. Vercel 프로젝트 `geo-v2`(팀 slug `medimaps-projects`) 배포 상태를
확인하거나, 신규 API 엔드포인트를 직접 호출해 **404 가 아닌지** 확인할 것.
빌드 실패해도 이전 성공 빌드가 계속 서빙되므로 화면만 봐서는 구분이 안 된다.

### JSX 함정 (실사고 2회: 124-B, 131-B)
- 삼항 `) : ( ... )` / `{cond && ( ... )}` 괄호 안에 `{/* */}` 주석 금지 → 빌드 실패. `//` 줄주석 또는 괄호 밖에 배치

### 검증 원칙
- 배포/DB 변경 후 라이브 URL(web_fetch) 또는 SQL 로 실측 확인 후 보고. "됐을 것" 금지 — 실측 없으면 "미검증" 명시
- 발행 콘텐츠 검증 항목: 이미지(무인물·무한글·글 맥락·시네마틱 톤), 파트너 태깅 3필드, 의료법 통과, /with-partners 노출

### 작은 모델(Sonnet/Haiku) 추가 규칙
- 한 세션 라운드 1~2개만. 큰 편집은 세션 초반에
- 여러 파일 수정 시 파일당 [수정→게이트] 완결 후 다음 파일 (일괄 수정 후 일괄 검증 금지)
- 컨텍스트 절약: Grep head_limit≤50, Read offset/limit, SELECT 필요 컬럼만
- 확신 없으면 SKILL.md 에서 해당 주제 선례를 먼저 Grep — 대부분의 함정은 이미 기록돼 있음

---

<!-- GSD:project-start source:PROJECT.md -->
## Project

# GEO/AEO SaaS (메디맵)

AI 검색엔진(Perplexity, ChatGPT, Gemini, Claude)에서 의료 도메인 브랜드의 노출(Mention Share)을 측정하고, AI에 인용되도록 최적화된 콘텐츠를 자동 생성하는 멀티테넌트 SaaS. 첫 고객은 메디맵(의료/안과 마케팅)이며, 의료법 컴플라이언스가 핵심 차별점.

**Core value:** 키워드 → AEO 최적화 콘텐츠 → 의료법 통과 → 복사 가능 한 라인이 메디맵 운영자에게 동작.

상세는 `.planning/PROJECT.md` 참조. 정의서 풀스코프는 `.planning/SPEC-v2.md`.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- **언어:** Python 3.11+
- **LLM SDK:** `openai`, `anthropic`, `google-genai` (구 `google-generativeai` 에서 마이그레이션 — Phase 6.5), Perplexity REST
- **Embedding:** `text-embedding-3-small` (OpenAI)
- **Vector DB:** `chromadb` (로컬 파일)
- **Web Crawling:** `httpx` + `trafilatura`
- **DB:** SQLite → PostgreSQL 마이그레이션 가능 (tenant_id 컬럼 처음부터)
- **Scheduler:** APScheduler → Celery+Redis
- **Dashboard:** Streamlit (배포: Streamlit Community Cloud) → React+FastAPI (MVP-5)
- **통계:** `scipy.stats`, `pymannkendall`
- **NER (한국어):** `kiwipiepy` + 룰베이스
- **Env:** `python-dotenv`
- **Logging:** `structlog`
- **Test:** `pytest`

상세는 `.planning/SPEC-v2.md` §1.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- **Multi-tenant from day 1**: 모든 테이블에 `tenant_id` FK (Tenant 자기 자신 제외). 쿼리/생성/검색 모든 경로에서 tenant 격리.
- **Compliance 강제**: 의료법 린터를 모든 콘텐츠 생성 경로에 강제. 우회 경로 만들지 말 것.
- **Cost guardrail**: LLM 호출 전 `MAX_DAILY_USD`, `MAX_CONTENT_GEN_PER_DAY` 사전 체크. 가드레일 우회 금지.
- **No auto-posting**: 외부 플랫폼(네이버 블로그/티스토리/인스타) 자동 게시 금지. 출력은 클립보드/파일로만.
- **Korean-first**: UI/콘텐츠/룰 한국어. 영어는 코드 식별자에만.
- **Async I/O**: LLM 호출, HTTP, DB는 가능한 비동기 (`asyncio` + `httpx.AsyncClient`).
- **Type hints**: 모든 public 함수에 type hint. dataclass/Pydantic 사용.
- **No mocking DB in tests**: 통합 테스트는 SQLite 메모리 DB 실제 사용. LLM은 모킹 OK.
- **Streamlit stale module cache 가드**: Streamlit Cloud 재배포 후 `sys.modules` 캐시로 신규 ORM 컬럼/모델이 누락된 채 실행될 수 있음. 신규 속성/모델 접근 전 `hasattr(Model, "field")` 또는 `try/except ImportError` 가드 필수. 완전 해소는 앱 reboot.
- **Design-only changes**: 디자인/UI 작업 시 기능 로직(LLM 호출, DB 쿼리, 스케줄러, 컴플라이언스 린터, 핸들러)은 절대 손대지 말 것. theme.py CSS / Tailwind 토큰 / 마크업만 수정. 기능 변경이 필요하면 별도 커밋으로 분리.
- **Cross-site design sync**: 3개 사이트가 동일한 강남언니 디자인 토큰을 공유 — `src/dashboard/theme.py`(테넌트), `src/admin/theme.py`(어드민), `medimap-blog/tailwind.config.ts` + `medimap-blog/src/app/globals.css`(블로그). 브랜드 컬러 변경 시 4개 파일을 동시에 갱신. 확정 팔레트 — Brand `#1B68FF`(핫핑크), Accent `#1AD2A4`(민트), Admin Primary `#4F5DF8`(퍼플), Mint `#15CBA8`. SVG `<linearGradient>` stop-color 는 Tailwind 토큰이 미치지 않으므로 별도 체크리스트.
- **Token-first components**: 신규 컴포넌트는 `brand-*` / `accent-*` 토큰 클래스만 사용. `#hexcode` 직접 삽입 금지 (SVG gradient 제외). 한 곳만 빠뜨려도 리브랜딩 시 색이 어긋나는 구멍이 됨.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

```
사용자 (메디맵 운영자)
  ↓
[Reference Library (RAG)] + [Compliance Engine (의료법 린터)]
  ↓
[Content Generator (채널별 템플릿)]
  ↓
사용자가 복사 → 수동 배포

병렬:
[Monitoring Agent (4엔진 수집)] → [Analytics] → [Streamlit Dashboard]
```

**디렉토리:**
```
src/
├── engines/         # LLM 엔진 (Perplexity, OpenAI, Gemini, Claude)
├── collector/       # 수집 + 스케줄러
├── parser/          # 멘션 추출 + NER
├── storage/         # SQLAlchemy 모델 (tenant_id 포함)
├── analytics/       # mention share, 추세, 이상치, competitor
├── reference/       # RAG (crawler, chunker, embedder, retriever)
├── compliance/      # 의료법 린터
├── content/         # 콘텐츠 생성 + 4채널 템플릿
├── dashboard/       # Streamlit 테넌트 앱 — theme.py(강남언니 핑크 #1B68FF + 오렌지 #1AD2A4)
│                    # kpi_strip / login wrap 헬퍼
└── admin/           # Streamlit 어드민 백오피스 — theme.py(핑크 #1B68FF + 퍼플 #4F5DF8 + 민트 #15CBA8)
                     # admin_kpi_strip / admin_chip / render_admin_header / render_side_card 헬퍼
medimap-blog/        # Next.js 14 SSG 블로그/랜딩 (Vercel 배포)
```

상세는 `.planning/SPEC-v2.md` §0, §2.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:deployment-start -->
## Deployment

- **플랫폼:** Streamlit Community Cloud (무료 tier) + Vercel (Next.js)
- **라이브 사이트 (3개):**
  - **테넌트 대시보드** (`blogkey`) → https://blogkey.streamlit.app — 클라이언트(병·의원) 운영자, `APP_PASSWORD` + `?tenant=&pw=` 게이트
  - **어드민 백오피스** (`blogkey-adm`) → https://blogkey-adm.streamlit.app — 메디맵 직원 전용, `ADMIN_APP_PASSWORD` 게이트
  - **블로그/랜딩** (`medimap-blog`) → https://medimap-blog-phi.vercel.app — Next.js 14 SSG, AEO 자산용 자사 통제 URL
- **GitHub:** https://github.com/passion4050-byte/Marketing (private)
- **브랜치:** `main` (master → main 리브랜드 완료)
- **자동 재배포:** main push 시 — Streamlit Cloud(blogkey + blogkey-adm) 1~2분 빌드, Vercel deploy hook(medimap-blog) 즉시 트리거

**배포 산출물:**
- `requirements.txt` — Streamlit Cloud 가 읽는 의존성 목록 (pyproject.toml 미러)
- `.streamlit/config.toml` — 테마 + 서버 설정
- `.streamlit/secrets.toml.example` — 시크릿 템플릿 (실 파일은 gitignored)
- `.python-version` — Python 3.12 핀
- `src/storage/seed.py` — `seed_if_empty()` 가 부트스트랩 시 호출돼 SQLite 휘발 대응

**Streamlit Cloud Secrets (앱 설정 → Secrets 탭):**
- `LLM_PROVIDER` — `gemini` | `anthropic` | `openai` | `stub`
- `GOOGLE_API_KEY` (또는 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)
- `APP_PASSWORD` — 데모 비밀번호 게이트
- `DATABASE_URL` (선택) — Supabase Postgres 등 영속 DB 사용 시

**시크릿 hydration:** `src/dashboard/app.py` 의 `_hydrate_env_from_secrets()` 가 `st.secrets` 를 `os.environ` 으로 흘려보내 기존 `os.getenv()` 코드가 변경 없이 동작.

**Analytics (GA4 단일 소스):** 3개 사이트 모두 GA4 만 사용 (GTM 제거 완료, ~280KB 절감 유지). medimap-blog 의 GA4 measurement ID 는 `medimap-blog/src/lib/site.ts` 의 `siteConfig.ga` 에서 조회. `next/script` 전략은 **항상 `afterInteractive`** — 이전에 `lazyOnload` 시도했으나 작은 스크립트라 main thread idle 진입을 늦춰 TBT/FCP 가 회귀해 되돌림.

**최초 배포 자동화 (재실행 불필요):** `tools/deploy_github.py` — GitHub Device Flow OAuth → private 리포 생성 → master→main 리브랜드 → 첫 푸시 → 토큰 strip. 일반 재배포는 `git push origin main` 만으로 충분.
<!-- GSD:deployment-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
