# Phase 2: Content Pipeline 확장 — 4채널 + 자동수정 루프

**Goal**: 4개 채널(Schema.org / Blog HTML / 네이버 블로그 평문 / Instagram 캡션) 모두 독립 생성 가능하고, 자동 수정 루프와 비용 가드레일이 안정화되며, 멀티테넌트 룰셋이 yaml + DB 머지로 동작하고, 데이터 모델이 Alembic 으로 관리된다.

**Status**: Planned
**Estimated**: 1.5~2일 (실 작업) — Plan 02-01 (~5h) + Plan 02-02 (~6h) + Plan 02-03 (~4h)
**Depends on**: Phase 1 (완료), Phase 1.5 (완료)
**Requirements**: CMP-05, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08, GEN-09, DAT-02, DAT-04, TEN-02, TEN-03, INF-03, INF-04, UI-02

---

## Context

### Phase 1 + 1.5 완료 상태
- **Live**: https://blogkey.streamlit.app, GitHub passion4050-byte/Marketing, 34/34 pytest 통과
- **데이터 모델**: Tenant, Keyword, ComplianceRule, GeneratedContent, Doctor, Equipment, EventOffer, BrandVoice (`src/storage/models.py`) — 스키마는 정의되었으나 **Alembic 미도입**, `Base.metadata.create_all()` 로 생성 중
- **Compliance**: 9개 의료법 룰 yaml + DB 적재 + linter (`src/compliance/linter.py`) — **tenant 격리는 DB 레벨에서만**, yaml channel-specific 머지 미구현
- **Content**: FAQ + Blog HTML 2채널 + 자동수정 루프 (`src/content/generator.py`) — 네이버 평문은 blog_html.py 부산물(`render_naver_blog_plain()`)로만 존재, Instagram 미구현
- **LLM**: Stub/Gemini/Anthropic/OpenAI provider, system prompt 2종 (`_FAQ_SYSTEM_PROMPT`, `_BLOG_SYSTEM_PROMPT`)
- **Cost guardrail**: `MAX_CONTENT_GEN_PER_DAY` 만 동작 (`src/content/llm.py:check_daily_budget`), `MAX_DAILY_USD` 미구현 (USD 누적 추적 없음)
- **UI**: 6탭 Streamlit, 채널 드롭다운 없음 (FAQ/블로그가 별도 탭)
- **Tenants**: `config/tenants.yaml` — 2 tenants (BGN 안과, 메디맵 SaaS), channel-specific rules 섹션 없음

### Phase 2 의 정확한 Delta

| 영역 | 현재 (Phase 1.5) | Phase 2 목표 |
|------|------------------|--------------|
| **채널 수** | 2 (FAQ Schema.org / Blog HTML) | 4 (+ 네이버 평문 독립 / Instagram 캡션 신규) |
| **System prompts** | 2개 (FAQ, Blog) | 4개 (채널별 분리) |
| **DB 마이그레이션** | `create_all()` 만 | Alembic baseline + 1 머지 마이그레이션 |
| **ReferenceDocument** | 미정의 | 정의 + 마이그레이션 (Phase 3 가 사용) |
| **Tenant rules** | DB 단일 소스 | yaml channel-specific + DB 머지 |
| **Cost guardrail** | 일 카운트만 | USD 누적 + LlmCallLog + 사전 예측 거부 |
| **단위 테스트** | 4개 (linter/generator/blog/tenant_context) | + naver/instagram/cost/merge 4개 |
| **Logging** | structlog 인스턴스만, JSON 미강제 | INF-03: JSON 포맷 + 레벨 환경변수 |
| **UI** | FAQ/블로그 별도 탭 | UI-02: 채널 드롭다운 + 통합 |

### 위험 식별
1. **Alembic 도입 시 기존 production SQLite (Streamlit Cloud) 데이터 보존**: `alembic stamp head` 로 baseline 처리 필요
2. **네이버 평문을 독립 LLM 호출로 만들 때 blog_html 의 `render_naver_blog_plain()` 부산물과의 호환성**: 기존 Streamlit "블로그 포스트" 탭이 평문도 함께 노출하는데, 이를 깨지 않으려면 신규 채널 추가가 우선이고 기존 부산물은 deprecation 표시
3. **USD 가드레일은 정확한 토큰/단가 매핑이 어려움**: 보수적 추정치(per-1k-tokens 정찰가)로 시작하고, 모델별 매핑 테이블을 `src/content/cost.py` 에 명시
4. **GeneratedContent.channel enum 확장**: 기존 SQLite 의 `channel` 값은 `schema_org`, `blog_html` — 새 값 `naver_blog`, `instagram` 추가 시 enum 제약 없으므로 (현재 String) 호환

