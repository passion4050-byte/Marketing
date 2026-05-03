# Requirements: GEO/AEO SaaS (메디맵)

**Defined:** 2026-05-03
**Core Value:** 키워드 → AEO 최적화 콘텐츠 → 의료법 통과 → 복사 가능 한 라인이 메디맵 운영자에게 동작.

> 본 마일스톤은 정의서(SPEC-v2.md) MVP-0~3 풀스코프를 v1으로 둔다. 단, **사용자가 정의서 §9의 권장 순서를 의도적으로 뒤집어** Phase 1을 콘텐츠 데모로 시작한다. ROADMAP.md 참조.

---

## v1 Requirements

### Compliance (의료법 린터 — 정의서 §5.2)

- [ ] **CMP-01**: 의료법 금지표현 룰셋(yaml) 5개 이상 정의 + DB 적재 가능
- [ ] **CMP-02**: 텍스트 → 룰 린터 → 위반 위치(start, end), 메시지, severity(error/warning/info) 반환
- [ ] **CMP-03**: 룰 타입 3종 지원: `forbidden_word`, `required_disclaimer`, `pattern`
- [ ] **CMP-04**: ComplianceReport 반환 — status(pass/warn/fail) + violations 리스트
- [ ] **CMP-05**: tenant별 룰 격리 — DB의 ComplianceRule 로드 + tenant yaml 머지

### Content Generation (콘텐츠 생성 — 정의서 §5.3)

- [ ] **GEN-01**: 키워드 + tenant 정보 입력 → LLM이 FAQ Q&A 5쌍 생성
- [ ] **GEN-02**: 생성된 콘텐츠 → 의료법 린트 → 위반 시 자동 수정(LLM 재호출, 최대 3회) → 통과
- [ ] **GEN-03**: FAQ Q&A → JSON-LD FAQPage schema 출력 (`<script type="application/ld+json">...</script>`)
- [ ] **GEN-04**: MedicalBusiness JSON-LD schema (병원 기본 정보) 생성
- [ ] **GEN-05**: 자사 블로그 HTML 템플릿 (h2/h3 + p + 출처)
- [ ] **GEN-06**: 네이버 블로그 평문 템플릿 (1500~2500자, [이미지N] placeholder)
- [ ] **GEN-07**: Instagram 캡션 템플릿 (200~300자 + 해시태그)
- [ ] **GEN-08**: 채널별 system prompt 분리 (4채널)
- [ ] **GEN-09**: 비용 가드레일 — `MAX_DAILY_USD`, `MAX_CONTENT_GEN_PER_DAY` 사전 체크

### Reference Library / RAG (정의서 §5.1)

- [ ] **REF-01**: URL → trafilatura로 본문 추출 (광고/네비게이션 제거)
- [ ] **REF-02**: 텍스트 chunker — 500 token, 100 token overlap
- [ ] **REF-03**: text-embedding-3-small으로 벡터화
- [ ] **REF-04**: Chroma collection — tenant별 분리, metadata(tenant_id, source_url, document_id, chunk_index)
- [ ] **REF-05**: retrieve(tenant_id, query, k=5) → top-k 유사 chunk
- [ ] **REF-06**: CLI ingest_references.py — `--url`, `--file`, `--text` 옵션
- [ ] **REF-07**: content_hash로 중복 인덱싱 차단

### Data Model (멀티테넌트 — 정의서 §3)

- [ ] **DAT-01**: Tenant, Keyword, Competitor, Query, Response, Mention 테이블
- [ ] **DAT-02**: ReferenceDocument, ComplianceRule, GeneratedContent 테이블
- [ ] **DAT-03**: 모든 테이블에 tenant_id FK (Tenant 자기 자신 제외)
- [ ] **DAT-04**: SQLAlchemy 모델 + Alembic 마이그레이션 (PostgreSQL 호환)
- [ ] **DAT-05**: scripts/init_db.py — 스키마 생성 + sample tenant 시드

