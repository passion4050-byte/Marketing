# Phase 4: Measurement Foundation (MVP-0)

**Goal**: Perplexity 1엔진으로 키워드별 n=30 샘플을 비동기 수집하고, 멘션 추출 v1(정규화 + 한글 어절 매칭 + 위치 추적)이 동작하며 SQLite 에 Query/Response/Mention 으로 저장된다. 비용 가드레일 + APScheduler 일 1회 자동 수집까지.

**Status**: Planned
**Estimated**: 1.5~2일 — Plan 04-01 (~5h) + 04-02 (~5h) + 04-03 (~4h)
**Depends on**: Phase 2 (Alembic, LlmCallLog, USD 가드레일 패턴)
**Requirements**: ENG-01, ENG-02, ENG-06, ENG-07, ENG-08, MEN-01

---

## Context

### Phase 2/3 까지 보유한 것 (재사용)
- **비용 가드레일**: `src/content/cost.py:check_daily_usd_budget` + `LlmCallLog` 테이블 (USD 누적, fail-fast). 4엔진에 같은 패턴 그대로 적용.
- **structlog JSON**: `src/observability/logging_config.py` — engine 호출/수집 흐름 모두 JSON 라인.
- **tenant 격리 패턴**: 모든 테이블 `tenant_id` FK. Phase 4 신규 테이블도 동일 적용.
- **Alembic 마이그레이션**: 기존 baseline + reference_documents + llm_call_logs 위에 신규 마이그레이션 한 건 추가.
- **httpx async**: Phase 1.5 부터 사용 중. PerplexityEngine 도 `httpx.AsyncClient` 재사용.
- **provider 추상화 학습**: `src/content/llm.py:LLMProvider` (Stub/Gemini/Anthropic/OpenAI). 이번엔 검색 엔진(Perplexity, OpenAI 검색, Gemini 검색, Claude — Phase 6) 추상화에 같은 패턴 재사용.

### Phase 4 의 정확한 Delta
| 영역 | 현재 | Phase 4 목표 |
|---|---|---|
| **검색 엔진 추상화** | 없음 | `BaseEngine` ABC + `EngineResponse` dataclass + `StubEngine` (키 무없 데모) + `PerplexityEngine` |
| **Collector** | 없음 | `collect_for_keyword()` 비동기 n=30 샘플, concurrency=5, 비용 + DB + 멘션 한 번에 |
| **Mention extractor** | 없음 | 정규화 + 한글 어절 매칭 + 위치 추적 (v1) |
| **데이터 모델** | Tenant/Keyword/...(Phase 1~3) | `Query` / `Response` / `Mention` 신규 + 마이그레이션 |
| **스케줄러** | 없음 | APScheduler `BackgroundScheduler` — 일 1회 enabled keywords 전수 수집 |
| **Streamlit UI** | 없음 | `📡 측정` 탭 — 키워드 등록/On-Off + 수동 수집 트리거 + 최근 응답 N개 미리보기 |
| **분석 (visibility)** | 없음 | Phase 5 — Phase 4 는 raw 저장까지만 |

### 핵심 결정 (decisions)

**1. Perplexity 1엔진 선두 (정의서 §4.1)**
- 이유: 사용자 무료/저렴 tier 진입, 의료 키워드에 reasoning 강함, citation 풍부 → 멘션 + cited_urls 학습 데이터 양호
- 4엔진 동시 수집은 **Phase 6** 로 이연 (정의서 MVP-2 = Phase 6)
- BaseEngine 추상화로 OpenAI/Gemini/Claude 추가는 단순 클래스 작성 → 등록만 해놓고 토글 비활성

**2. Stub Engine 우선**
- 키 0개로 즉시 데모/테스트 동작 (Phase 1 LLM Stub 전례)
- pytest 환경에서 Perplexity API 호출 0회 — `ENGINE_PROVIDER=stub` 기본
- `_stub_response_for_keyword()` 가 미리 작성된 의료/안과 답변 견본을 키워드별 변형해 반환 (멘션 포함)

**3. 비용 가드레일 — Phase 2 패턴 재사용**
- `LlmCallLog` 그대로 사용 (provider="perplexity"|"stub", channel="measurement", cost_usd 누적)
- `check_daily_usd_budget(tenant_id)` 호출 — 한도 초과 시 `CostGuardrailExceeded` 발생, 수집 중단
- Perplexity 모델별 토큰 비용은 `cost.py` 의 `MODEL_COSTS` dict 에 추가

**4. n=30 샘플 + concurrency=5**
- 정의서 표준. 통계적 의미 (Wilson CI 가 작동하는 최소 샘플 — Phase 5 분석에서 활용)
- 동일 키워드를 30회 반복 호출 — 같은 prompt 라도 LLM 의 stochastic 응답이 멘션 빈도/위치를 바꿈
- `asyncio.Semaphore(5)` 로 동시 호출 5개 캡 — Perplexity rate limit + 비용 통제

