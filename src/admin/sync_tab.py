"""🔗 블로그 동기화 — Vercel sitemap → ReferenceDocument 자동 ingest. Phase 9-03.

medimap-blog 의 sitemap.xml 을 파싱해서 모든 블로그 URL 을 자동으로 ingest_references
파이프라인에 흘려보낸다. 새 글 발행 후 어드민에서 한 번만 누르면 모든 테넌트가
자사 블로그를 RAG 컨텍스트로 바로 사용 가능.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET

import httpx
import streamlit as st


DEFAULT_SITEMAP = "https://medimap-blog-phi.vercel.app/sitemap.xml"


def render_sync_tab(SessionLocal) -> None:
    from src.storage.models import ReferenceDocument, Tenant

    st.markdown("### 🔗 블로그 동기화")
    st.caption(
        "medimap-blog 의 sitemap.xml 을 파싱해서 새 글을 모든 선택 테넌트의 "
        "ReferenceDocument 로 자동 ingest. 같은 URL은 content_hash 로 중복 차단."
    )

    sitemap_url = st.text_input(
        "Sitemap URL",
        value=DEFAULT_SITEMAP,
        key="admin_sync_sitemap",
    )

    with SessionLocal() as s:
        tenants = s.query(Tenant).order_by(Tenant.id).all()

    if not tenants:
        st.warning("등록된 테넌트가 없습니다. 먼저 🏢 테넌트 탭에서 추가하세요.")
        return

    tenant_choices = {f"#{t.id} {t.name}": t.id for t in tenants}
    selected_labels = st.multiselect(
        "대상 테넌트 (전체 선택 가능)",
        list(tenant_choices.keys()),
        default=list(tenant_choices.keys()),
        key="admin_sync_tenants",
    )
    selected_ids = [tenant_choices[lbl] for lbl in selected_labels]

    if st.button(
        "🔄 sitemap 동기화 실행",
        type="primary",
        key="admin_sync_run",
        disabled=not selected_ids,
    ):
        urls = _parse_sitemap(sitemap_url)
        if not urls:
            st.error("sitemap 파싱 실패 또는 비어있음.")
            return
        # 블로그 글 URL 만 필터 (홈/blog index 제외)
        article_urls = [u for u in urls if "/blog/" in u and not u.rstrip("/").endswith("/blog")]
        st.info(f"sitemap 에서 {len(urls)}개 URL 발견 — 블로그 글 {len(article_urls)}개 ingest 시도.")

        from src.reference.indexer import index_url

        results: list[dict] = []
        progress = st.progress(0.0)
        total = len(article_urls) * len(selected_ids)
        i = 0
        with SessionLocal() as s:
            for tid in selected_ids:
                for url in article_urls:
                    i += 1
                    progress.progress(i / max(total, 1))
                    try:
                        r = index_url(s, tid, url)
                        results.append({
                            "tenant_id": tid,
                            "url": url,
                            "status": r.status,
                            "doc_id": r.document_id or "—",
                            "chunks": r.chunk_count or 0,
                        })
                    except Exception as e:
                        results.append({
                            "tenant_id": tid,
                            "url": url,
                            "status": f"error: {str(e)[:60]}",
                            "doc_id": "—",
                            "chunks": 0,
                        })
        progress.empty()
        st.success(f"✅ {len(results)}건 처리 완료")
        st.dataframe(results, use_container_width=True, hide_index=True)

    st.markdown("---")
    _existing_refs_summary(SessionLocal)


def _parse_sitemap(url: str) -> list[str]:
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as c:
            r = c.get(url)
            r.raise_for_status()
        # Strip namespace for simpler XPath
        xml_text = r.text
        # find <loc>...</loc> 직접 파싱 — robust to namespaces
        import re

        return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml_text)
    except Exception:
        return []


def _existing_refs_summary(SessionLocal) -> None:
    from src.storage.models import ReferenceDocument, Tenant

    st.markdown("#### 📚 등록된 참고 자료 (테넌트별)")
    with SessionLocal() as s:
        rows = (
            s.query(Tenant.id, Tenant.name, ReferenceDocument.id)
            .outerjoin(ReferenceDocument, ReferenceDocument.tenant_id == Tenant.id)
            .all()
        )
        counts: dict[int, dict] = {}
        for tid, tname, rid in rows:
            if tid not in counts:
                counts[tid] = {"tenant": tname, "ref_count": 0}
            if rid is not None:
                counts[tid]["ref_count"] += 1
    if counts:
        st.dataframe(
            list(counts.values()),
            use_container_width=True,
            hide_index=True,
        )