### Engine / Collection (AI 검색엔진 수집 — 정의서 §4.1, §4.2)

- [ ] **ENG-01**: BaseEngine 추상화 — `query(prompt) → EngineResponse(text, cited_urls, latency_ms, raw_payload)`
- [ ] **ENG-02**: PerplexityEngine 구현
- [ ] **ENG-03**: OpenAIEngine 구현
- [ ] **ENG-04**: GeminiEngine 구현
- [ ] **ENG-05**: ClaudeEngine 구현
- [ ] **ENG-06**: collect_for_keyword(tenant_id, keyword, engines, n_samples=30, concurrency=5)
- [ ] **ENG-07**: 비용 가드레일 + DB 저장 + 멘션 추출 한 번에
- [ ] **ENG-08**: APScheduler 기반 주기적 수집

### Mention Extraction (정의서 §4.3)

- [ ] **MEN-01**: 정규화 + 한글 어절 매칭 + 위치 추적
- [ ] **MEN-02**: 가중치 계산 (position_score × strength_score)
- [ ] **MEN-03**: 추천/권장 동사 인접 감지
- [ ] **MEN-04**: 부정 컨텍스트 감지 (is_negative)
- [ ] **MEN-05**: 한국어 NER (kiwipiepy + 룰베이스) — 병원명/시술명 추출

### Analytics (정의서 §4.4)

- [ ] **ANA-01**: mention_share — n, share, ci_95(Wilson), weighted_share, weighted_ci_95
- [ ] **ANA-02**: Mann-Kendall 추세 검정 (pymannkendall)
- [ ] **ANA-03**: 이상치 탐지 (이동평균 ± 2σ)
- [ ] **ANA-04**: Competitor Discovery — NER + 빈도 누적 → 후보 풀 → 사람 승인

### Dashboard / UI

- [ ] **UI-01**: Streamlit 단일 페이지 — 키워드 입력, tenant 선택, 콘텐츠 생성 + 복사 버튼 (Phase 1)
- [ ] **UI-02**: Streamlit 채널 선택 (4채널), Compliance 상태 표시, 자동수정 버튼
- [ ] **UI-03**: Streamlit 대시보드 — 시계열 + CI 음영, 추세 검정, 이상치 배너
- [ ] **UI-04**: Streamlit Competitor 후보 검수 — 승인/거절 버튼
- [ ] **UI-05**: Streamlit Reference Library — URL 입력 + 인덱싱 진행 표시

### Tenant Setup

- [ ] **TEN-01**: Sample tenant 1개 시드 (메디맵 또는 BGN 안과)
- [ ] **TEN-02**: config/tenants.yaml — 다중 tenant 정의 가능
- [ ] **TEN-03**: tenant별 키워드 yaml + compliance yaml 분리

### Infra / Tooling

- [ ] **INF-01**: pyproject.toml + uv/pip 의존성
- [ ] **INF-02**: .env.example + python-dotenv 로드
- [ ] **INF-03**: structlog 로깅 — JSON 포맷, 레벨 환경변수
- [ ] **INF-04**: pytest 기본 + 핵심 모듈 단위 테스트
- [ ] **INF-05**: README.md — 설치/실행 가이드

---

## v2 Requirements (다음 마일스톤)

### A/B Testing (MVP-4 — 정의서 §7)

- **ABT-01**: Schema.org 적용 전후 SOV 변화 측정
- **ABT-02**: 인과관계 검증 통계
- **ABT-03**: 실험 설계/분석 UI

### Full SaaS (MVP-5 — 정의서 §7)

- **SAS-01**: React+FastAPI 프론트엔드
- **SAS-02**: 결제 시스템 (Stripe 등)
- **SAS-03**: 권한/Role 관리
- **SAS-04**: 다중 사용자 멀티테넌트 (현재는 운영자 단일)
- **SAS-05**: PostgreSQL 마이그레이션
- **SAS-06**: Celery + Redis 작업 큐 (현재는 APScheduler)