---

## Plans

### Plan 02-01: 데이터 모델 풀스코프 + Alembic + tenants.yaml 머지 로더

**Goal**: SQLAlchemy 모델을 Alembic 으로 관리하고, ReferenceDocument(Phase 3 의존) 를 정의하며, tenants.yaml 의 channel-specific rules 가 DB 와 머지되어 적용된다.

**Requirements 매핑**: DAT-02, DAT-04, TEN-02, TEN-03, CMP-05 (일부)

**Tasks**:

- [ ] **T1.1: Alembic 초기화**
  - `pip install alembic>=1.13` 추가 (`pyproject.toml`)
  - `alembic init alembic` 실행 후 `alembic.ini`, `alembic/env.py`, `alembic/versions/` 생성
  - `env.py` 수정: `from src.storage.models import Base` + `target_metadata = Base.metadata`, `sqlalchemy.url` 을 `os.getenv("DATABASE_URL", "sqlite:///./data/geo.db")` 로 동적 로드
  - **Verification**: `alembic current` 동작, `alembic history` 가 빈 결과 반환
  - **Files**: `pyproject.toml`, `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`

- [ ] **T1.2: Baseline 마이그레이션 생성 (현재 스키마 캡처)**
  - `alembic revision --autogenerate -m "baseline_phase_1_5"` — Tenant/Keyword/ComplianceRule/GeneratedContent/Doctor/Equipment/EventOffer/BrandVoice 8개 테이블 캡처
  - 생성된 `versions/<rev>_baseline_phase_1_5.py` 검수: 8개 테이블 + FK + 인덱스 일치 확인
  - **기존 SQLite 보존 절차** 문서화: `alembic stamp head` 로 production DB 를 baseline 으로 표식 → 마이그레이션 재실행 안 함
  - **Verification**: 새 빈 SQLite 에서 `alembic upgrade head` 실행 시 8개 테이블 생성, 기존 SQLite 에서 `alembic stamp head` 후 `alembic current` 가 baseline rev 반환
  - **Files**: `alembic/versions/<hash>_baseline_phase_1_5.py`

- [ ] **T1.3: ReferenceDocument 모델 추가 + 마이그레이션**
  - `src/storage/models.py` 에 `ReferenceDocument` 추가:
    ```
    id, tenant_id (FK), source_type (url|file|text), source_url, title,
    content_hash (unique with tenant_id), raw_text, indexed_at, chunk_count
    ```
  - `Tenant.reference_documents` relationship 추가
  - `alembic revision --autogenerate -m "add_reference_document"` → 검수 → 새 마이그레이션 파일
  - **Verification**: `alembic upgrade head` 후 SQLite 에 `reference_documents` 테이블 존재 + tenant_id FK 동작
  - **Files**: `src/storage/models.py`, `alembic/versions/<hash>_add_reference_document.py`

- [ ] **T1.4: tenants.yaml 풀 로더 — channel-specific rules 섹션 지원**
  - `config/tenants.yaml` 에 각 tenant 항목 아래 `channel_rules:` 섹션 추가 (예: BGN 안과 의 instagram 채널만 추가 forbidden_word `"즉시 효과"`)
  - 새 모듈 `src/storage/tenant_loader.py`:
    - `load_tenants_yaml() -> list[TenantSpec]` — 기존 시드와 별도, 런타임 머지용
    - `load_channel_rules(tenant_id, channel) -> list[ComplianceRule]` — yaml 의 channel_rules 를 ComplianceRule 인스턴스로 변환 (DB 미저장, in-memory)
  - 시드 로직 (`src/storage/seed.py`) 은 **default 룰만** DB 적재. channel-specific 은 yaml-only (런타임 머지).
  - **Verification**: `pytest tests/test_tenant_loader.py` — yaml 의 channel_rules 가 정확히 파싱되어 채널별로 분기되는지
  - **Files**: `src/storage/tenant_loader.py`, `config/tenants.yaml` 갱신, `tests/test_tenant_loader.py`

