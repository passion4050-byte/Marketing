"""메디맵 어드민 사이트 메인 엔트리 — Phase 9-01.

배포: Streamlit Cloud → main file path = ``admin_app.py`` (repo 루트의 1줄 launcher).

Streamlit Cloud Secrets 필요 키:
- ``ADMIN_APP_PASSWORD`` — 어드민 게이트 비밀번호
- ``DATABASE_URL`` — blogkey 와 동일한 Supabase pooler URL
- ``LLM_PROVIDER`` / ``GOOGLE_API_KEY`` / ``ANTHROPIC_API_KEY`` / ``OPENAI_API_KEY``
- ``GA4_PROPERTY_ID`` / ``GA4_SERVICE_ACCOUNT_JSON`` (선택 — Funnel join 용)
- ``MAX_DAILY_USD`` (선택)
"""

from __future__ import annotations

import os
from pathlib import Path

import streamlit as st


def _hydrate_env_from_secrets() -> None:
    """Streamlit Cloud secrets → 환경변수."""
    try:
        secrets = st.secrets
    except Exception:
        return
    for key in (
        "ADMIN_APP_PASSWORD",
        "DATABASE_URL",
        "LLM_PROVIDER",
        "GOOGLE_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "MAX_DAILY_USD",
        "MAX_CONTENT_GEN_PER_DAY",
        "GA4_PROPERTY_ID",
        "GA4_SERVICE_ACCOUNT_JSON",
        "VERCEL_DEPLOY_HOOK",
    ):
        try:
            val = secrets.get(key)
        except Exception:
            val = None
        if val and not os.environ.get(key):
            os.environ[key] = str(val)


def main() -> None:
    _hydrate_env_from_secrets()

    st.set_page_config(
        page_title="메디맵 어드민",
        page_icon="🛠️",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # ─── 인증 게이트 ──────────────────────────────────────────────
    from src.admin.auth import require_admin_login, logout_button

    if not require_admin_login():
        st.stop()

    # ─── 사이드바 ────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("## 🛠️ 메디맵 어드민")
        st.caption("메디맵 직원 전용 통합 관리 콘솔")
        st.markdown("---")
        logout_button()
        st.markdown("---")
        st.caption(
            f"DB: `{_db_summary()}`\n\n"
            f"Live: blogkey-adm.streamlit.app"
        )

    # ─── DB 부트 ─────────────────────────────────────────────────
    from src.storage.db import create_all, get_session_factory

    create_all()
    SessionLocal = get_session_factory()

    # ─── 메인 탭 ─────────────────────────────────────────────────
    st.markdown("# 🛠️ 메디맵 어드민")
    tabs = st.tabs([
        "🏢 테넌트",
        "💸 비용",
        "📍 발행 + 단축",
        "🔄 Funnel (전사)",
        "🔗 블로그 동기화",
    ])

    with tabs[0]:
        from src.admin.tenants_tab import render_tenants_tab
        render_tenants_tab(SessionLocal)

    with tabs[1]:
        from src.admin.cost_tab import render_cost_tab
        render_cost_tab(SessionLocal)

    with tabs[2]:
        from src.admin.publications_tab import render_publications_tab
        render_publications_tab(SessionLocal)

    with tabs[3]:
        from src.admin.funnel_global_tab import render_funnel_global_tab
        render_funnel_global_tab(SessionLocal)

    with tabs[4]:
        from src.admin.sync_tab import render_sync_tab
        render_sync_tab(SessionLocal)


def _db_summary() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return "sqlite (local)"
    if "postgres" in url or "supabase" in url or "pooler" in url:
        # 호스트만 노출 (보안)
        try:
            host = url.split("@", 1)[1].split("/")[0]
            return f"postgres ({host})"
        except Exception:
            return "postgres"
    return "unknown"


if __name__ == "__main__":
    main()
