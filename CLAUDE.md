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
- **LLM SDK:** `openai`, `anthropic`, `google-generativeai`, Perplexity REST
- **Embedding:** `text-embedding-3-small` (OpenAI)
- **Vector DB:** `chromadb` (로컬 파일)
- **Web Crawling:** `httpx` + `trafilatura`
- **DB:** SQLite → PostgreSQL 마이그레이션 가능 (tenant_id 컬럼 처음부터)
- **Scheduler:** APScheduler → Celery+Redis
- **Dashboard:** Streamlit → React+FastAPI (MVP-5)
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

**디렉토리(예정):**
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
└── dashboard/       # Streamlit
```

상세는 `.planning/SPEC-v2.md` §0, §2.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

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
