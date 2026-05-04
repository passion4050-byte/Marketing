"""📍 발행 + 단축 — 모든 테넌트의 Publication + ShortLink 통합 뷰. Phase 9-03."""

from __future__ import annotations

import streamlit as st


def render_publications_tab(SessionLocal) -> None:
    from src.storage.models import Publication, ShortLink, ShortLinkClick, Tenant

    st.markdown("### 📍 모든 테넌트 — 발행 + 단축링크")
    st.caption(
        "전사 Publication / ShortLink 통합 뷰. 채널별 분포와 cite/click 누적치를 한 화면에서."
    )

    with SessionLocal() as s:
        pubs = (
            s.query(Publication, Tenant.name)
            .join(Tenant, Publication.tenant_id == Tenant.id)
            .order_by(Publication.cite_count.desc(), Publication.created_at.desc())
            .all()
        )
        pub_rows = [
            {
                "tenant": tname,
                "channel": p.channel,
                "title": p.title or "—",
                "url": p.url,
                "cite_count": p.cite_count or 0,
                "engines": ", ".join(
                    sorted({e.get("engine", "") for e in (p.cited_by_engines or [])})
                ) or "—",
                "published_at": (
                    p.published_at.strftime("%Y-%m-%d") if p.published_at else "—"
                ),
            }
            for p, tname in pubs
        ]

        sls = (
            s.query(ShortLink, Tenant.name)
            .join(Tenant, ShortLink.tenant_id == Tenant.id)
            .order_by(ShortLink.click_count.desc(), ShortLink.created_at.desc())
            .all()
        )
        sl_rows = [
            {
                "tenant": tname,
                "slug": sl.slug,
                "label": sl.label or "—",
                "target_url": sl.target_url,
                "click_count": sl.click_count or 0,
                "active": "🟢" if sl.is_active else "⚪️",
            }
            for sl, tname in sls
        ]

    col_p, col_s, col_c = st.columns(3)
    col_p.metric("총 발행물", f"{len(pub_rows)}건")
    col_s.metric("총 단축링크", f"{len(sl_rows)}건")
    col_c.metric(
        "총 cite 누적",
        f"{sum(r['cite_count'] for r in pub_rows)}",
    )

    st.markdown("#### 📍 모든 Publication")
    if pub_rows:
        st.dataframe(
            pub_rows,
            use_container_width=True,
            column_config={
                "tenant": st.column_config.TextColumn("테넌트", width="small"),
                "channel": st.column_config.TextColumn("채널", width="small"),
                "title": st.column_config.TextColumn("제목", width="medium"),
                "url": st.column_config.LinkColumn("URL", width="large"),
                "cite_count": st.column_config.NumberColumn("Cite", width="small"),
                "engines": st.column_config.TextColumn("엔진", width="medium"),
                "published_at": st.column_config.TextColumn("발행", width="small"),
            },
            hide_index=True,
        )
    else:
        st.info("등록된 Publication 이 없습니다.")

    st.markdown("---")
    st.markdown("#### 🔗 모든 ShortLink")
    if sl_rows:
        st.dataframe(
            sl_rows,
            use_container_width=True,
            column_config={
                "tenant": st.column_config.TextColumn("테넌트", width="small"),
                "slug": st.column_config.TextColumn("Slug", width="small"),
                "label": st.column_config.TextColumn("라벨", width="medium"),
                "target_url": st.column_config.LinkColumn("Target", width="large"),
                "click_count": st.column_config.NumberColumn("Click", width="small"),
                "active": st.column_config.TextColumn("활성", width="small"),
            },
            hide_index=True,
        )
    else:
        st.info("등록된 ShortLink 가 없습니다.")
