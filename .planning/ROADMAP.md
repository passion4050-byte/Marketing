# Roadmap: GEO/AEO SaaS (메디맵)

## Overview

GEO/AEO SaaS의 v1.0 마일스톤. 정의서(SPEC-v2.md) MVP-0~3 풀스코프를 6개 phase로 분할. **사용자 의도에 따라 정의서 §9의 "측정 → 분석 → 콘텐츠" 권장 순서를 뒤집어 콘텐츠 데모를 Phase 1로 배치**한다. 이유: 메디맵에 즉시 시연 가능한 결과물 확보.

Phase 1은 **오늘 3시간 안에 동작하는 데모 슬라이스** — 의료법 컴플라이언스 + FAQ Schema.org JSON-LD 생성기. Phase 2~6은 정의서 풀스코프로 확장.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Demo Slice (Compliance + FAQ JSON-LD)** — 의료법 린터 + LLM FAQ 생성 + JSON-LD 출력 + Streamlit (오늘 3h)
- [ ] **Phase 2: Content Pipeline 확장 (4채널 + 자동수정 루프)** — Schema.org/Blog/네이버/Instagram 템플릿 + 자동 수정 루프
- [ ] **Phase 3: Reference Library (RAG)** — Chroma + URL 인덱싱 + tenant 격리 검색 + Content Generator 통합
- [x] **Phase 4: Measurement Foundation (MVP-0)** — Engine 추상화 + Perplexity 1엔진 + 수집 + 멘션 추출 v1
- [ ] **Phase 5: Analytics 강화 (MVP-1)** — 가중치 + Mann-Kendall + 이상치 + Streamlit 대시보드
- [ ] **Phase 6: Multi-Engine + Competitor Discovery (MVP-2)** — 4엔진 동시 + NER 후보 발견 + Sentiment

## Phase Details

### Phase 1: Demo Slice (Compliance + FAQ JSON-LD)
**Goal**: 메디맵 운영자가 키워드를 입력하면 의료법 린트를 통과한 FAQ JSON-LD 코드를 받아 자사 웹사이트에 복사할 수 있다. **오늘 3시간 안에 동작.**
**Depends on**: Nothing (first phase)
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, GEN-01, GEN-02, GEN-03, UI-01, DAT-01, DAT-03, DAT-05, TEN-01, INF-01, INF-02, INF-05
**Success Criteria** (what must be TRUE):
  1. 사용자가 Streamlit UI에서 키워드(예: "강남 라식")와 tenant를 선택하면, LLM이 FAQ 5쌍을 생성한다
  2. 생성된 FAQ가 의료법 5개 이상의 룰로 린트되고, 위반 발견 시 LLM 자동 수정(최대 3회)이 동작한다
  3. 통과한 FAQ가 `<script type="application/ld+json">` FAQPage schema 형식으로 출력되고, 복사 버튼이 동작한다
  4. SQLite에 GeneratedContent가 저장되며 tenant_id가 격리된다
  5. README의 설치/실행 절차로 새 환경에서 데모를 재현할 수 있다
**Plans**: TBD (예상 2-3 plans)

Plans:
- [ ] 01-01: Foundation — pyproject + .env + 폴더구조 + SQLite 스키마(Tenant, ComplianceRule, GeneratedContent) + sample tenant 시드
- [ ] 01-02: Compliance + Generator — 의료법 룰셋 yaml + linter + LLM FAQ 생성 + 자동수정 루프 + JSON-LD exporter
- [ ] 01-03: Streamlit Demo UI — 키워드/tenant 입력, 결과 표시, 복사 버튼, README 데모 가이드

### Phase 2: Content Pipeline 확장 (4채널 + 자동수정 루프)
**Goal**: 4개 채널(Schema.org / Blog HTML / 네이버 / Instagram) 모두 생성 가능하고, 자동 수정 루프가 안정화되며, 멀티테넌트 룰셋이 yaml + DB 머지로 동작한다.
**Depends on**: Phase 1
**Requirements**: CMP-05, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08, GEN-09, DAT-02, DAT-04, TEN-02, TEN-03, INF-03, INF-04, UI-02
**Success Criteria** (what must be TRUE):
  1. 사용자가 채널 4종을 드롭다운으로 선택해 각 포맷의 콘텐츠를 받는다 (Schema.org, Blog HTML, 네이버 평문, Instagram 캡션)
  2. tenant별 yaml 룰 + DB 룰이 머지되어 적용된다
  3. 비용 가드레일(`MAX_DAILY_USD`, `MAX_CONTENT_GEN_PER_DAY`)이 사전 체크되고 초과 시 거부한다
  4. ReferenceDocument, GeneratedContent 등 v1 풀 데이터 모델이 Alembic 마이그레이션으로 관리된다
  5. pytest 단위 테스트가 핵심 모듈(linter, generator, exporter)에 존재한다
**Plans**: TBD

Plans:
- [ ] 02-01: 데이터 모델 풀스코프 + Alembic + tenants.yaml 로더
- [ ] 02-02: 채널별 템플릿 4종 + 시스템 프롬프트 분리
- [ ] 02-03: 자동수정 루프 안정화 + 비용 가드레일 + 단위 테스트

