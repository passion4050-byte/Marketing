# Phase 6: Multi-Engine + Competitor Discovery (MVP-2)

**Goal**: 4엔진(Perplexity, OpenAI, Gemini, Claude) 동시 수집 + 한국어 NER 기반 Competitor 자동 발견 + 사람 승인 워크플로 + Sentiment 분석.

**Status**: Planned
**Estimated**: 2~2.5일 — Plan 06-01 (~5h) + 06-02 (~6h) + 06-03 (~4h)
**Depends on**: Phase 5 (Mention v2 + Analytics)
**Requirements**: ENG-03, ENG-04, ENG-05, MEN-05, ANA-04, UI-04, SEN-01

---

## Context

### Phase 4-5 까지 보유한 것 (재사용)
- **BaseEngine + StubEngine + PerplexityEngine** — 추상화 + httpx async pattern. 신규 엔진 3개는 동일 시그니처로 추가만.
- **Collector**: `collect_for_keyword(engine)` — 단일 엔진. Phase 6 에서 `engines: list` 다중 받도록 확장.
- **LlmCallLog + 비용 가드레일**: 4엔진 모두 동일 패턴. PRICING dict 에 모델명 추가만.
- **Mention extractor v2**: weight + sentiment placeholder. Phase 6 에서 sentiment 가 "negative"/"positive"/"neutral" 셋 중 하나로.
- **Competitor 모델**: SPEC §3 정의돼 있으나 미생성. Phase 6 에서 신규.
- **측정 탭**: 키워드/시계열/멘션. 후보 검수 + 엔진별 비교 섹션 추가.

### Phase 6 의 정확한 Delta
| 영역 | 현재 | Phase 6 목표 |
|---|---|---|
| **검색 엔진** | Perplexity 1 (+ Stub) | + OpenAI / Gemini / Claude — 4엔진 |
| **Collector** | 단일 engine 인자 | `engines: list[BaseEngine]` 동시 수집 (asyncio.gather) |
| **NER** | 없음 | kiwipiepy + 룰베이스 → 병원명/시술명/지역 entity |
| **Competitor** | 모델 미생성 | `competitors` 테이블 + `discover_competitors()` + 검수 UI |
| **Sentiment** | placeholder ("negative"/null) | LLM 기반 (긍/부/중립) — 의료 도메인 룰 우선, fallback LLM |
| **분석** | tenant 1개 자기 자신만 | confirmed competitor 도 mention_share 에 포함 → 비교 차트 |
| **UI 후보 검수** | 없음 | 측정 탭에 "🎯 경쟁사 후보" 섹션 (승인/거절 버튼) |

### 핵심 결정 (decisions)

**1. 4엔진 동시 수집 — `asyncio.gather` 안에 다중 엔진**
- collect_for_keyword 시그니처를 `engines: list[BaseEngine]` 로 확장 (단일 engine 도 list 로 wrap)
- 각 엔진의 n_samples 합 = total samples. 예: 4엔진 × 5샘플 = 20개 호출
- Query.engine 컬럼에 어떤 엔진인지 기록 (이미 존재)
- concurrency 는 엔진 합산 — `asyncio.Semaphore(concurrency=5)` 그대로

**2. 신규 엔진 3종 — Perplexity 와 동일 패턴**
- OpenAI: `gpt-4o-mini` 기본 — 검색은 미지원이지만 Knowledge cutoff 기반 답변. 실제로 의료/안과 답변 가능.
- Gemini: `gemini-1.5-flash` 또는 `gemini-2.5-flash` — Google Search Grounding 사용
- Claude: `claude-haiku-4-5` 기본 — `web_search_20250305` tool 사용 가능
- 모두 키 미설정 시 `EngineError` raise. Stub fallback 은 factory 가 처리.

**3. cited_urls 추출**
- OpenAI: 응답 안에 URL 등장 시 정규식 추출 (Phase 6 단순)
- Gemini: `groundingMetadata.groundingSupports` 의 `groundingChunks` 에서 URL
- Claude: `tool_use` block 의 `web_search_20250305` 결과
- 폴백: 응답 텍스트의 URL 정규식

**4. NER — kiwipiepy + 룰베이스**
- 정의서 명시 (`kiwipiepy`) — 한국어 형태소 분석 라이브러리
- 의료 도메인 룰: 병원명 패턴 (`...안과`, `...피부과`, `...치과`, `...한의원`, `...의원`, `...병원`)
- 시술명 패턴: 사전 매칭 (`라식 / 라섹 / 임플란트 / 스킨부스터 / ...`)
- 지역명: kiwipiepy 의 NN(고유명사) 태그 + 한국 지역 사전
- LLM 기반 NER 은 미사용 (비용 + 일관성)