**5. Mention v1 — "정규화 + 어절 매칭 + 위치"만**
- v2 (가중치 + 추천 강도 + 부정 컨텍스트) 는 Phase 5 (정의서 4.3)
- 한국어 형태소 분석은 의도적 미사용 (kiwipiepy 등) — 어절(공백 split) + alias 룩업으로 충분, 의존성 가벼움
- target_brand 와 alias 리스트를 모두 시도, 위치 첫 매치만 기록 (다중 매치는 별도 행)

**6. 신규 테이블 3개 + Alembic 마이그레이션 1건**
- `Query` (tenant_id, keyword_id, engine, prompt, sample_index, requested_at, cost_usd)
- `Response` (query_id FK, raw_text, cited_urls JSON, latency_ms, created_at)
- `Mention` (response_id FK, tenant_id FK, brand, is_target, is_competitor, position, context_snippet, weight=1.0 v1, sentiment=null)
- 단일 마이그레이션으로 셋 다 생성 (downgrade 시 역순 drop)

**7. APScheduler — `BackgroundScheduler` 인-프로세스**
- Streamlit Cloud 컨테이너 안에서 동작. Streamlit 재시작 시 작업 손실 — 정의서 명시 한계
- Celery+Redis 는 Phase 6+ 로 이연
- 스케줄 등록은 Streamlit "📡 측정" 탭 토글로

**8. tenant 격리**
- Query.tenant_id, Mention.tenant_id 모두 명시적 FK (Response 는 Query 통해 간접)
- Collector 호출 시 tenant_id 강제, 다른 tenant 의 Mention 이 절대 섞이지 않음

---

## Plans

### Plan 04-01: BaseEngine + PerplexityEngine + 데이터 모델

**Goal**: 엔진 추상화 + Perplexity 호출 + Query/Response/Mention 저장 구조가 갖춰진다. n=1 샘플로 e2e 동작.

**Requirements**: ENG-01, ENG-02

**Tasks**:

- [ ] **T1.1: 데이터 모델 + Alembic 마이그레이션**
  - `src/storage/models.py` 에 `Query`, `Response`, `Mention` 추가 (정의서 §3 시그니처 그대로)
  - `Query.cost_usd: float` 기본 0.0
  - `Mention.weight: float` 기본 1.0 (v1, v2 에서 갱신)
  - `Mention.sentiment: str | None` (Phase 6)
  - `Response.cited_urls: JSON` 리스트, `raw_payload` 는 비워둠 (`Response.raw_text` 만 사용)
  - `alembic revision --autogenerate -m "add_measurement_tables"` → 검토 후 commit
  - **Verification**: `pytest tests/test_alembic_smoke.py` 가 EXPECTED_TABLES 에 queries/responses/mentions 포함 후 통과
  - **Files**: `src/storage/models.py`, `alembic/versions/{hash}_add_measurement_tables.py`, `tests/test_alembic_smoke.py`

- [ ] **T1.2: BaseEngine ABC + EngineResponse + StubEngine**
  - `src/engines/__init__.py` + `src/engines/base.py` 신규
  - `BaseEngine` ABC: `name: str`, `async query(prompt: str) -> EngineResponse`
  - `EngineResponse(text, cited_urls, latency_ms, raw_payload)` dataclass
  - `StubEngine` 신규 (정의서 디폴트, 키 0개)
    - 미리 작성된 의료/안과 응답 5종 + 키워드 치환
    - `latency_ms = random(200~800)`, `cited_urls` 는 fixture URL 2~3개
  - **Verification**: pytest — StubEngine query 가 deterministic-ish (같은 키워드 → 같은 본문 sample), latency_ms > 0
  - **Files**: `src/engines/base.py`, `src/engines/stub.py`

- [ ] **T1.3: PerplexityEngine 구현**
  - `src/engines/perplexity.py` 신규
  - 모델: `llama-3.1-sonar-small-128k-online` (저비용 + 검색) — env `PERPLEXITY_MODEL` 로 override
  - `httpx.AsyncClient` + `Authorization: Bearer {PERPLEXITY_API_KEY}`
  - `chat/completions` API 사용. response 에서 `choices[0].message.content` → text, `citations` 또는 `references` → cited_urls
  - latency 측정 (`time.perf_counter()`), raw_payload 는 dict 그대로 저장
  - 키 미설정 시 `EngineError("PERPLEXITY_API_KEY 미설정")` raise
  - **Verification**: pytest — monkeypatch httpx.AsyncClient.post 로 mock response → text/cited_urls 파싱 검증 (실 API 0회)
  - **Files**: `src/engines/perplexity.py`