### Phase 3: Reference Library (RAG)
**Goal**: URL/문서를 ingest해 tenant 격리된 Chroma 인덱스를 만들고, Content Generator가 RAG 컨텍스트를 사용해 사실 기반 콘텐츠를 생성한다.
**Depends on**: Phase 2
**Requirements**: REF-01, REF-02, REF-03, REF-04, REF-05, REF-06, REF-07, UI-05
**Success Criteria** (what must be TRUE):
  1. CLI(`scripts/ingest_references.py`)로 URL/파일/텍스트를 인덱싱하면 Chroma에 chunk 단위로 저장된다
  2. content_hash로 중복 인덱싱이 차단된다
  3. tenant_id별로 컬렉션이 격리되어 다른 tenant의 문서가 검색에 안 노출된다
  4. Content Generator가 RAG retrieve top-5을 system prompt에 주입해 콘텐츠를 생성하며, 출력에 참고 source URL이 표시된다
  5. Streamlit UI에서 Reference 인덱싱 진행을 볼 수 있다
**Plans**: TBD

Plans:
- [ ] 03-01: crawler + chunker + embedder + Chroma store
- [ ] 03-02: retriever + Content Generator 통합 + Streamlit UI
- [ ] 03-03: ingest_references.py CLI + 중복 차단 + 사용자 가이드

### Phase 4: Measurement Foundation (MVP-0)
**Goal**: Perplexity 1엔진으로 키워드별 n=30 샘플을 수집하고, 멘션 추출 v1(정규화+위치)이 동작하며 SQLite에 저장된다.
**Depends on**: Phase 2 (Phase 3 병렬 가능)
**Requirements**: ENG-01, ENG-02, ENG-06, ENG-07, ENG-08, MEN-01
**Success Criteria** (what must be TRUE):
  1. BaseEngine 추상화로 새 엔진을 쉽게 추가할 수 있다
  2. PerplexityEngine으로 단일 키워드에 대해 n=30 샘플을 비동기 수집한다
  3. 비용 가드레일(`MAX_DAILY_USD`)이 동작해 한도 초과 시 수집을 멈춘다
  4. 수집된 응답에서 target_brand의 멘션이 위치 추적과 함께 추출되어 Mention 테이블에 저장된다
  5. APScheduler로 주기 수집(예: 일 1회)이 등록 가능하다
**Plans**: TBD

Plans:
- [ ] 04-01: BaseEngine + PerplexityEngine + EngineResponse
- [ ] 04-02: Collector + 비용 가드레일 + APScheduler
- [ ] 04-03: Mention Extractor v1 (정규화 + 한글 어절 매칭 + 위치 추적)

### Phase 5: Analytics 강화 (MVP-1)
**Goal**: 가중치 멘션 share + Wilson CI + Mann-Kendall 추세 + 이상치 탐지가 동작하고, Streamlit 대시보드에서 시계열을 본다.
**Depends on**: Phase 4
**Requirements**: MEN-02, MEN-03, MEN-04, ANA-01, ANA-02, ANA-03, UI-03
**Success Criteria** (what must be TRUE):
  1. Mention Extractor가 가중치(position_score × strength_score)와 부정 컨텍스트를 계산한다
  2. mention_share() 가 단순 share와 weighted share 모두 + Wilson 95% CI를 반환한다
  3. 시계열에 Mann-Kendall 검정이 적용되어 추세가 statistically significant인지 표시된다
  4. 이동평균 ± 2σ 벗어난 시점이 이상치로 표시되어 대시보드에 배너가 뜬다
  5. Streamlit 대시보드에서 시계열 + CI 음영 + 이상치 + 추세 결과를 한 화면에서 본다
**Plans**: TBD

Plans:
- [ ] 05-01: Mention Extractor v2 (가중치 + 추천 강도 + 부정 컨텍스트)
- [ ] 05-02: Analytics 모듈 (visibility + trend + anomaly)
- [ ] 05-03: Streamlit Dashboard (시계열 + CI + 추세 + 이상치)

### Phase 6: Multi-Engine + Competitor Discovery (MVP-2)
**Goal**: 4엔진(Perplexity, OpenAI, Gemini, Claude) 동시 수집 + NER 기반 Competitor 후보 발견 + 사람 승인 워크플로 + 기본 sentiment.
**Depends on**: Phase 5
**Requirements**: ENG-03, ENG-04, ENG-05, MEN-05, ANA-04, UI-04
**Success Criteria** (what must be TRUE):
  1. 4개 엔진을 동시에 호출해 같은 키워드에 대해 엔진별 응답을 수집한다
  2. kiwipiepy + 룰베이스로 한국어 병원명/시술명 entity가 추출된다
  3. discover_competitors()가 빈도 임계 이상의 entity를 후보로 제시한다
  4. 사용자가 Streamlit UI에서 후보를 승인/거절하고 confirmed=True인 경쟁사가 분석에 포함된다
  5. 멘션에 sentiment(긍/부/중립) 레이블이 부착되어 분석에 사용된다
**Plans**: TBD

Plans:
- [ ] 06-01: OpenAI/Gemini/Claude Engine 추가 + 동시 수집 가드레일
- [ ] 06-02: 한국어 NER + Competitor Discovery + 후보 검수 UI
- [ ] 06-03: Sentiment 분석 + 분석 통합

## Progress

**Execution Order:**
Phase 1 → 2 → 3 → 4 → 5 → 6 (Phase 3과 Phase 4는 Phase 2 완료 후 병렬 가능)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Demo Slice (Compliance + FAQ JSON-LD) | 0/3 | Not started | - |
| 2. Content Pipeline 확장 | 0/3 | Not started | - |
| 3. Reference Library (RAG) | 0/3 | Not started | - |
| 4. Measurement Foundation | 3/3 | ✅ Done | 14/14 tasks · 38 신규 pytest · 라이브 측정 탭 |
| 5. Analytics 강화 | 0/3 | Planned | PLAN.md 작성 완료 — 15 tasks |
| 6. Multi-Engine + Competitor Discovery | 0/3 | Not started | - |