**5. discover_competitors — 빈도 + 응답 다양성 임계**
- 입력: tenant_id + 시간 범위
- 처리: 모든 Response 의 NER → entity 빈도 카운트 → tenant 자신/이미 confirmed 제외
- 임계: 응답 ≥ 3개 + 응답 다양성 (서로 다른 keyword 에 ≥ 2개) → 후보
- 출력: `[CompetitorCandidate(name, mention_count, response_count, keyword_count, first_seen, sample_snippets)]`
- 자동 승인 X — 사용자 검수 필수

**6. Competitor 모델 + Alembic 마이그레이션**
- 정의서 §3 시그니처: `tenant_id, name, aliases JSON, discovery_source, confirmed bool, first_seen_at`
- discovery_source: `manual | ai_response | category_match`
- 단일 마이그레이션 — 추가 columns 도 함께 (Mention.sentiment 는 이미 존재)

**7. Sentiment — 룰 + LLM hybrid**
- 1차: 부정 키워드 (Phase 5 룰북 활용) → 부정. 추천 키워드 → 긍정. 그 외 중립.
- 2차 (옵션): 룰이 None 이고 LLM_PROVIDER 가 활성이면 짧은 LLM 호출로 sentiment 분류
- Mention.sentiment 컬럼: "positive" | "negative" | "neutral" | null
- v1 placeholder 는 negative 만 저장 → v2 에서 3종 + null

**8. 비용 절감 — 4엔진 동시 수집은 비싸다**
- 측정 탭에 "엔진 선택" multi-select (기본 stub만 ON)
- 키워드 등록 시 4엔진 자동 활성화는 X — 사용자 선택
- LlmCallLog 는 엔진별로 누적 → 비용 트래킹 정확

---

## Plans

### Plan 06-01: 3엔진 추가 + 동시 수집

**Goal**: OpenAI / Gemini / Claude 검색 엔진이 BaseEngine 인터페이스로 동작하고, Collector 가 여러 엔진을 동시에 호출한다.

**Requirements**: ENG-03, ENG-04, ENG-05

**Tasks**:

- [ ] **T1.1: OpenAIEngine**
  - `src/engines/openai_engine.py` 신규 (모듈 명 `openai_engine` — `openai` 패키지와 충돌 방지)
  - `gpt-4o-mini` 기본 (`OPENAI_MODEL` env)
  - `chat/completions` API + system prompt = "한국어로 의료/안과 정보를 자연스럽게 정리"
  - cited_urls: 응답 텍스트에서 URL 정규식 추출 (검색 미지원 모델 fallback)
  - **Files**: `src/engines/openai_engine.py`

- [ ] **T1.2: GeminiEngine**
  - `src/engines/gemini.py` 신규
  - `gemini-2.5-flash` 기본 (`GEMINI_MODEL` env). `google-generativeai` 라이브러리 (이미 설치됨)
  - `tools=[{"google_search_retrieval": {}}]` Grounding 사용 시도, 실패하면 일반 호출
  - cited_urls: `response.candidates[0].grounding_metadata.grounding_chunks[].web.uri`
  - **Files**: `src/engines/gemini.py`

- [ ] **T1.3: ClaudeEngine**
  - `src/engines/claude.py` 신규
  - `claude-haiku-4-5` 기본 (`ANTHROPIC_MODEL` env). `anthropic` 라이브러리 (이미 설치됨)
  - `tools=[{"type": "web_search_20250305", "name": "web_search"}]` 사용 시도
  - cited_urls: tool_use 결과에서 추출, 폴백은 텍스트 정규식
  - **Files**: `src/engines/claude.py`

- [ ] **T1.4: factory 확장 + 비용 사전 등록**
  - `src/engines/__init__.py` get_engine 에 `openai`/`gemini`/`claude` 추가
  - `src/content/cost.py:PRICING` 에 4 모델 추가 (이미 있는 모델은 skip)
  - **Files**: `src/engines/__init__.py`, `src/content/cost.py`

- [ ] **T1.5: Collector 다중 엔진 지원**
  - `collect_for_keyword(engines: list[BaseEngine] | BaseEngine, ...)` — 후방호환 (단일 engine 도 list 로 wrap)
  - 매 sample 마다 `engines` 중 하나를 round-robin 으로 선택 (혹은 모두 호출)
  - 정책: 사용자 선택 — `engines` 인자가 list 면 round-robin (n_samples 가 4 의 배수면 균등 분배), 단일 engine 이면 기존 동작
  - **Files**: `src/collector/collect.py`

