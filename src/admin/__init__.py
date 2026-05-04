"""메디맵 어드민 사이트 — Phase 9.

`blogkey-admin.streamlit.app` 별도 Streamlit Cloud 앱. 클라이언트 제품(blogkey)과
같은 Supabase Postgres 를 공유하지만 별도 APP_PASSWORD(``ADMIN_APP_PASSWORD``)로
게이트되며 모든 테넌트를 통합 관리한다.

탭 구성:
- 🏢 테넌트 — 추가/편집/비활성 + 클라이언트 비밀번호 발급
- 💸 비용 — 모든 테넌트의 LLM USD × 일/주/월 + 글로벌 가드레일
- 📍 발행 + 단축 — 모든 Publication + ShortLink 통합 뷰
- 🔄 Funnel — cite × pageview × click 전사 합계
- 🔗 블로그 동기화 — Vercel sitemap → ReferenceDocument 자동 ingest
"""