- [ ] **T1.5: scripts/init_db.py 가 Alembic 으로 동작**
  - `scripts/init_db.py` 수정: `create_all()` 호출 제거 → 대신 `subprocess.run(["alembic", "upgrade", "head"])` 또는 `from alembic import command; command.upgrade(cfg, "head")`
  - `--reset` 옵션은 `drop_all() + alembic upgrade head` 로 변경
  - `seed_tenants/seed_rules` 호출 부분 유지 (기존 idempotent upsert 동작)
  - **Verification**: `python scripts/init_db.py --reset` 실행 시 9개 테이블 (8 baseline + 1 ref_doc) 생성 + sample tenant 시드 + `alembic current` 가 최신 rev
  - **Files**: `scripts/init_db.py`

- [ ] **T1.6: production DB 보존 검증 (수동 — 1 commit 분량)**
  - 로컬 SQLite (`./data/geo.db`) 에 대해 `alembic stamp head` 실행 → 기존 GeneratedContent 행 보존되는지 확인
  - `tests/test_alembic_smoke.py` 추가: in-memory SQLite 에 `command.upgrade(cfg, "head")` 호출 후 8+1 테이블 인지 검증
  - README 에 "Alembic 도입 후 기존 DB 마이그레이션 절차" 섹션 추가 (`alembic stamp head` 가이드)
  - **Verification**: pytest 35개 통과 (기존 34 + alembic_smoke 1)
  - **Files**: `tests/test_alembic_smoke.py`, `README.md`

**Files affected (Plan 02-01 전체)**:
- `pyproject.toml` (alembic 추가)
- `alembic.ini`, `alembic/env.py`, `alembic/versions/*` (신규)
- `src/storage/models.py` (ReferenceDocument 추가)
- `src/storage/tenant_loader.py` (신규)
- `config/tenants.yaml` (channel_rules 섹션)
- `scripts/init_db.py` (alembic 호출로 전환)
- `tests/test_tenant_loader.py`, `tests/test_alembic_smoke.py` (신규)
- `README.md` (마이그레이션 절차)

**Verification (Plan 02-01 합격 기준)**:
- `alembic current` 가 ref_document rev 반환
- `alembic upgrade head` 와 `alembic downgrade -1` 양방향 동작
- 기존 production SQLite 의 GeneratedContent 행 손실 없음 (`alembic stamp head` 절차로)
- pytest 36개 (34 + 2 신규) 통과
- `from src.storage.tenant_loader import load_channel_rules; load_channel_rules(1, "instagram")` 호출이 yaml 정의 룰을 반환

---

### Plan 02-02: 채널별 템플릿 4종 + 시스템 프롬프트 분리 + UI 통합

**Goal**: 네이버 블로그 평문이 독립 LLM 호출로 분리되고, Instagram 캡션이 신규 추가되며, 4개 채널 각각이 전용 system prompt 를 가지고, Streamlit UI 가 채널 드롭다운으로 통합된다.

**Requirements 매핑**: GEN-04, GEN-05 (확인), GEN-06, GEN-07, GEN-08, UI-02

**Tasks**:

- [ ] **T2.1: src/content/templates/naver_blog.py — 네이버 블로그 평문 독립 채널**
  - 신규 모듈. dataclass `NaverBlogPost(title, intro, sections: list[NaverSection], conclusion, hashtags, image_count)`
  - `render_naver_plain(post: NaverBlogPost, tenant: Tenant) -> str` — 1500~2500자, `[이미지N]` placeholder, 이모지 헤더, 마지막에 위치 안내 + 해시태그
  - `post_from_dict(data: dict) -> NaverBlogPost` — LLM JSON 파싱
  - **기존** `blog_html.py:render_naver_blog_plain()` 는 deprecation 주석 추가 (`# DEPRECATED: Phase 2-T2.1 이후 src/content/templates/naver_blog.py 사용`), 당장 삭제 X (UI 호환성)
  - **Verification**: `pytest tests/test_naver_blog.py` (T3.4 와 함께)
  - **Files**: `src/content/templates/naver_blog.py` (신규), `src/content/templates/blog_html.py` (주석)