- [ ] **T1.4: Engine factory + ENGINE_PROVIDER 토글**
  - `src/engines/__init__.py` 에 `get_engine(name=None) -> BaseEngine` 팩토리
  - 기본 `ENGINE_PROVIDER=stub`. `perplexity` 면 PerplexityEngine
  - 향후 OpenAI/Gemini/Claude 검색 엔진은 동일 인터페이스로 추가만 하면 됨
  - **Files**: `src/engines/__init__.py`

- [ ] **T1.5: pytest test_engine_base + test_stub_engine + test_perplexity_engine_mocked**
  - StubEngine 결정론, response 형식, factory 토글 검증
  - PerplexityEngine 은 httpx mock 으로 unit test (실 호출 X)
  - **Files**: `tests/test_engines.py`

**Verification (Plan 04-01 합격 기준)**:
- pytest 신규 8+ 통과
- `await get_engine().query("강남 라식 잘하는 곳")` 호출 시 EngineResponse 반환
- DB 에 Query INSERT → Response INSERT 1건씩 가능 (Mention 은 04-03)

---

### Plan 04-02: Collector + 비용 가드레일 + APScheduler + 측정 탭

**Goal**: 키워드 1개에 대해 n=30 샘플 비동기 수집이 1회 호출로 끝나며, 비용 한도 초과 시 즉시 중단되고, 일 1회 자동 수집이 등록된다.

**Requirements**: ENG-06, ENG-07, ENG-08

**Tasks**:

- [ ] **T2.1: Collector — 비동기 n=30 + concurrency=5**
  - `src/collector/__init__.py` + `src/collector/collect.py` 신규
  - `async def collect_for_keyword(session, tenant_id, keyword: Keyword, engines: list[BaseEngine], n_samples=30, concurrency=5) -> CollectionResult`
  - 각 sample 별:
    1. cost guardrail check (실패 시 `CostGuardrailExceeded` raise — 이미 처리된 sample 은 commit)
    2. engine.query() async 호출 (semaphore 안에서)
    3. Query INSERT (cost_usd 추정), Response INSERT (text/cited_urls/latency)
    4. LlmCallLog INSERT (provider="perplexity"|"stub", channel="measurement", cost_usd)
    5. 멘션 추출 (T3.1 호출) → Mention INSERT
  - `CollectionResult(n_total, n_success, n_failed, error_msg)` 반환
  - **Verification**: pytest — StubEngine 으로 n=5 호출 → DB 에 Query 5건/Response 5건/Mention 0건+ 저장
  - **Files**: `src/collector/collect.py`

- [ ] **T2.2: cost.py 에 Perplexity 모델 비용 추가**
  - `src/content/cost.py:MODEL_COSTS` 에 `llama-3.1-sonar-small-128k-online` 추가 (input ~ $0.20/M, output ~ $0.20/M)
  - 추정 함수에 fallback (모델명 매칭 안 되면 Gemini 비용 대체)
  - **Files**: `src/content/cost.py`

- [ ] **T2.3: APScheduler 통합 — 일 1회 수집 작업**
  - `src/collector/scheduler.py` 신규 — `BackgroundScheduler`
  - `start_scheduler(SessionLocal)` — Streamlit `_bootstrap()` 끝에서 1회 호출
  - 등록 작업: 매일 02:00 KST 에 모든 `Keyword.is_active=True` 에 대해 `collect_for_keyword()` 실행
  - 작업 중복 방지: `BackgroundScheduler.add_job(id="daily_measurement", replace_existing=True)`
  - **Verification**: pytest — scheduler.start() 후 jobs 1건 조회, executor 는 mock
  - **Files**: `src/collector/scheduler.py`

- [ ] **T2.4: Streamlit "📡 측정" 탭**
  - `src/dashboard/measurement_tab.py` 신규 — lazy import 패턴 (Phase 3 reference_library_tab 참고)
  - 키워드 리스트 (현 tenant): 추가/On-Off/삭제
  - "지금 수집" 버튼 — 선택 키워드 1개에 대해 n=10 빠른 수집 (사용자 시연용)
  - 최근 Response 표시 — text 첫 200자 + cited_urls + Mention chip
  - "스케줄 활성" 토글 — APScheduler enabled 표시
  - **Files**: `src/dashboard/measurement_tab.py`, `src/dashboard/app.py` (탭 추가)

- [ ] **T2.5: pytest test_collector + test_scheduler**
  - StubEngine + in-memory SQLite 로 collect_for_keyword e2e 검증
  - 비용 가드레일 트리거 시 일부 sample 만 저장 + CostGuardrailExceeded raise 검증
  - scheduler.start() / stop() 멱등성
  - **Files**: `tests/test_collector.py`, `tests/test_scheduler.py`

