"""🔄 Funnel (전사) — cite × pageview × click 전사 합계. Phase 9-03."""

from __future__ import annotations

import streamlit as st


def render_funnel_global_tab(SessionLocal) -> None:
    from src.storage.models import Publication, ShortLink, ShortLinkClick, Tenant
    try:
        from src.marketing import fetch_pageviews, ga4_configured, join_with_publications
        ga4_avail = True
    except Exception:
        ga4_avail = False

    st.markdown("### 🔄 전사 Funnel KPI")
    st.caption(
        "AI cite × 자사 페이지 pageview × CTA click 전사 합계 — 메디맵 직원이 매출 전환 효과를 한눈에."
    )

    with SessionLocal() as s:
        pubs_own = (
            s.query(Publication)
            .filter(Publication.channel == "own_blog")
            .all()
        )
        cite_total = sum((p.cite_count or 0) for p in pubs_own)
        cited_pubs = sum(1 for p in pubs_own if (p.cite_count or 0) > 0)

        sls = s.query(ShortLink).all()
        click_total = sum((sl.click_count or 0) for sl in sls)
        click_events = s.query(ShortLinkClick).count()

        tenants = s.query(Tenant).all()

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("테넌트", f"{len(tenants)}")
    col2.metric("자사 발행물", f"{len(pubs_own)}")
    col3.metric("AI 인용 발행", f"{cited_pubs}")
    col4.metric("총 cite", f"{cite_total}")
    col5.metric(
        "ShortLink click",
        f"{click_total}",
        help=f"적재된 click 이벤트 {click_events}건",
    )

    st.markdown("---")

    if not ga4_avail or not ga4_configured():
        st.info(
            "**GA4 Data API 미설정** — `GA4_PROPERTY_ID` + `GA4_SERVICE_ACCOUNT_JSON` "
            "Streamlit secrets 추가 시 자사 URL 별 pageview/engagement 가 cite_count 와 "
            "함께 자동 표시됩니다."
        )
        return

    col_d, col_btn = st.columns([3, 1])
    days = col_d.slider(
        "조회 기간 (일)", 7, 90, 30, key="admin_funnel_days",
    )
    refresh = col_btn.button("🔄 새로고침", key="admin_funnel_refresh")
    if refresh:
        try:
            from src.marketing.ga4 import _cached_fetch  # type: ignore[attr-defined]

            _cached_fetch.cache_clear()
        except Exception:
            pass

    try:
        rows = fetch_pageviews(days=days)
    except Exception as e:
        st.error(f"GA4 호출 실패: {e}")
        return
    if not rows:
        st.warning("GA4 응답 비어있음 — property_id 또는 서비스 계정 권한 확인.")
        return

    with SessionLocal() as s:
        pubs_all = s.query(Publication).all()
        pub_url_to_cite = {p.url: (p.cite_count or 0) for p in pubs_all}

    merged = join_with_publications(rows, pub_url_to_cite)
    if not merged:
        st.info("표시할 데이터가 없습니다.")
        return

    st.markdown("#### 🔬 자사 URL × pageview × cite × engagement")
    st.dataframe(
        merged,
        use_container_width=True,
        column_config={
            "page_path": st.column_config.TextColumn("Path", width="medium"),
            "page_views": st.column_config.NumberColumn("PV", width="small"),
            "sessions": st.column_config.NumberColumn("세션", width="small"),
            "avg_engagement_seconds": st.column_config.NumberColumn(
                "평균 체류(초)", format="%.1f", width="small",
            ),
            "cite_count": st.column_config.NumberColumn("Cite", width="small"),
        },
        hide_index=True,
    )