- [ ] **T2.2: src/content/templates/instagram.py — Instagram 캡션 신규**
  - 신규 모듈. dataclass `InstagramCaption(hook, body, cta, hashtags: list[str], emoji_density: float)`
  - `render_instagram_caption(cap: InstagramCaption, tenant: Tenant) -> str` — 200~300자 본문 + 5~10개 해시태그, 줄바꿈 가독성
  - 글자 수 검증 헬퍼 `validate_length(text) -> tuple[ok: bool, char_count: int]` (한글 1자=1, 이모지 1자=1)
  - `post_from_dict(data: dict) -> InstagramCaption`
  - **Verification**: 단순 dict 입력 → render 결과의 본문 글자 수 200~300, 해시태그 개수 5~10
  - **Files**: `src/content/templates/instagram.py` (신규)

- [ ] **T2.3: src/content/llm.py — 채널별 generate 메소드 추가**
  - `LLMProvider` Protocol 에 추가: `generate_naver_blog(...) -> NaverBlogGenerationResult`, `generate_instagram(...) -> InstagramGenerationResult`
  - 4개 provider 클래스 (`StubProvider`, `GeminiProvider`, `AnthropicProvider`, `OpenAIProvider`) 모두 구현
  - StubProvider 는 `_stub_naver_blog()`, `_stub_instagram_caption()` — 의료법 안전 + 사람 톤 미리 작성된 견본
  - 새 dataclass `NaverBlogGenerationResult(post_dict, raw_text, provider, angle)`, `InstagramGenerationResult(caption_dict, raw_text, provider, angle)`
  - **Verification**: `from src.content.llm import StubProvider; StubProvider().generate_naver_blog(...)` 가 정상 dict 반환
  - **Files**: `src/content/llm.py`

- [ ] **T2.4: src/content/llm.py — 채널별 system prompt 분리 (4개)**
  - `_FAQ_SYSTEM_PROMPT` (기존 유지)
  - `_BLOG_SYSTEM_PROMPT` (기존 유지)
  - `_NAVER_SYSTEM_PROMPT` 신규 — 1500~2500자, 평문(HTML 금지), 이모지 헤더, `[이미지N]` placeholder, 네이버 검색 SEO 톤
  - `_INSTAGRAM_SYSTEM_PROMPT` 신규 — 200~300자, hook 첫 1줄, CTA 마지막, 해시태그 5~10개, 의료법 압축 표현 가이드
  - `GeminiProvider.__init__` 에서 system_instruction 별 모델 인스턴스 4개 (또는 호출 시 전달)
  - **Verification**: 각 prompt 가 1) 의료법 가이드 포함 2) 채널 길이 제약 명시 3) JSON 출력 스키마 명시
  - **Files**: `src/content/llm.py`

- [ ] **T2.5: src/content/generator.py — generate_naver_blog_content() + generate_instagram_content()**
  - `generate_naver_blog_content(session, tenant_id, keyword, *, target_chars=2000, max_corrections=3, ...) -> NaverBlogResult`
    - 흐름: cost guardrail → LLM 호출 → lint → 위반 시 자동수정 루프 (최대 3회) → 평문 렌더 → DB 저장 (`channel="naver_blog"`)
  - `generate_instagram_content(session, tenant_id, keyword, *, max_corrections=3, ...) -> InstagramResult`
    - 흐름 동일, `channel="instagram"`
  - 신규 dataclass `NaverBlogResult(post, plain_text, compliance, iterations, provider, saved_id)`, `InstagramResult(caption, rendered, compliance, iterations, provider, saved_id)`
  - 공통 자동수정 헬퍼 추출: `_run_correction_loop(provider_fn, lint_fn, max_corrections) -> tuple[result, report, iterations, history]` (FAQ/Blog 도 점진적 리팩토 OK, **단 본 plan 에선 신규 2채널만 사용. FAQ/Blog 리팩토는 out of scope**)
  - **Verification**: pytest 의 stub provider 시나리오에서 두 함수 모두 `compliance.passed=True` 반환
  - **Files**: `src/content/generator.py`