- [ ] **T1.6: pytest test_engines_extra**
  - 4엔진 모두 키 미설정 시 EngineError, 키 설정 + httpx mock 으로 응답 파싱 검증
  - Collector multi-engine 라운드 로빈 동작 — Query.engine 컬럼이 4 종류 분산
  - **Files**: `tests/test_engines_extra.py`, `tests/test_collector.py` (multi-engine 케이스 추가)

**Verification (Plan 06-01 합격)**:
- pytest 신규 9+ 통과 (4엔진 × 2 + collector multi)
- 회귀 0
- 측정 탭에서 엔진 선택 (multi-select) 후 ▶️ 수집 → Query.engine 분산 확인

---

### Plan 06-02: NER + Competitor Discovery + 검수 UI

**Goal**: AI 응답에서 한국어 의료기관/시술명을 추출해 빈도 임계 이상이면 Competitor 후보로 제시하고, 사용자가 측정 탭에서 승인/거절하면 confirmed=True 가 된다.

**Requirements**: MEN-05, ANA-04, UI-04

**Tasks**:

- [ ] **T2.1: Competitor 모델 + Alembic**
  - `src/storage/models.py` 에 `Competitor` 추가 (정의서 §3 시그니처):
    - `tenant_id, name, aliases JSON, discovery_source, confirmed bool, first_seen_at`
    - UNIQUE (tenant_id, name)
  - `alembic revision --autogenerate -m "add_competitor"`
  - test_alembic_smoke EXPECTED_TABLES + downgrade 갱신
  - **Files**: `src/storage/models.py`, `alembic/versions/{hash}_add_competitor.py`, `tests/test_alembic_smoke.py`

- [ ] **T2.2: 의료 NER 모듈**
  - `src/parser/ner.py` 신규
  - `extract_entities(text) -> list[Entity]` — `Entity(text, kind, position)` kind ∈ {"clinic", "procedure", "region"}
  - clinic: `(\S+?)(안과|피부과|치과|한의원|의원|병원|성형외과|이비인후과|정형외과)` 정규식 + kiwipiepy 명사 태그 보강
  - procedure: 사전 매칭 (`config/procedure_dict.yaml` 신규 — 라식/라섹/임플란트/...)
  - region: kiwipiepy NN 태그 + 한국 지역 시드 사전 (서울/강남/부산/...)
  - kiwipiepy 미설치 시 정규식 only 폴백
  - **Files**: `src/parser/ner.py`, `config/procedure_dict.yaml`

- [ ] **T2.3: discover_competitors() 함수**
  - `src/analytics/competitor.py` 신규
  - `discover_competitors(session, tenant_id, *, since=None, min_responses=3, min_keywords=2) -> list[CompetitorCandidate]`
  - 처리: tenant 의 모든 Response → extract_entities (clinic kind) → 빈도 + 응답 수 + 키워드 수 카운트
  - tenant 자신/이미 confirmed 인 entity 는 제외
  - 임계 통과만 후보 — 빈도 desc 정렬
  - `CompetitorCandidate(name, mention_count, response_count, keyword_count, first_seen, sample_snippets[3])`
  - **Files**: `src/analytics/competitor.py`

- [ ] **T2.4: 검수 UI — 측정 탭 "🎯 경쟁사 후보" 섹션**
  - `src/dashboard/measurement_tab.py` 에 새 섹션 (시계열 위)
  - 후보 카드 list — 이름 / 빈도 / 응답수 / 키워드수 / 샘플 snippet 1건 / [✅ 승인] [❌ 거절] 버튼
  - 승인 → Competitor INSERT (confirmed=True, discovery_source="ai_response")
  - 거절 → Competitor INSERT (confirmed=False) — 다음 discover 호출 때 스킵
  - confirmed=True 인 경쟁사 list 표시 — 삭제 버튼
  - **Files**: `src/dashboard/measurement_tab.py`

- [ ] **T2.5: extract_mentions 가 confirmed competitor 인식**
  - `extract_mentions` 시그니처에 `competitors: list[str]` 이미 있음 — Phase 6 에서 자동 주입
  - Collector 가 `confirmed=True` 인 Competitor.name 리스트를 자동 로드 → extract_mentions 에 전달
  - 효과: confirmed 경쟁사도 Mention 행 생성 (is_competitor=True)
  - **Files**: `src/collector/collect.py`

- [ ] **T2.6: pytest test_ner + test_competitor_discovery**
  - NER: "BGN 밝은눈안과" → ("BGN 밝은눈안과", clinic). "라식" → procedure. "강남" → region
  - 빈 텍스트 / 매칭 없음 → 빈 리스트
  - discover_competitors: 시드된 데이터에서 임계 통과 후보 정확히 추출, tenant 자신 제외
  - 검수 후 confirmed competitor 가 다음 collect 시 Mention 에 등장
  - **Files**: `tests/test_ner.py`, `tests/test_competitor_discovery.py`

