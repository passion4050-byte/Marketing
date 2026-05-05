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

import re

import streamlit as st


def _format_url_short(url: str | None, max_len: int = 60) -> str:
    if not url:
        return "(직접 텍스트)"
    if len(url) <= max_len:
        return url
    return url[: max_len - 1] + "…"


# raw_text 가 trafilatura 추출에 실패한 사이트(SPA, JSON-LD heavy 등) 의 HTML
# 잔재를 포함할 수 있으므로, 디스플레이 시점에 한 번 더 정제한다.
# 인덱서/저장 로직은 그대로 유지 — 이 함수는 *보여주기* 전용.
_HTML_DETECT_RE = re.compile(
    r"<(?:html|head|body|div|p|article|section|main|script|style)\b",
    re.IGNORECASE,
)


def _clean_text_for_display(raw: str, max_len: int = 800) -> tuple[str, int]:
    """raw_text → 사람이 읽기 좋은 본문 텍스트 + 정제 후 글자수.

    - <script>/<style>/<noscript> 제거
    - 모든 HTML 태그 제거 → plain text
    - 과도한 공백/개행 압축
    - max_len 길면 ellipsis
    """
    if not raw:
        return "", 0

    text = raw
    if _HTML_DETECT_RE.search(raw):
        try:
            from bs4 import BeautifulSoup

            try:
                soup = BeautifulSoup(raw, "lxml")
            except Exception:
                soup = BeautifulSoup(raw, "html.parser")
            for tag in soup(["script", "style", "noscript", "template"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
        except Exception:
            text = re.sub(r"<[^>]+>", " ", raw)

    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    cleaned_total = len(text)
    if cleaned_total > max_len:
        return text[:max_len].rstrip() + "\n\n…(이하 생략)", cleaned_total
    return text, cleaned_total


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
                raw = d.raw_text or ""
                cleaned, cleaned_total = _clean_text_for_display(raw, max_len=800)
                full_chars = len(raw)

                if not cleaned.strip():
                    st.caption(
                        "⚠️ 본문 텍스트를 추출하지 못했습니다 (스크립트/스타일만 발견). "
                        "사이트가 SPA(React/Next.js) 인 경우 발생할 수 있습니다."
                    )
                else:
                    if full_chars != cleaned_total:
                        st.caption(
                            f"📄 정제된 본문 · 전체 **{cleaned_total:,}자** "
                            f"(원본 raw {full_chars:,}자에서 HTML 태그/스크립트 제거)"
                        )
                    else:
                        st.caption(f"📄 본문 · 전체 **{cleaned_total:,}자**")
                    st.markdown(
                        f"""
                        <div style='background:#fafafa;border:1px solid #eee;
                                    border-radius:8px;padding:14px 16px;
                                    font-size:13.5px;line-height:1.7;color:#333;
                                    white-space:pre-wrap;'>{cleaned}</div>
                        """,
                        unsafe_allow_html=True,
                    )

                # 개발/디버그용 raw HTML 토글 (운영자가 굳이 볼 필요 없음)
                with st.expander("🔍 원본 raw 보기 (디버그)", expanded=False):
                    raw_excerpt = raw[:1500]
                    st.code(
                        raw_excerpt
                        + ("\n\n…(이하 생략)" if full_chars > 1500 else ""),
                        language="html",
                    )


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