### Sentiment Analysis 강화

- **SEN-01**: LLM 기반 감성 분류 (긍/부/중립) 정확도 ≥ 70%
- **SEN-02**: Aspect-based sentiment (어떤 측면이 부정적인지)

### External Discovery

- **EXT-01**: 네이버 지도/카카오 로컬 API로 동종업계 자동 후보 풀 (정의서 §4.4.4)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| 외부 채널 자동 게시 (네이버/티스토리/인스타) | 플랫폼 ToS 위반 + 봇 차단 + 의료법 리스크. 정의서 §8. |
| AI 엔진 학습 데이터 직접 주입 | 기술적으로 불가능. 정의서 §8. |
| 의료광고 사전심의 대행 | 자율심의기구의 외부 절차. SaaS가 책임질 영역 아님. 정의서 §8. |
| Fine-tuning | RAG로 충분. 비용/유지보수 낭비. 정의서 §8. |
| 한국어 NER 자체 모델 학습 | kiwipiepy + 룰베이스로 충분. ML 인프라 부담. |
| 실시간 알림/이메일/Slack | 현재 워크플로(주기적 검수)로 충분. v2 검토. |
| 자체 LLM 호스팅 | API 호출이 비용/품질 모두 우월. |

---

## Traceability

각 요구사항이 어느 phase에 매핑되는지. ROADMAP.md 작성 시 채워짐.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CMP-01 | Phase 1 | Pending |
| CMP-02 | Phase 1 | Pending |
| CMP-03 | Phase 1 | Pending |
| CMP-04 | Phase 1 | Pending |
| CMP-05 | Phase 2 | Pending |
| GEN-01 | Phase 1 | Pending |
| GEN-02 | Phase 1 | Pending |
| GEN-03 | Phase 1 | Pending |
| GEN-04 | Phase 2 | Pending |
| GEN-05 | Phase 2 | Pending |
| GEN-06 | Phase 2 | Pending |
| GEN-07 | Phase 2 | Pending |
| GEN-08 | Phase 2 | Pending |
| GEN-09 | Phase 2 | Pending |
| REF-01 | Phase 3 | Pending |
| REF-02 | Phase 3 | Pending |
| REF-03 | Phase 3 | Pending |
| REF-04 | Phase 3 | Pending |
| REF-05 | Phase 3 | Pending |
| REF-06 | Phase 3 | Pending |
| REF-07 | Phase 3 | Pending |
| DAT-01 | Phase 1 | Pending |
| DAT-02 | Phase 2 | Pending |
| DAT-03 | Phase 1 | Pending |
| DAT-04 | Phase 2 | Pending |
| DAT-05 | Phase 1 | Pending |
| ENG-01 | Phase 4 | Pending |
| ENG-02 | Phase 4 | Pending |
| ENG-03 | Phase 6 | Pending |
| ENG-04 | Phase 6 | Pending |
| ENG-05 | Phase 6 | Pending |
| ENG-06 | Phase 4 | Pending |
| ENG-07 | Phase 4 | Pending |
| ENG-08 | Phase 4 | Pending |
| MEN-01 | Phase 4 | Pending |
| MEN-02 | Phase 5 | Pending |
| MEN-03 | Phase 5 | Pending |
| MEN-04 | Phase 5 | Pending |
| MEN-05 | Phase 6 | Pending |
| ANA-01 | Phase 5 | Pending |
| ANA-02 | Phase 5 | Pending |
| ANA-03 | Phase 5 | Pending |
| ANA-04 | Phase 6 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 6 | Pending |
| UI-05 | Phase 3 | Pending |
| TEN-01 | Phase 1 | Pending |
| TEN-02 | Phase 2 | Pending |
| TEN-03 | Phase 2 | Pending |
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 2 | Pending |
| INF-04 | Phase 2 | Pending |
| INF-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0 ✓

---

*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after initialization*