- [ ] **T2.6: src/dashboard/app.py — 채널 드롭다운 통합 UI (UI-02)**
  - 기존 "FAQ생성프로그램", "블로그 포스트" 탭은 **유지 (호환성)**
  - 신규 탭 "콘텐츠 발행 (통합)" 추가:
    - 채널 드롭다운: `["Schema.org FAQ", "자사 블로그 HTML", "네이버 블로그 평문", "Instagram 캡션"]`
    - 키워드 입력, tenant 선택, 발행 개수 (1~10), 톤/각도 선택
    - 채널별 분기: 위 4개 generator 함수 호출
    - 결과 표시: 채널별 미리보기 + 복사 버튼 + Compliance 상태 칩 (pass/warn/fail)
    - 자동수정 횟수 노출 (`iterations`)
  - **Verification**: `streamlit run src/dashboard/app.py` → 통합 탭에서 4채널 모두 stub provider 로 발행 가능
  - **Files**: `src/dashboard/app.py`, (선택) `src/dashboard/unified_publisher_tab.py` 신규 분리

- [ ] **T2.7: GeneratedContent.channel 호환 + 채널별 metadata 처리**
  - `GeneratedContent.channel` 은 String 이므로 enum 제약 없음 — 신규 값 `"naver_blog"`, `"instagram"` 그대로 저장
  - `raw_qa_pairs` (JSON 컬럼) 에 채널별 메타 저장:
    - `naver_blog`: `{title, char_count, n_sections, hashtags, image_count}`
    - `instagram`: `{hook, body, cta, hashtags, char_count}`
  - Streamlit 의 GeneratedContent 조회 화면이 신규 채널도 카드로 표시 (이미 channel 별 분기 있다면 case 추가)
  - **Verification**: `session.query(GeneratedContent).filter_by(channel="naver_blog").first().raw_qa_pairs` 가 위 dict 형태
  - **Files**: `src/content/generator.py` (저장 로직), `src/dashboard/app.py` (조회 UI)

**Files affected (Plan 02-02 전체)**:
- `src/content/templates/naver_blog.py` (신규)
- `src/content/templates/instagram.py` (신규)
- `src/content/llm.py` (4개 prompt + 2개 generate 메소드 × 4 provider)
- `src/content/generator.py` (2개 신규 함수 + 공통 루프 헬퍼)
- `src/dashboard/app.py` (통합 탭)
- `src/dashboard/unified_publisher_tab.py` (선택, 신규)

**Verification (Plan 02-02 합격 기준)**:
- 4채널 모두 stub provider 로 호출 시 `compliance.passed in (True, "warn")` 결과 반환
- 네이버 평문은 1500~2500자 범위 (stub 견본 포함), Instagram 은 200~300자 + 5~10 해시태그
- Streamlit 통합 탭에서 채널 드롭다운 → 발행 → 복사 동작
- 4개 system prompt 모두 의료법 가이드 + 길이 제약 + JSON 스키마 명시
- `GeneratedContent` 에 `channel="naver_blog"`, `"instagram"` 행 정상 저장

---

### Plan 02-03: 자동수정 루프 안정화 + 비용 가드레일 강화 + 단위 테스트 + structlog

**Goal**: USD 누적 가드레일이 동작하고, tenant별 yaml + DB 룰 머지가 적용되며, 4채널 핵심 모듈에 pytest 가 존재하고, structlog 가 JSON 포맷으로 운영 환경에서 활용 가능하다.

**Requirements 매핑**: GEN-09, CMP-05 (완성), INF-03, INF-04

**Tasks**:

- [ ] **T3.1: src/content/cost.py — USD 가드레일 + 단가 테이블**
  - 신규 모듈. 모델별 1k 토큰 단가 dict:
    ```python
    PRICING = {
        "gemini-2.5-flash":  {"input": 0.075, "output": 0.30},   # /1M tokens, USD
        "claude-haiku-4-5":  {"input": 1.0,   "output": 5.0},
        "gpt-4o-mini":       {"input": 0.15,  "output": 0.60},
        "stub":              {"input": 0.0,   "output": 0.0},
    }
    ```
  - `estimate_call_cost_usd(model, input_tokens, output_tokens) -> float`
  - `check_daily_usd_budget(session, tenant_id) -> None` — `MAX_DAILY_USD` 환경변수 (기본 5.0) 와 누적 비교 후 raise `CostGuardrailExceeded`
  - **Verification**: `pytest tests/test_cost_guardrail.py`
  - **Files**: `src/content/cost.py` (신규)

