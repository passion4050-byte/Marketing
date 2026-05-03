# GEO/AEO SaaS (메디맵)

## What This Is

AI 검색엔진(Perplexity, ChatGPT, Gemini, Claude)에서 의료 도메인 브랜드의 노출(Mention Share)을 측정하고, AI에 인용되도록 최적화된 콘텐츠를 자동 생성하는 멀티테넌트 SaaS. 첫 고객은 메디맵(의료/안과 마케팅)이며, 의료법 컴플라이언스가 핵심 차별점이다.

## Core Value

**키워드 → AEO 최적화 콘텐츠 → 의료법 통과 → 복사 가능** 한 라인이 단 한 명의 메디맵 운영자에게 동작하는 것. 모든 다른 기능은 이 라인을 강화하기 위한 것.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Phase 1 (오늘 3시간 데모 슬라이스):**
- [ ] **CMP-01**: 의료법 금지표현 룰셋(yaml) 5개 이상 정의 + DB 적재
- [ ] **CMP-02**: 텍스트 → 룰 린터 → 위반 위치/메시지/severity 반환
- [ ] **GEN-01**: 키워드 + tenant 정보 → LLM이 FAQ Q&A 5쌍 생성
- [ ] **GEN-02**: 생성된 FAQ → 의료법 린트 → 위반 시 자동 수정 (최대 3회) → 통과 시 JSON-LD FAQPage schema 출력
- [ ] **UI-01**: Streamlit 단일 페이지 — 키워드 입력, tenant 선택, 결과 + 복사 버튼
- [ ] **DAT-01**: SQLite + tenant_id 포함 데이터 모델 (정의서 §3)
- [ ] **TEN-01**: Sample tenant 1개 시드 (메디맵 또는 BGN 안과)

**v2 (이번 마일스톤 — 정의서 MVP 풀스코프):**
- 4채널 콘텐츠 템플릿 (Schema.org / Blog HTML / 네이버 / Instagram)
- RAG (Reference Library) — Chroma + URL 인덱싱 + 검색
- AI 검색엔진 모니터링 (Perplexity 1엔진 → 4엔진)
- Mention Share + 신뢰구간 + 가중치 + 추세 검정
- Competitor Discovery (NER 기반)
- Streamlit 대시보드 (시계열, 이상치, 검수)

### Out of Scope

- 외부 채널(네이버 블로그/카페/인스타) **자동 게시** — 플랫폼 ToS 위반 + 봇 차단 위험. 사용자가 수동 복사. (정의서 §8)
- AI 엔진 학습 데이터 직접 주입 — 기술적으로 불가능. (정의서 §8)
- 의료광고 사전심의 대행 — 자율심의기구의 외부 절차. (정의서 §8)
- Fine-tuning — RAG로 충분. (정의서 §8)
- 멀티테넌트 풀 UI(React+FastAPI) — MVP-5 이후. 지금은 Streamlit으로 충분.
- 결제/권한 시스템 — MVP-5 이후.
- A/B 테스트 프레임워크 — MVP-4. 측정 인프라가 안정된 뒤.

## Context

**도메인 (의료/안과 마케팅):**
- 한국 의료법은 광고 표현에 엄격함. "100% 보장", "최고/유일/최초" 등 절대표현 금지. 이벤트 표현 시 종료일 명시 필수. 사전심의 대상 키워드 존재.
- 첫 고객 메디맵의 첫 타겟은 BGN 밝은눈안과 같은 안과 시력교정 영역.
- AEO/GEO는 신생 영역. 한국에서 AI 검색엔진 노출 측정은 표준이 없음.

**사용자(메디맵 운영자) 워크플로:**
- 자사가 관리하는 병원의 키워드(예: "강남 라식 잘하는 곳")를 입력
- 시스템이 의료법 통과한 콘텐츠/FAQ 스키마 생성
- 운영자가 복사 → 워드프레스/네이버/자사 사이트에 붙여넣기
- 시간 지나며 AI 검색엔진에서 자사 브랜드 노출 추세 모니터링

**의도적인 정의서 순서 변경:**
- 정의서 §9는 측정(MVP-0) → 분석(MVP-1) → 다엔진(MVP-2) → 콘텐츠(MVP-3) 순서를 권장.
- 사용자가 이를 뒤집고 **콘텐츠 생성부터** 만들기로 결정. 이유: 측정은 2주+ 데이터가 쌓여야 의미 있지만, 콘텐츠 생성은 즉시 가시적 결과물 → 메디맵 데모/판매 가능.
- ROADMAP.md에서 Phase 1 = 콘텐츠 데모, 측정은 Phase 4~6.

**3시간 데모 제약 (Phase 1):**
- 사용자 가용 시간 3시간.
- Phase 1은 정의서 MVP-3 §5.2 (Compliance) + §5.3.2 (Schema.org JSON-LD) 일부만. RAG 빠짐, 4채널 중 1채널만, 자동수정 루프는 단순화.
- 끝났을 때 메디맵 운영자에게 "키워드 입력 → 의료법 린트된 FAQ JSON-LD 출력" 시연 가능해야 함.

## Constraints

- **Tech stack**: Python 3.11+, Streamlit, SQLite, OpenAI/Anthropic SDK — 정의서 §1 고정. 새 기술 도입 시 SPEC-v2.md 변경 필요.
- **Multi-tenant from day 1**: 모든 테이블에 `tenant_id` FK. SQLite지만 PostgreSQL 마이그레이션 가능한 모델 설계.
- **Cost guardrail**: `MAX_DAILY_USD=10.0`, `MAX_CONTENT_GEN_PER_DAY=50`. LLM 호출 시 사전 체크. 정의서 §6, 부록 A.
- **Compliance**: 의료법 린터를 모든 콘텐츠 생성 경로에 강제. 린터 우회 경로 만들지 말 것.
- **Timeline**: 오늘 3시간 안에 Phase 1 동작. 가시적 데모 가능해야 함.
- **No auto-posting**: 외부 플랫폼 자동 게시 금지. 출력은 클립보드/파일로만.
- **Korean-first**: UI/콘텐츠/룰 모두 한국어. 영어는 코드 식별자에만.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phase 순서 뒤집기 (콘텐츠 → 측정) | 즉시 데모/판매 가능한 결과물 우선. 측정은 데이터 누적 필요. | — Pending |
| Phase 1 슬라이스: Compliance + FAQ JSON-LD | 의료 도메인 차별점(의료법) + 가장 작은 동작 단위. RAG/4채널은 Phase 2~ | — Pending |
| Streamlit 유지 (React 미루기) | 정의서 §1 명시. 3시간 제약 + UI 디테일은 Phase 후반 | — Pending |
| SQLite 시작 (PostgreSQL 마이그레이션 대비) | 정의서 §1. 멀티테넌트 모델은 처음부터 적용 | — Pending |
| 자동 게시 비목표 유지 | ToS/봇차단/의료법 리스크. 정의서 §8 | — Pending |
| 첫 tenant: BGN 밝은눈안과 (예시) | 정의서 §3에 sample 존재. 메디맵 본인 정보로 교체 가능 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
