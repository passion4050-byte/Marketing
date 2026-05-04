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
- [x] **Phase 5: Analytics 강화 (MVP-1)** — 가중치 + Mann-Kendall + 이상치 + Streamlit 대시보드
- [x] **Phase 6: Multi-Engine + Competitor Discovery (MVP-2)** — 4엔진 동시 + NER 후보 발견 + Sentiment
- [x] **Phase 6.5: UX 개편 + 자동 콘텐츠 큐** — 4-탭 그룹핑, AutoContentSetting + 임시 저장함, Gemini SDK `google-genai` 마이그레이션
- [x] **Phase 6.6: 발행 추적 + AEO 인용 매칭** — Publication 모델, URL 정규화, cited_by_engines 매칭, 📍 발행 현황 sub-tab
- [x] **Phase 7: AEO 자산 Funnel (자사 블로그 + UTM/CTA + 단축도메인 + Funnel 분석)** — 메디맵 테크블로그(Next.js SSG) + 발행 시 UTM/CTA 자동 주입 + 단축도메인 redirect + Funnel 대시보드
- [ ] **Phase 8: Funnel Closure (자동 CTA + GA4 + Click 추적)** — generator 자동 CTA 부착, GA4 frontend tracking + backend Data API, ShortLink click → Supabase 직결
- [ ] **Phase 9: Admin Site + Tenant 격리** — 메디맵 직원 전용 Next.js admin (별도 Vercel), 테넌트 CRUD + 비번 발급 + 비용 대시보드 + Publication/Funnel 통합. blogkey 의 multi-tenant picker → 본인 테넌트만

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

### Phase 7: AEO 자산 Funnel (자사 블로그 + UTM/CTA + 단축도메인 + Funnel 분석)
**Goal**: AI 검색엔진이 cite할 수 있는 *자사 통제* URL 자산(`medimap.kr/blog/{slug}`)을 만들고, 4채널 발행 시 UTM/CTA가 자동 주입되며, 단축도메인 redirect로 클릭이 추적되고, Publication.url의 cite 빈도와 자사 페이지 GA4 metric이 한 화면에서 보인다.
**Depends on**: Phase 6.6 (Publication 모델)
**Requirements**: 신규 — FUN-01 ~ FUN-08 (Funnel) + UI-06 (Funnel 대시보드)
**Success Criteria** (what must be TRUE):
  1. `medimap-blog/` Next.js 14 SSG 사이트가 빌드되고, Vercel에 배포되어 `medimap.kr/blog`에 매핑 가능하다 (DNS는 사용자 작업)
  2. 글 상세 페이지(`/blog/{slug}`)가 Article + FAQPage + MedicalWebPage Schema.org JSON-LD를 노출하고, breadcrumb·OG·sitemap이 동작한다
  3. Streamlit Publication 등록 폼에서 "UTM 자동 주입" / "CTA 블록 자동 삽입" 토글이 동작하고, 4채널 콘텐츠 본문에 표준 CTA HTML이 부착된다
  4. `/r/{slug}` redirect 라우트(FastAPI)가 30x로 응답하고 ShortLinkClick 테이블에 click 이벤트가 기록된다
  5. Streamlit "🚀 Funnel" sub-tab에서 Publication.url cite 빈도 × GA4 페이지뷰 × CTA 클릭률이 조인되어 표시된다
**Plans**: 5

Plans:
- [x] 07-01: medimap-blog Next.js 14 스캐폴드 + 디자인 시스템(Figma 카피) + 헤더/푸터/히어로
- [x] 07-02: 블로그 index + 글 상세 + JSON-LD + 시드 글 3편(라식/스마일/백내장)
- [x] 07-03: SaaS — UTM 자동 주입 + 표준 CTA 블록 4채널 + Publication 폼 헬퍼
- [x] 07-04: 단축도메인 redirect 라우트 + ShortLinkClick 테이블 + Alembic
- [x] 07-05: Funnel Analytics — 자사 URL cite × ShortLink × GA4 가이드 + Streamlit "🔄 Funnel" sub-tab

### Phase 8: Funnel Closure (자동 CTA + GA4 + Click 추적)
**Goal**: Phase 7 인프라를 *실제 측정 가능한* 상태로 마무리한다. 4채널 콘텐츠 생성 시 자동으로 표준 CTA가 부착되고, GA4가 자사 블로그의 page_view/cta_click을 자동 수집하며, 단축링크 click이 Supabase Postgres에 실시간 적재되어 Streamlit Funnel 대시보드에 cite × pageview × click 통합 KPI가 표시된다.
**Depends on**: Phase 7 + Supabase Postgres 연결됨
**Requirements**: 신규 — FUN-09 ~ FUN-14
**Success Criteria** (what must be TRUE):
  1. 4채널 generator(blog/naver/instagram) 출력 본문 끝에 표준 CTA 블록이 자동 부착되고, UTM이 채널별로 정확히 주입된다 (default ON, 토글 OFF 가능)
  2. medimap-blog가 GA4 (`NEXT_PUBLIC_GA_ID`) 설정 시 gtag.js로 page_view + cta_click + scroll_depth 이벤트를 발사한다
  3. Streamlit Funnel 탭이 GA4 Data API(서비스 계정)로 자사 URL 별 pageview / engagement / source 를 가져와 cite_count와 join 표로 표시한다
  4. Vercel `/r/[slug]` redirect가 Supabase Postgres에 ShortLinkClick INSERT + ShortLink.click_count UPDATE를 즉시 수행한다 (302 응답은 차단되지 않음 — fire-and-forget)
  5. Streamlit Funnel 탭 ShortLink 표의 click_count가 실시간 (요청 단위) 증가하는 것을 cross-system으로 확인 가능하다
