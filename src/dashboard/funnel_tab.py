"""🔄 Funnel sub-tab — Phase 7-05.

자사 통제 URL 의 cite 효과 + 단축링크 click 추적 + GA4 통합 가이드를 한 화면에서 본다.

표시:
- 상단 KPI: 자사 도메인 cite 수 / ShortLink click 수 / cite-to-click 전환률(추정)
- Top 자사 URL by cite count (Publication.cite_count, channel='own_blog' 만)
- ShortLink 상태표 (slug / target / click_count / 활성)
- ShortLink 등록/비활성 폼
- GA4 통합 안내 (수동 export 가이드 + 향후 자동화 안내)
"""

from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

import streamlit as st


def render_funnel_tab(SessionLocal, tenant) -> None:
    """자사 자산 funnel 분석 탭."""
    try:
        from src.storage.models import Publication, ShortLink, ShortLinkClick  # noqa: F401
    except ImportError as e:
        st.warning(
            f"⚠️ Funnel 모델이 아직 로드되지 않았습니다 ({e}). "
            "Streamlit Cloud → Manage app → Reboot app 후 다시 시도해 주세요."
        )
        return

    st.markdown("### 🔄 자사 자산 Funnel")
    st.caption(
        "AI 가 cite 한 자사 URL → 사용자가 클릭 → 카카오/플레이스/전화로 전환되는 흐름을 한 화면에서 봅니다. "
        "**Publication.cite_count** + **ShortLink.click_count** 가 핵심 KPI."
    )

    _kpi_section(SessionLocal, tenant)
    st.markdown("---")
    _own_url_cite_table(SessionLocal, tenant)
    st.markdown("---")
    _shortlink_section(SessionLocal, tenant)
    st.markdown("---")
    _ga4_guidance()


def _kpi_section(SessionLocal, tenant) -> None:
    from src.storage.models import Publication, ShortLink, ShortLinkClick

    with SessionLocal() as s:
        pubs_own = (
            s.query(Publication)
            .filter(
                Publication.tenant_id == tenant.id,
                Publication.channel == "own_blog",
            )
            .all()
        )
        cite_total = sum((p.cite_count or 0) for p in pubs_own)
        cited_pubs = sum(1 for p in pubs_own if (p.cite_count or 0) > 0)

        sl_rows = (
            s.query(ShortLink)
            .filter(
                ShortLink.tenant_id == tenant.id,
                ShortLink.is_active.is_(True),
            )
            .all()
        )
        click_total = sum((sl.click_count or 0) for sl in sl_rows)
        click_rows = (
            s.query(ShortLinkClick)
            .filter(ShortLinkClick.tenant_id == tenant.id)
            .count()
        )

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("자사 발행물", f"{len(pubs_own)}개")
    col2.metric("AI 인용된 자사 발행", f"{cited_pubs}개")
    col3.metric("총 cite 횟수", f"{cite_total}")
    col4.metric("ShortLink 클릭", f"{click_total}", help=f"적재된 click 이벤트 {click_rows}건")


def _own_url_cite_table(SessionLocal, tenant) -> None:
    from src.storage.models import Publication

    st.markdown("#### 📈 자사 URL cite 순위")
    with SessionLocal() as s:
        rows = (
            s.query(Publication)
            .filter(
                Publication.tenant_id == tenant.id,
                Publication.channel == "own_blog",
            )
            .order_by(Publication.cite_count.desc(), Publication.created_at.desc())
            .all()
        )
        # detach
        data = [
            {
                "title": r.title or "(제목 없음)",
                "url": r.url,
                "cite_count": r.cite_count or 0,
                "engines": ", ".join(
                    sorted({e["engine"] for e in (r.cited_by_engines or [])})
                ) or "—",
                "published_at": (
                    r.published_at.strftime("%Y-%m-%d") if r.published_at else "—"
                ),
            }
            for r in rows
        ]
    if not data:
        st.info(
            "자사 도메인(`channel=own_blog`)에 등록된 발행물이 없습니다. "
            "📍 발행 현황 탭에서 `자사 홈페이지/블로그` 채널로 등록해보세요."
        )
        return
    st.dataframe(
        data,
        use_container_width=True,
        column_config={
            "title": st.column_config.TextColumn("제목", width="medium"),
            "url": st.column_config.LinkColumn("URL", width="large"),
            "cite_count": st.column_config.NumberColumn("Cite", width="small"),
            "engines": st.column_config.TextColumn("엔진", width="medium"),
            "published_at": st.column_config.TextColumn("발행", width="small"),
        },
        hide_index=True,
    )


def _shortlink_section(SessionLocal, tenant) -> None:
    from src.storage.models import ShortLink

    st.markdown("#### 🔗 ShortLink (m.medimap.kr/r/{slug})")
    st.caption(
        "활성 ShortLink 는 `scripts/export_shortlinks.py` 가 빌드 타임에 "
        "`medimap-blog/content/shortlinks.json` 으로 export 합니다 — Vercel 빌드 시 동기화."
    )

    with SessionLocal() as s:
        rows = (
            s.query(ShortLink)
            .filter(ShortLink.tenant_id == tenant.id)
            .order_by(ShortLink.is_active.desc(), ShortLink.click_count.desc())
            .all()
        )
        data = [
            {
                "slug": r.slug,
                "label": r.label or "—",
                "target_url": r.target_url,
                "click_count": r.click_count or 0,
                "active": "🟢" if r.is_active else "⚪️",
                "id": r.id,
            }
            for r in rows
        ]
    if data:
        st.dataframe(
            data,
            use_container_width=True,
            column_config={
                "slug": st.column_config.TextColumn("Slug", width="small"),
                "label": st.column_config.TextColumn("라벨", width="medium"),
                "target_url": st.column_config.LinkColumn("Target", width="large"),
                "click_count": st.column_config.NumberColumn("Click", width="small"),
                "active": st.column_config.TextColumn("활성", width="small"),
                "id": None,
            },
            hide_index=True,
        )
    else:
        st.info("등록된 ShortLink 가 없습니다. 아래 폼으로 첫 단축링크를 만들어보세요.")

    _shortlink_create_form(SessionLocal, tenant)
    if data:
        _shortlink_toggle_form(SessionLocal, tenant, rows)