- [ ] **T3.2: LlmCallLog 테이블 + 비용 추적**
  - `src/storage/models.py` 에 `LlmCallLog` 추가:
    ```
    id, tenant_id (FK), called_at, provider, model, channel, keyword,
    input_tokens, output_tokens, cost_usd, status (success|error|guardrail),
    error_msg (nullable)
    ```
  - Alembic autogenerate 마이그레이션 추가
  - `src/content/llm.py` 의 4개 real provider 가 호출 직후 `LlmCallLog` 행 작성 (provider 가 `Session` 을 받지 않으므로 generator 가 wrapper 로 추적, 또는 dataclass 에 token_usage 채워서 반환 후 generator 에서 저장)
  - **결정**: provider 는 token_usage 만 반환, generator 가 LlmCallLog 저장 — provider 의 DB-free 보장
  - `src/content/llm.py` 의 `GenerationResult`/`BlogGenerationResult`/신규 2개에 `input_tokens`, `output_tokens`, `model` 필드 추가 (Stub 은 0)
  - **Verification**: stub provider 로 발행 후 `session.query(LlmCallLog).count()` 증가 확인
  - **Files**: `src/storage/models.py`, `alembic/versions/<hash>_add_llm_call_log.py`, `src/content/llm.py`, `src/content/generator.py`

- [ ] **T3.3: tenant별 yaml + DB ComplianceRule 머지 (CMP-05 완성)**
  - `src/compliance/linter.py` 에 신규 함수 `lint_for_channel(session, tenant_id, channel, text) -> ComplianceReport`:
    - DB rules: `session.query(ComplianceRule).filter(...).all()` (default + tenant 별)
    - yaml channel rules: `tenant_loader.load_channel_rules(tenant_id, channel)`
    - 머지 정책: 같은 `pattern` 이 양쪽에 있으면 yaml 이 우선 (channel-specific override) → 중복 제거 후 `lint_with_rules(text, merged)` 호출
  - `src/content/generator.py` 의 4개 함수가 `lint()` 대신 `lint_for_channel(session, tenant_id, channel, text)` 호출
  - **Verification**: `pytest tests/test_compliance_merge.py` — yaml 에 instagram 전용 룰이 있을 때, faq 채널 lint 결과에는 없고 instagram 채널 lint 결과에는 포함되는지
  - **Files**: `src/compliance/linter.py`, `src/content/generator.py`, `config/tenants.yaml` (테스트 픽스처용 channel_rules)

- [ ] **T3.4: pytest — test_naver_blog.py + test_instagram.py**
  - `tests/test_naver_blog.py`:
    - `test_render_plain_length` — 견본 NaverBlogPost render 결과 1500~2500자 범위
    - `test_naver_post_from_dict` — LLM 견본 dict → NaverBlogPost 매핑
    - `test_generate_naver_blog_content_stub` — stub provider 로 generator 호출 → `compliance.passed` 또는 `compliance.has_warnings()` 만, `iterations <= 3`, DB 저장 확인 (`channel="naver_blog"`)
  - `tests/test_instagram.py`:
    - `test_caption_length` — 본문 200~300자
    - `test_hashtag_count` — 5~10개
    - `test_generate_instagram_content_stub` — stub generator → DB 저장 (`channel="instagram"`)
  - **Verification**: 신규 6개 테스트 모두 통과
  - **Files**: `tests/test_naver_blog.py`, `tests/test_instagram.py` (신규)

- [ ] **T3.5: pytest — test_cost_guardrail.py**
  - `test_estimate_call_cost_usd` — 단가 계산 정확성 (gemini 1k/1k 토큰 → USD 일치)
  - `test_check_daily_usd_budget_under_limit` — 누적 < MAX_DAILY_USD → 통과
  - `test_check_daily_usd_budget_exceeds` — 누적 > MAX_DAILY_USD → `CostGuardrailExceeded` raise
  - `test_check_daily_count_still_works` — 기존 카운트 가드레일도 보존
  - `test_llm_call_log_persists` — 호출 후 LlmCallLog 행 작성 + cost_usd 값 정확
  - **Verification**: 5개 테스트 통과
  - **Files**: `tests/test_cost_guardrail.py` (신규)

