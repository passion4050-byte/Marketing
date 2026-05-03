"""Phase 3-T3.2 — 참고 자료 (Reference Library) 탭.

운영자가 URL/텍스트를 인덱싱해 RAG 발행에 활용한다.
- URL 입력 → fetch → chunk → embed → Chroma
- 텍스트 직접 붙여넣기 → 동일 파이프라인
- 인덱스된 ReferenceDocument 목록 (삭제 버튼 포함)
- content_hash 중복은 자동 스킵 표시

라이브 환경 (Streamlit Cloud) 의 ChromaDB 영속 디렉토리는 컨테이너 재시작 시 휘발됨.
영구 저장이 필요하면 Phase 4+ 에서 Supabase pgvector 등으로 마이그레이션.
"""

from __future__ import annotations

import streamlit as st


def _format_url_short(url: str | None, max_len: int = 60) -> str:
    if not url:
        return "(직접 텍스트)"
    if len(url) <= max_len:
        return url
    return url[: max_len - 1] + "…"


def render_reference_library_tab(SessionLocal, tenant) -> None:
    # Lazy imports — 모듈-레벨 import 실패가 탭 전체를 죽이지 않게 방어
    try:
        from src.reference.indexer import delete_document, index_text, index_url
        from src.reference.store import ChromaStore
        from src.storage.models import ReferenceDocument
    except ImportError as _ie:  # pragma: no cover
        st.error(
            f"참고 자료 모듈 import 실패: `{_ie}`. "
            "chromadb 미설치 또는 빌드 캐시 stale 가능성."
        )
        return

    st.markdown("### 참고 자료 (Reference Library)")
    st.caption(
        "URL 또는 텍스트를 인덱싱하면 통합 발행 탭의 RAG 옵션이 자동으로 이 자료를 LLM 컨텍스트에 주입합니다. "
        "같은 내용은 중복 차단."
    )

    # ─── 인덱싱 입력 ────────────────────────────────────────────
    col_url, col_text = st.tabs(["🔗 URL 인덱싱", "📝 텍스트 인덱싱"])

    with col_url:
        url = st.text_input(
            "참고 URL",
            placeholder="https://example.com/medical-article",
            key="ref_lib_url",
        )
        if st.button(
            "🔍 URL 가져와서 인덱싱",
            type="primary",
            disabled=not url.strip(),
            use_container_width=True,
            key="ref_lib_url_btn",
        ):
            with st.spinner("URL fetch + 본문 추출 + 임베딩 중…"):
                with SessionLocal() as session:
                    r = index_url(session, tenant.id, url.strip())
            _show_index_result(r, label=url.strip())

    with col_text:
        text = st.text_area(
            "텍스트 (한 번에 1편)",
            placeholder="환자 안내문/팸플릿/원장 칼럼 등 의료 관련 본문을 붙여넣으세요.",
            height=200,
            key="ref_lib_text",
        )
        title = st.text_input("제목 (선택)", placeholder="예: 백내장 수술 안내 v2", key="ref_lib_title")
        if st.button(
            "📥 텍스트 인덱싱",
            type="primary",
            disabled=not text.strip(),
            use_container_width=True,
            key="ref_lib_text_btn",
        ):
            with st.spinner("청크 + 임베딩 중…"):
                with SessionLocal() as session:
                    r = index_text(
                        session,
                        tenant.id,
                        text.strip(),
                        source_type="text",
                        title=title.strip() or None,
                    )
            _show_index_result(r, label=title.strip() or "(텍스트)")

    st.divider()

    # ─── 인덱스 목록 ────────────────────────────────────────────
    with SessionLocal() as session:
        docs = (
            session.query(ReferenceDocument)
            .filter(ReferenceDocument.tenant_id == tenant.id)
            .order_by(ReferenceDocument.indexed_at.desc())
            .all()
        )

    if not docs:
        st.info("아직 인덱싱된 참고 자료가 없습니다. 위에서 URL 또는 텍스트를 추가해 보세요.")
        return

    total_chunks = sum(d.chunk_count or 0 for d in docs)
    col_a, col_b = st.columns(2)
    col_a.metric("📚 인덱싱된 문서", len(docs))
    col_b.metric("🧩 총 청크", total_chunks)

    st.markdown("##### 인덱스 목록")
    for d in docs:
        with st.container(border=True):
            head_l, head_r = st.columns([5, 1])
            head_l.markdown(
                f"**#{d.id}** · {d.title or _format_url_short(d.source_url)}"
            )
            if head_r.button(
                "🗑️ 삭제",
                key=f"ref_lib_del_{d.id}",
                use_container_width=True,
            ):
                with SessionLocal() as session:
                    delete_document(session, tenant.id, d.id)
                st.rerun()

            url_short = _format_url_short(d.source_url, max_len=80)
            ts = d.indexed_at.strftime("%Y-%m-%d %H:%M") if d.indexed_at else "—"
            st.caption(
                f"`{d.source_type}` · {url_short} · 청크 **{d.chunk_count}**개 · {ts}"
            )

            with st.expander("본문 일부 보기", expanded=False):
                excerpt = (d.raw_text or "")[:600]
                st.text(excerpt + ("\n\n…(이하 생략)" if len(d.raw_text or "") > 600 else ""))


def _show_index_result(result, *, label: str) -> None:
    """IndexResult → Streamlit 알림."""
    s = result.status
    if s == "indexed":
        st.success(
            f"✅ 인덱싱 완료 — `{label}` · doc_id={result.document_id} · 청크 {result.chunk_count}개"
        )
    elif s == "duplicate":
        st.info(
            f"♻️ 이미 인덱싱된 자료 — `{label}` · doc_id={result.document_id} (중복 차단됨)"
        )
    elif s == "fetch_failed":
        st.error(f"❌ URL fetch 실패 — `{label}`: {result.error_msg}")
    elif s == "empty":
        st.warning(f"⚠️ 인덱싱 불가 — `{label}`: {result.error_msg or '본문 없음'}")
    elif s == "embed_failed":
        st.error(
            f"❌ 임베딩 실패 — `{label}`: {result.error_msg}. "
            "EMBEDDING_PROVIDER 환경변수 확인."
        )
    else:
        st.warning(f"⚠️ status={s}: {result.error_msg}")