def _shortlink_create_form(SessionLocal, tenant) -> None:
    from src.marketing.funnel import _slugify_campaign  # type: ignore[attr-defined]
    from src.storage.models import ShortLink

    with st.expander("➕ ShortLink 등록", expanded=False):
        with st.form(f"sl_new_{tenant.id}", clear_on_submit=True):
            slug = st.text_input(
                "slug",
                placeholder="예: lasik (m.medimap.kr/r/lasik)",
                key=f"sl_new_slug_{tenant.id}",
            )
            target = st.text_input(
                "Target URL (UTM 포함 권장)",
                placeholder="https://medimap.kr/blog/lasik-guide?utm_source=...",
                key=f"sl_new_target_{tenant.id}",
            )
            label = st.text_input(
                "라벨", placeholder="예: 라식 가이드 진입링크",
                key=f"sl_new_label_{tenant.id}",
            )
            submitted = st.form_submit_button(
                "🔗 등록", type="primary", use_container_width=True,
            )
        if submitted:
            slug_clean = _slugify_campaign(slug)
            if not slug_clean:
                st.error("slug 가 비어있습니다.")
                return
            if not target.strip().startswith(("http://", "https://")):
                st.error("Target URL 은 http(s):// 로 시작해야 합니다.")
                return
            with SessionLocal() as s:
                existing = (
                    s.query(ShortLink)
                    .filter(
                        ShortLink.tenant_id == tenant.id,
                        ShortLink.slug == slug_clean,
                    )
                    .first()
                )
                if existing is not None:
                    st.warning(f"이미 존재하는 slug 입니다 (id={existing.id}).")
                    return
                sl = ShortLink(
                    tenant_id=tenant.id,
                    slug=slug_clean,
                    target_url=target.strip(),
                    label=label.strip(),
                    is_active=True,
                )
                s.add(sl)
                s.commit()
            st.success(f"등록되었습니다 — m.medimap.kr/r/{slug_clean}")
            st.rerun()


def _shortlink_toggle_form(SessionLocal, tenant, rows: list) -> None:
    from src.storage.models import ShortLink

    with st.expander("⚙️ ShortLink 활성/비활성 전환", expanded=False):
        labels = {f"#{r.id} {r.slug} ({r.label or '—'})": r.id for r in rows}
        if not labels:
            return
        choice = st.selectbox(
            "ShortLink 선택",
            list(labels.keys()),
            key=f"sl_toggle_pick_{tenant.id}",
        )
        col_a, col_b = st.columns(2)
        if col_a.button("🟢 활성화", key=f"sl_act_{tenant.id}"):
            with SessionLocal() as s:
                row = s.query(ShortLink).filter(ShortLink.id == labels[choice]).first()
                if row is not None:
                    row.is_active = True
                    row.updated_at = datetime.now(timezone.utc)
                    s.commit()
            st.success("활성화")
            st.rerun()
        if col_b.button("⚪️ 비활성화", key=f"sl_deact_{tenant.id}"):
            with SessionLocal() as s:
                row = s.query(ShortLink).filter(ShortLink.id == labels[choice]).first()
                if row is not None:
                    row.is_active = False
                    row.updated_at = datetime.now(timezone.utc)
                    s.commit()
            st.success("비활성화")
            st.rerun()


def _ga4_guidance() -> None:
    with st.expander("📊 GA4 통합 안내", expanded=False):
        st.markdown(
            """
            **자사 페이지 GA4 metric 을 이 대시보드에 합치려면:**

            1. medimap-blog Vercel 환경변수 `NEXT_PUBLIC_GA_ID` 에 GA4 측정 ID 입력
            2. 자사 도메인에 GA4 가 부착된 상태로 배포
            3. **수동 모드 (현재 권장)**: GA4 → 보고서 → 페이지/스크린 → CSV export →
               `data/ga4_pageviews_{YYYYMM}.csv` 로 저장 → 다음 phase 에 join 자동화 추가
            4. **자동 모드 (Phase 7-05.1+)**: GA4 Data API + service account →
               `src/marketing/ga4.py` 에 fetcher 작성

            **현재 자동 추적되는 것**
            - Publication.cite_count (AI 응답 cite 매칭)
            - ShortLink.click_count (`/r/{slug}` redirect 호출 수)
            - ShortLinkClick.referer / country (Vercel header 기반)

            **자사 page → 카카오/플레이스/전화 전환률 추적**
            - 카카오 채널/네이버 플레이스/전화 링크에 utm_source 부착 (CTA 블록 자동 처리)
            - utm_source 별 GA4 이벤트 카운트 가 conversion KPI
            """
        )