**Verification (Plan 04-02 합격 기준)**:
- pytest 신규 6+ 통과
- 측정 탭에서 "지금 수집" → n=10 결과 표시 + 멘션 chip 노출
- scheduler.start() 호출 시 1개 job 등록, daily 02:00 실행 예정

---

### Plan 04-03: Mention Extractor v1 + 멘션 통합

**Goal**: Response.text 에서 target_brand + alias 가 한글 어절 단위로 매칭되어 위치/context_snippet 과 함께 Mention 행으로 저장된다.

**Requirements**: MEN-01

**Tasks**:

- [ ] **T3.1: Mention extractor v1 모듈**
  - `src/parser/__init__.py` + `src/parser/mentions.py` 신규
  - `extract_mentions(response_text, target_brand, aliases=None, competitors=None) -> list[ExtractedMention]`
  - `ExtractedMention(brand, position, weight=1.0, is_negative=False, context_snippet)` dataclass
  - 정규화: NFKC + lower + 양옆 공백 제거 + 연속 공백 1개로
  - 한글 어절 매칭:
    - target/alias/competitor 각각을 어절 boundary 로 검색 (`r"(?<![가-힣A-Za-z0-9])PATTERN(?![가-힣A-Za-z0-9])"`)
    - 다중 매치 시 각 위치당 1행 (중복 제거는 같은 brand+position 페어만)
  - `context_snippet`: 매치 위치 ± 30 글자
  - **Verification**: pytest — "BGN 안과는 추천합니다" 입력 + target="BGN" → 1행, position=0, snippet 검증
  - **Files**: `src/parser/mentions.py`

- [ ] **T3.2: Collector 와 통합**
  - 04-02 의 collect_for_keyword 가 Response INSERT 후 즉시 extract_mentions 호출
  - target_brand 는 Tenant.name (또는 Keyword.target_brand fallback)
  - aliases 는 일단 빈 리스트 (Phase 5 에서 Tenant 에 alias 컬럼 추가 검토)
  - is_target=True (target 매치), is_competitor=False (Phase 6 까지 N/A)
  - **Files**: `src/collector/collect.py` (T2.1 에 통합)

- [ ] **T3.3: 측정 탭에 멘션 chip 노출**
  - 측정 탭의 최근 Response 카드에 멘션 chip — `🟢 멘션 N건` 또는 `⚪ 미멘션`
  - 멘션 클릭 시 context_snippet expand
  - **Files**: `src/dashboard/measurement_tab.py`

- [ ] **T3.4: pytest test_mention_extractor**
  - 매칭 케이스 5건+ : 단일/다중/대소문자/한글어절경계/특수문자
  - 비매칭 케이스 (단어 일부만 일치) → 행 0
  - alias 매칭 — "밝은눈" alias 로 "밝은눈안과는…" 매치
  - **Files**: `tests/test_mention_extractor.py`

**Verification (Plan 04-03 합격 기준)**:
- pytest 신규 5+ 통과
- 통합: StubEngine 에서 텍스트에 target 포함 답변 1건 → Mention 1+ 행 저장
- 측정 탭에서 멘션 chip + snippet 정상 표시

---

## Out of Scope (Phase 4 에서 안 하는 것)

- **OpenAI/Gemini/Claude 검색 엔진** — Phase 6 (BaseEngine 확장만 가능, 등록은 안 함)
- **Mention v2** (가중치/추천 강도/부정 컨텍스트) — Phase 5 (`MEN-02 ~ MEN-04`)
- **Analytics** (Mann-Kendall, Wilson CI, Weighted Share) — Phase 5
- **Streamlit 측정 대시보드 (시계열)** — Phase 5
- **NER 기반 Competitor Discovery** — Phase 6 (`kiwipiepy`)
- **Sentiment 분석** — Phase 6
- **Celery+Redis 외부 큐** — Phase 6+ (정의서 §1)
- **A/B 테스트 프레임워크** — MVP-4 / Phase 7+

---

## Verification (Phase 4 종료 조건 — 정의서 §7 MVP-0)

- [ ] Perplexity 1엔진, n=30 샘플 수집 (StubEngine 으로 데모, Perplexity 키 있으면 실 호출)
- [ ] tenant_id 기반 데이터 격리 동작 (Query/Response/Mention 모두 tenant_id 또는 FK 체인)
- [ ] 비용 가드레일 (`MAX_DAILY_USD` 초과 시 수집 중단, LlmCallLog 누적)
- [ ] 신규 pytest 19+ 통과 (T1: 8, T2: 6, T3: 5)
- [ ] 회귀 0 (109 → 128+)
- [ ] 측정 탭 라이브 동작 (Streamlit Cloud 에서 "지금 수집" 버튼 → 결과 카드 + 멘션 chip)