- [ ] **T3.6: pytest — test_compliance_merge.py**
  - 픽스처: tenant_id=1, DB 에 default 룰 1개 (`100% 보장`), yaml channel_rules 에 instagram 전용 1개 (`즉시 효과`)
  - `test_faq_channel_no_instagram_rule` — `lint_for_channel(s, 1, "schema_org", "즉시 효과")` → 위반 0
  - `test_instagram_channel_includes_yaml_rule` — `lint_for_channel(s, 1, "instagram", "즉시 효과")` → error 1
  - `test_db_rule_still_applies_all_channels` — `"100% 보장"` 은 모든 채널에서 위반
  - `test_yaml_overrides_db_when_same_pattern` — pattern 중복 시 yaml severity 우선
  - **Verification**: 4개 테스트 통과
  - **Files**: `tests/test_compliance_merge.py` (신규)

- [ ] **T3.7: structlog JSON 포맷 적용 (INF-03)**
  - 신규 `src/observability/logging_config.py`:
    - `configure_logging(level: str | None = None, json_format: bool = True)`:
      - `LOG_LEVEL` 환경변수 (기본 INFO)
      - `LOG_FORMAT=json|console` (기본 json, 로컬 개발은 console)
      - `structlog.configure(...)` 로 processor chain 설정 — JSONRenderer 또는 ConsoleRenderer
  - `scripts/init_db.py`, `src/dashboard/app.py` 진입부에서 `configure_logging()` 호출
  - 기존 `structlog.get_logger(__name__)` 호출은 유지 (config 가 binding)
  - **Verification**: `LOG_FORMAT=json python scripts/init_db.py` 실행 시 stdout 에 `{"event": "...", "level": "info", "timestamp": "..."}` 형태 라인
  - **Files**: `src/observability/__init__.py`, `src/observability/logging_config.py` (신규), `scripts/init_db.py`, `src/dashboard/app.py`

**Files affected (Plan 02-03 전체)**:
- `src/content/cost.py` (신규)
- `src/storage/models.py` (LlmCallLog)
- `alembic/versions/<hash>_add_llm_call_log.py` (신규)
- `src/content/llm.py` (token_usage 반환)
- `src/content/generator.py` (LlmCallLog 저장 + lint_for_channel 사용)
- `src/compliance/linter.py` (lint_for_channel)
- `src/observability/logging_config.py` (신규)
- `tests/test_naver_blog.py`, `tests/test_instagram.py`, `tests/test_cost_guardrail.py`, `tests/test_compliance_merge.py` (신규)
- `config/tenants.yaml` (channel_rules 테스트 픽스처)

**Verification (Plan 02-03 합격 기준)**:
- 신규 4개 테스트 파일 (총 6+5+4 = 15 신규 테스트) + Plan 02-01 의 2개 = pytest **49개 통과** (기존 34 + 신규 15)
- `MAX_DAILY_USD=0.0` 환경변수로 stub 외 provider 호출 시 즉시 `CostGuardrailExceeded`
- `LOG_FORMAT=json` 시 모든 generator 로그가 1줄 JSON
- `lint_for_channel` 이 yaml + DB 머지 결과를 반환

---

## Risks & Mitigations

| Risk | 영향 | Mitigation |
|------|------|------------|
| Alembic 도입 시 production SQLite (Streamlit Cloud) 손실 | High | T1.6 의 `alembic stamp head` 절차 + README 가이드 + tests/test_alembic_smoke.py |
| 네이버 평문 독립 LLM 호출 단가 ↑ | Medium | StubProvider 가 견본 반환하므로 데모는 영향 없음. 운영 시 T3.1 의 USD 가드레일이 차단 |
| 4채널 system prompt 가 LLM JSON 출력을 빗나갈 확률 | Medium | `_parse_*_json` 헬퍼에 fallback 추가. T3.4/T3.5 stub-only 테스트로 회귀 차단 |
| Streamlit 통합 탭이 기존 FAQ/블로그 탭과 충돌 | Low | T2.6 에서 기존 탭 유지 + 신규 탭 추가 (additive). 사용자가 점진 마이그레이션 |
| GeneratedContent.raw_qa_pairs JSON 스키마 불일치 (FAQ vs naver vs ig) | Medium | T2.7 에서 채널별 스키마 명시. 조회 시 `channel` 으로 분기 |
| LlmCallLog 가 Streamlit Cloud 휘발성 SQLite 에서 매 재시작 사라짐 | Low (의도) | 가드레일은 일 단위로 유의미. 영구 보존은 v2 PostgreSQL 마이그레이션 시 해결 |
| Phase 3 ReferenceDocument 사용 시 chunk 별 추가 컬럼 필요할 수 있음 | Low | T1.3 은 document 테이블만, chunk 는 Phase 3 에서 별도 (Chroma metadata + 옵션 SQL) |

