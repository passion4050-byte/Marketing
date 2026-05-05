"""메디맵 어드민 사이트 메인 엔트리 — Phase 9-01 + 9-05 UI/UX 리프레시.

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

    # ─── 글로벌 디자인 시스템 ──────────────────────────────────────
    from src.admin.theme import ADMIN_CSS, render_admin_header, render_side_card

    st.markdown(ADMIN_CSS, unsafe_allow_html=True)

    # ─── 인증 게이트 ──────────────────────────────────────────────
    from src.admin.auth import require_admin_login, logout_button

    if not require_admin_login():
        st.stop()

    # ─── DB 부트 (사이드바 카운터에 쓸 통계 먼저 계산) ──────────
    from src.storage.db import create_all, get_session_factory, upgrade_to_head

    create_all()
    ok, err = upgrade_to_head()
    SessionLocal = get_session_factory()

    sidebar_stats = _compute_sidebar_stats()

    # ─── 사이드바 ────────────────────────────────────────────────
    with st.sidebar:
        st.markdown(
            """
            <div style="display:flex;align-items:center;gap:11px;
                        padding:6px 0 18px 0;">
              <div style="width:38px;height:38px;border-radius:11px;
                          background:linear-gradient(135deg,#FF4D5E 0%,#FF6E7C 100%);
                          display:flex;align-items:center;justify-content:center;
                          color:white;font-weight:800;font-size:15px;
                          box-shadow:0 4px 10px rgba(255,77,94,0.28);">M</div>
              <div style="line-height:1.15;">
                <div style="font-size:15px;font-weight:800;color:#1F2937 !important;
                            letter-spacing:-0.025em;">
                  메디맵 <span style="color:#FF4D5E;">파트너센터</span>
                </div>
                <div style="font-size:10px;letter-spacing:0.14em;
                            color:#6B7280 !important;
                            text-transform:uppercase;font-weight:700;
                            margin-top:3px;">
                  Admin Console
                </div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.markdown(
            render_side_card("Tenants", str(sidebar_stats["tenants"])),
            unsafe_allow_html=True,
        )
        st.markdown(
            render_side_card("Publications", str(sidebar_stats["pubs"])),
            unsafe_allow_html=True,
        )
        st.markdown(
            render_side_card(
                "Today USD",
                f"${sidebar_stats['today_usd']:.4f}",
            ),
            unsafe_allow_html=True,
        )
        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        logout_button()
        st.markdown(
            f"""
            <div style='font-size:10.5px;color:#9CA3AF !important;
                        margin-top:14px;letter-spacing:0.04em;line-height:1.6;'>
              <b style='color:#6B7280 !important;'>{_db_summary()}</b><br/>
              blogkey-adm.streamlit.app
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ─── 상단 헤더 ─────────────────────────────────────────────
    st.markdown(
        render_admin_header(db_label=_db_summary()),
        unsafe_allow_html=True,
    )

    if not ok and err:
        st.warning(
            f"⚠️ Alembic migration 실패 — 기존 테이블 schema 가 최신이 아닐 수 있습니다.\n\n`{err}`"
        )

    # ─── 메인 탭 ─────────────────────────────────────────────────
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


@st.cache_data(ttl=60, show_spinner=False)
def _compute_sidebar_stats() -> dict:
    """사이드바 미니 KPI — 실패해도 0 반환. TTL 60초 캐시로 탭 전환 시 DB 부하↓."""
    from datetime import datetime, timezone
    from src.storage.db import get_session_factory

    SessionLocal = get_session_factory()

    out = {"tenants": 0, "pubs": 0, "today_usd": 0.0}
    try:
        from src.storage.models import Tenant
        with SessionLocal() as s:
            out["tenants"] = s.query(Tenant).count()
    except Exception:
        pass
    try:
        from src.storage.models import Publication
        with SessionLocal() as s:
            out["pubs"] = s.query(Publication).count()
    except Exception:
        pass
    try:
        from src.storage.models import LlmCallLog
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0,
        )
        with SessionLocal() as s:
            logs = s.query(LlmCallLog).filter(
                LlmCallLog.called_at >= today_start
            ).all()
            out["today_usd"] = sum((l.cost_usd or 0.0) for l in logs)
    except Exception:
        pass
    return out


def _db_summary() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return "sqlite (local)"
    if "postgres" in url or "supabase" in url or "pooler" in url:
        try:
            host = url.split("@", 1)[1].split("/")[0]
            return f"postgres ({host})"
        except Exception:
            return "postgres"
    return "unknown"


if __name__ == "__main__":
    main()
