# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-03)

**Core value:** 키워드 → AEO 최적화 콘텐츠 → 의료법 통과 → 복사 가능 한 라인이 메디맵 운영자에게 동작.
**Current focus:** Phase 7 — AEO 자산 Funnel (라이브)

## Current Position

Phase: 7 of 7 (AEO 자산 Funnel — 라이브 배포 완료)
Plans: 07-01~05 모두 완료 (5/5)
Status: medimap-blog Next.js SSG 배포(Vercel), JSON-LD 6종 출력, ShortLink redirect 동작,
Streamlit 🔄 Funnel sub-tab 라이브
Last activity: 2026-05-04 — Phase 7 전체 완료, pytest 243/243, Vercel 배포 + env 5개 적용

Progress: [██████████] 100% (Phase 1~7 모두 완료)

**라이브 URL:**
- 블로그: https://medimap-blog-phi.vercel.app
- 단축링크 redirect: https://medimap-blog-phi.vercel.app/r/{lasik|smile|cataract}
- 운영자 대시보드: https://blogkey.streamlit.app (🔄 Funnel sub-tab)

**완료된 산출물:**
- src/storage: 멀티테넌트 SQLAlchemy 모델 (Tenant, ComplianceRule, Keyword, GeneratedContent)
- src/compliance/linter.py + config/compliance_rules/default.yaml (의료법 9개 룰)
- src/content/llm.py: stub/gemini/anthropic/openai 멀티 프로바이더
- src/content/generator.py: FAQ + Blog post 자동수정 루프
- src/content/templates/schema_org.py + blog_html.py
- src/reference/fetcher.py: URL → trafilatura 본문 추출 (간이 RAG)
- src/dashboard/app.py: Streamlit FAQ/Blog 탭 + 이미지 업로더
- 20/20 pytest 통과

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:
- 초기화: 정의서 §9의 권장 순서 뒤집기 — Phase 1 = 콘텐츠 데모(MVP-3 일부), 측정은 Phase 4~6
- 초기화: Phase 1 슬라이스 = Compliance 린터 + FAQ JSON-LD (RAG/4채널은 Phase 2~)
- 초기화: Stack은 정의서 §1 그대로 (Python 3.11+, Streamlit, SQLite, OpenAI/Anthropic SDK)

### Pending Todos

None yet.

### Blockers/Concerns

- 사용자 환경 확인 대기: Python 3.11+ 설치 여부, OpenAI/Anthropic API 키
- 메디맵 첫 tenant 정보 미정 — 정의서 예시(BGN 밝은눈안과)로 시작 가능

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-03 (initialization)
Stopped at: ROADMAP.md 작성 + 6 phase 정의 완료
Resume file: None — 다음 단계는 `/gsd-plan-phase 1`