---

## Validation Plan (Phase 2 Success Criteria 5개 검증)

| Criterion | 검증 방법 |
|-----------|-----------|
| 1. 사용자가 채널 4종 드롭다운으로 각 포맷 콘텐츠를 받는다 | Streamlit 통합 탭에서 4채널 각각 stub provider 로 발행 → 복사 → 미리보기 (수동 verify) + `tests/test_naver_blog.py::test_generate_naver_blog_content_stub` + `tests/test_instagram.py::test_generate_instagram_content_stub` |
| 2. tenant별 yaml + DB 룰이 머지되어 적용된다 | `pytest tests/test_compliance_merge.py` 4개 테스트 통과 + Streamlit 발행 시 instagram 채널만 yaml 룰 적용되는지 수동 확인 |
| 3. 비용 가드레일 (`MAX_DAILY_USD`, `MAX_CONTENT_GEN_PER_DAY`) 사전 체크 + 초과 시 거부 | `pytest tests/test_cost_guardrail.py` 5개 통과. `MAX_DAILY_USD=0.0 LLM_PROVIDER=gemini` 로 streamlit 발행 시도 → 즉시 거부 메시지 |
| 4. ReferenceDocument, GeneratedContent 등 v1 풀 데이터 모델이 Alembic 마이그레이션으로 관리된다 | `alembic history` 가 baseline + ref_document + llm_call_log 3개 rev 표시. `alembic upgrade head` / `alembic downgrade base` 양방향 동작 |
| 5. pytest 단위 테스트가 핵심 모듈(linter, generator, exporter)에 존재한다 | `pytest -v` 49개 통과 (기존 34 + Plan 02-01 의 2 + Plan 02-03 의 15) |

**최종 게이트**: `pytest -v && alembic upgrade head && streamlit run src/dashboard/app.py` 모두 성공.

---

## Out of Scope (Phase 2 에서 명시적으로 안 하는 것)

| Item | 이유 / 어디서 처리 |
|------|---------------------|
| 외부 채널 자동 게시 (네이버 블로그/인스타) | Project 원칙 — ToS 위반 + 의료법 리스크. 사용자가 복사해 수동 게시. |
| RAG (URL 인덱싱 + Chroma + retriever) | Phase 3. 본 phase 의 ReferenceDocument 모델은 Phase 3 dependency 만 미리 확보. |
| 측정 인프라 (engine, collector, mention extractor) | Phase 4. |
| 4엔진 동시 호출 / NER / Competitor discovery | Phase 6. |
| 대시보드 시계열 / Mann-Kendall / Wilson CI | Phase 5. |
| PostgreSQL 마이그레이션 / 멀티 사용자 / 결제 | v2 (SAS-*). |
| FAQ/Blog 함수의 자동수정 루프 리팩토 | T2.5 에서 신규 2채널만 공통 헬퍼 사용. 기존 FAQ/Blog 는 회귀 위험 회피 — Phase 5 무렵 추가 리팩토 후보. |
| Instagram 이미지 자동 생성 / 캐러셀 | 미정. v2 검토. |
| Compliance 룰 hot-reload | 운영 시 `init_db` 재실행으로 충분. |
| LLM 모델별 정밀 단가 (실측 token 카운팅) | T3.1 의 정찰가 추정으로 충분. 실 운영 토큰 카운팅은 v2. |

---

*PLAN.md 생성: 2026-05-03*
*Phase 1 + 1.5 완료 직후, Streamlit Cloud live 상태 기준*