**Verification (Plan 06-02 합격)**:
- pytest 신규 8+ 통과
- 측정 탭에서 후보 검수 동작 — 승인/거절 버튼 클릭 시 DB 반영 + 차트 갱신

---

### Plan 06-03: Sentiment 분석 + 분석 통합

**Goal**: 모든 Mention 에 sentiment(긍/부/중립) 가 부착되고, 측정 탭의 시계열 + 멘션 카드에 sentiment 분포가 노출된다.

**Requirements**: SEN-01, ANA-04 (확장)

**Tasks**:

- [ ] **T3.1: sentiment 분류 — 룰 기반 v1**
  - `src/parser/sentiment.py` 신규
  - `classify_sentiment(text, position, match_len, signals) -> str` ∈ {"positive", "negative", "neutral"}
  - 매치 ± 30자 윈도우에서:
    - 추천 키워드 + 부정 키워드 둘 다 → "neutral" (충돌 시 보수)
    - 추천 only → "positive"
    - 부정 only → "negative"
    - 둘 다 없음 → "neutral"
  - LLM 기반은 SEN-02 (Phase 7+) 로 이연
  - **Files**: `src/parser/sentiment.py`

- [ ] **T3.2: extract_mentions v2 → sentiment 추가**
  - `ExtractedMention.sentiment: str` 필드 추가 (default "neutral")
  - extract_mentions 함수가 classify_sentiment 호출 → 채움
  - Collector 가 Mention.sentiment 에 그대로 저장 ("negative"/"positive"/"neutral")
  - 기존 v1 호환: `enable_v2=False` 면 sentiment="neutral" 고정
  - **Files**: `src/parser/mentions.py`, `src/collector/collect.py`

- [ ] **T3.3: 측정 탭 sentiment 분포**
  - 시계열 KPI 영역에 sentiment 분포 chip 추가:
    - 🟢 긍정 N · ⚪ 중립 N · 🔴 부정 N
  - 멘션 상세 expander 의 각 멘션에 sentiment chip
  - **Files**: `src/dashboard/measurement_tab.py`

- [ ] **T3.4: 분석 통합 — sentiment 가중 share**
  - `mention_share()` 반환에 `positive_share, negative_share, neutral_share` 추가
  - confirmed 경쟁사 비교 차트: 측정 탭에 "🆚 경쟁사 비교" 섹션 — tenant + confirmed 경쟁사들의 share 막대 차트
  - **Files**: `src/analytics/visibility.py`, `src/dashboard/measurement_tab.py`

- [ ] **T3.5: pytest test_sentiment + test_share_with_sentiment**
  - 추천만 → positive, 부정만 → negative, 둘 다 → neutral, 둘 다 없음 → neutral
  - mention_share 의 positive/negative/neutral_share 가 비율 합 = share 가 되도록
  - **Files**: `tests/test_sentiment.py`

**Verification (Plan 06-03 합격)**:
- pytest 신규 5+ 통과
- 측정 탭에서 멘션 카드에 sentiment chip + 시계열 KPI 의 분포 표시
- 경쟁사 비교 차트 노출 (≥ 1 confirmed 경쟁사 있을 때)

---

## Out of Scope (Phase 6 에서 안 하는 것)

- **External Discovery** (네이버 지도/카카오 로컬 API) — EXT-01, MVP-3 이후
- **Aspect-based Sentiment** (어떤 측면이 부정적인지) — SEN-02, MVP-3+
- **PostgreSQL + Celery+Redis** — SAS-05/SAS-06, MVP-5+
- **본격 React+FastAPI 마이그레이션** — SAS-01, MVP-5+
- **A/B 테스트 프레임워크** — Phase 7+

---

## Verification (Phase 6 종료 조건 — 정의서 §7 MVP-2)

- [ ] 4개 엔진 동시 수집 (Query.engine 컬럼에 perplexity/openai/gemini/claude 모두 등장)
- [ ] kiwipiepy + 룰 NER 가 한국어 의료기관/시술명 추출
- [ ] discover_competitors() 후보 풀 → 사람 승인 → confirmed=True 후보가 분석에 포함
- [ ] Sentiment (긍/부/중립) ≥ 70% 정확도 (시드 데이터 기준 자체 평가)
- [ ] 신규 pytest 22+ 통과 (T1: 9, T2: 8, T3: 5)
- [ ] 회귀 0 (187 → 209+)