**Plans**: 3

Plans:
- [x] 08-01: 자동 CTA — generator 3 함수에 include_cta default True 부착 + UI 토글
- [x] 08-02: GA4 — frontend gtag(medimap-blog) + backend Data API fetcher(SaaS) + Funnel 탭 join
- [x] 08-03: ShortLink click 추적 — Vercel route Supabase 직결 + Streamlit click 표 실시간 KPI

### Phase 9: Admin Site + Tenant 격리
**Goal**: 메디맵 직원 전용 어드민 사이트(별도 Streamlit Cloud 앱)에서 모든 클라이언트 테넌트와 컨텐츠 블로그를 통합 관리하고, 클라이언트 제품(blogkey)은 본인 테넌트만 노출되도록 격리한다.
**Depends on**: Phase 8
**Requirements**: 신규 — ADM-01 ~ ADM-12
**Stack 결정**: Streamlit (별도 Cloud 앱 `blogkey-admin.streamlit.app`) — 같은 Supabase 공유, 기존 Python 모델/제너레이터 풀 재사용. Next.js 후보 → Phase 10 이후로 보류.
**Success Criteria** (what must be TRUE):
  1. `blogkey-admin.streamlit.app` 라이브 — `ADMIN_APP_PASSWORD` 게이트, Supabase 동일 DB
  2. 어드민에서 테넌트 CRUD (추가/편집/비활성) + 클라이언트 비밀번호 발급
  3. 비용 대시보드 — LLM USD × 테넌트 일/주/월 합산, MAX_DAILY_USD 글로벌 설정
  4. Publication + ShortLink + Funnel 통합 뷰 (모든 테넌트 cite_count + click_count)
  5. blogkey 의 `_tenant_picker` 가 로그인된 클라이언트의 테넌트만 표시 (멀티테넌트 leak 방지)
**Plans**: 4

Plans:
- [ ] 09-01: src/admin/ + admin_app.py 스캐폴드 + ADMIN_APP_PASSWORD 게이트
- [ ] 09-02: 테넌트 CRUD + 클라이언트 비밀번호 발급/리셋 + 비용 대시보드
- [ ] 09-03: 모든 테넌트 Publication + ShortLink + Funnel 통합 뷰 + 블로그 동기화 버튼
- [ ] 09-04: blogkey multi-tenant picker → 본인 테넌트만 (TENANT_PASSWORD 매핑)

## Progress

**Execution Order:**
Phase 1 → 2 → 3 → 4 → 5 → 6 (Phase 3과 Phase 4는 Phase 2 완료 후 병렬 가능)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Demo Slice (Compliance + FAQ JSON-LD) | 0/3 | Not started | - |
| 2. Content Pipeline 확장 | 0/3 | Not started | - |
| 3. Reference Library (RAG) | 0/3 | Not started | - |
| 4. Measurement Foundation | 3/3 | ✅ Done | 14/14 tasks · 38 신규 pytest · 라이브 측정 탭 |
| 5. Analytics 강화 | 3/3 | ✅ Done | 15/15 tasks · 40 신규 pytest · 시계열+CI+이상치+추세 라이브 |
| 6. Multi-Engine + Competitor Discovery | 3/3 | ✅ Done | 17 tasks · 4엔진 + NER + Sentiment 라이브 |
| 6.5. UX 개편 + 자동 콘텐츠 큐 + Gemini SDK | — | ✅ Done | 4-탭 그룹핑, AutoContentSetting 라운드로빈, google-genai |
| 6.6. 발행 추적 + AEO 인용 매칭 | — | ✅ Done | Publication 모델 + URL 정규화 + 📍 발행 현황 sub-tab |
| 7. AEO 자산 Funnel (블로그+UTM+CTA+단축+분석) | 5/5 | ✅ Done | medimap-blog Next.js 라이브 + Funnel sub-tab |
| 8. Funnel Closure (자동 CTA + GA4 + Click 추적) | 3/3 | ✅ Done | generator wiring + GA4 + Supabase 직결 |
| 9. Admin Site + Tenant 격리 | 0/4 | In progress | blogkey-admin Streamlit + 멀티테넌트 격리 |
