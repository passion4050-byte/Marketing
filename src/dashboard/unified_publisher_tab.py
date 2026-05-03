"""Phase 2-T2.6 — 콘텐츠 발행 통합 탭 (4채널 드롭다운).

채널: Schema.org FAQ / 자사 블로그 HTML / 네이버 블로그 평문 / Instagram 캡션
각 채널을 동일 UI 흐름으로 발행:
- 키워드 + 발행 개수 (1~5)
- 채널별 옵션 (이미지 갯수, 톤 angle 등)
- 발행 → 결과 카드 (compliance 칩, iterations, 복사 버튼)
"""

from __future__ import annotations

import json

import streamlit as st

# NOTE: src.content.* imports are deferred into render_unified_publisher_tab() below.
# 이유: Streamlit Cloud 의 일부 빌드 캐시 환경에서 generator 모듈 네임스페이스 등록이
#       지연돼 모듈-레벨 import 가 ImportError 로 떨어지는 사례가 관측됨.
#       함수 안에서 import 하면 매 발행 시마다 fresh 로 해석되어 영향이 없다.

CHANNELS = {
    "schema_org": "🧩 Schema.org FAQ JSON-LD",
    "blog_html": "📝 자사 블로그 (SEO HTML)",
    "naver_blog": "📰 네이버 블로그 평문",
    "instagram": "📸 Instagram 캡션",
}


def _compliance_chip_html(report) -> str:
    s = report.status
    if s == "pass":
        return f'<span class="gsd-chip gsd-chip-green">✅ {report.summary()}</span>'
    if s == "warn":
        return f'<span class="gsd-chip gsd-chip-yellow">⚠️ {report.summary()}</span>'
    return f'<span class="gsd-chip gsd-chip-red">❌ {report.summary()}</span>'


def render_unified_publisher_tab(SessionLocal, tenant) -> None:
    # Lazy import — Streamlit Cloud 캐시/네임스페이스 이슈 회피.
    try:
        from src.content.generator import (
            generate_blog_post as gen_blog_post,
            generate_faq_content,
            generate_instagram_content,
            generate_naver_blog_content,
        )
        from src.content.llm import (
            DEFAULT_BLOG_ANGLES,
            DEFAULT_FAQ_ANGLES,
            CostGuardrailExceeded,
            LLMError,
            pick_angles,
        )
    except ImportError as _ie:  # pragma: no cover
        st.error(
            f"콘텐츠 모듈 import 실패: `{_ie}`. "
            "Streamlit Cloud 의 빌드 캐시가 stale 상태일 수 있습니다. "
            "Manage app → Reboot app 으로 재시작해 주세요."
        )
        return

    st.markdown("### 콘텐츠 발행 (통합)")
    st.caption("채널 1개 선택 → 의료법 통과 콘텐츠 1~5건 일괄 발행 + 복사 가능.")

    channel_label = st.selectbox(
        "채널",
        list(CHANNELS.values()),
        key="unified_channel_select",
    )
    channel = next(k for k, v in CHANNELS.items() if v == channel_label)

    col_kw, col_n = st.columns([3, 1])
    keyword = col_kw.text_input("키워드", placeholder="예: 강남 라식 잘하는 곳", key="unified_kw")
    count = col_n.slider("발행 개수", 1, 5, 1, key="unified_count")

    # 채널별 옵션
    angle_pool = DEFAULT_FAQ_ANGLES if channel == "schema_org" else DEFAULT_BLOG_ANGLES

    with st.expander("옵션", expanded=False):
        if channel in ("blog_html", "naver_blog"):
            target_chars = st.slider("목표 본문 글자수", 1000, 3000, 2000, 100, key="unified_chars")
            image_count = st.slider("이미지 placeholder 갯수", 0, 6, 2, key="unified_imgs")
        else:
            target_chars = 2000
            image_count = 0
        max_corrections = st.slider("자동수정 최대 횟수", 0, 5, 3, key="unified_corr")

        st.divider()
        col_rag, col_k = st.columns([2, 3])
        use_rag = col_rag.checkbox(
            "📚 참고 자료(RAG) 사용",
            value=True,
            key="unified_use_rag",
            help="인덱싱된 참고 자료에서 키워드 관련 청크를 LLM 컨텍스트로 주입.",
        )
        rag_k = col_k.slider(
            "참고 청크 개수 (k)", 1, 10, 5,
            key="unified_rag_k",
            disabled=not use_rag,
        )

    if st.button("✨ 발행", type="primary", disabled=not keyword, use_container_width=True):
        angles = pick_angles(angle_pool, count)
        with SessionLocal() as session:
            results = []
            for idx, angle in enumerate(angles, 1):
                try:
                    if channel == "schema_org":
                        r = generate_faq_content(
                            session, tenant_id=tenant.id, keyword=keyword,
                            n_pairs=5, max_corrections=max_corrections, angle=angle,
                            use_rag=use_rag, rag_k=rag_k,
                        )
                    elif channel == "blog_html":
                        r = gen_blog_post(
                            session, tenant_id=tenant.id, keyword=keyword,
                            target_chars=target_chars, image_count=image_count,
                            max_corrections=max_corrections, angle=angle,
                            use_rag=use_rag, rag_k=rag_k,
                        )
                    elif channel == "naver_blog":
                        r = generate_naver_blog_content(
                            session, tenant_id=tenant.id, keyword=keyword,
                            target_chars=target_chars, image_count=image_count,
                            max_corrections=max_corrections, angle=angle,
                            use_rag=use_rag, rag_k=rag_k,
                        )
                    elif channel == "instagram":
                        r = generate_instagram_content(
                            session, tenant_id=tenant.id, keyword=keyword,
                            max_corrections=max_corrections, angle=angle,
                            use_rag=use_rag, rag_k=rag_k,
                        )
                    else:
                        st.error(f"알 수 없는 채널: {channel}")
                        return
                    results.append((idx, r))
                except CostGuardrailExceeded as e:
                    st.error(f"🛑 비용 가드레일: {e}")
                    return
                except LLMError as e:
                    st.error(f"LLM 오류: {e}")
                    return
        st.session_state[f"unified_results_{channel}"] = results

    results = st.session_state.get(f"unified_results_{channel}")
    if not results:
        return

    pass_count = sum(1 for _, r in results if r.compliance.status == "pass")
    st.success(
        f"✅ {len(results)}개 발행 완료 · 통과 {pass_count}개 / 검수권장 {len(results) - pass_count}개"
    )

    for idx, r in results:
        _render_result_card(idx, channel, r, total=len(results))


def _render_result_card(idx: int, channel: str, r, *, total: int) -> None:
    label = CHANNELS[channel]
    cited_ids = getattr(r, "cited_reference_ids", None) or []
    with st.container(border=True):
        head_l, head_r = st.columns([3, 2])
        head_l.markdown(f"#### {label} · #{idx}/{total}")
        head_chips = _compliance_chip_html(r.compliance)
        if cited_ids:
            head_chips += (
                f' <span class="gsd-chip gsd-chip-blue">📎 출처 {len(cited_ids)}건</span>'
            )
        head_r.markdown(head_chips, unsafe_allow_html=True)
        st.caption(
            f"Provider: `{r.provider}` · 자동수정 {r.iterations - 1}회"
            + (f" · saved_id={r.saved_id}" if getattr(r, "saved_id", None) else "")
            + (f" · 참고 doc_ids={cited_ids}" if cited_ids else "")
        )

        if channel == "schema_org":
            tab_jl, tab_qa = st.tabs(["📋 JSON-LD (복사용)", "📖 Q&A 미리보기"])
            with tab_jl:
                st.code(r.json_ld_script, language="html")
            with tab_qa:
                for j, p in enumerate(r.qa_pairs, 1):
                    st.markdown(f"**Q{j}.** {p.question}")
                    st.markdown(f"> {p.answer}")

        elif channel == "blog_html":
            tab_html, tab_md, tab_naver = st.tabs(
                ["💻 HTML (복사)", "📝 Markdown", "📰 네이버 평문(부산물)"]
            )
            with tab_html:
                st.code(r.full_html, language="html")
            with tab_md:
                st.markdown(r.body_html, unsafe_allow_html=True)
            with tab_naver:
                st.code(r.naver_plain, language=None)
                st.caption("⚠️ 정식 네이버 채널은 위의 '네이버 블로그 평문' 채널 사용 권장.")

        elif channel == "naver_blog":
            tab_plain, tab_meta = st.tabs(["📰 평문 (복사)", "📋 메타"])
            with tab_plain:
                st.code(r.plain_text, language=None)
            with tab_meta:
                meta = {
                    "title": r.post.title,
                    "char_count": r.post.char_count(),
                    "n_sections": len(r.post.sections),
                    "hashtags": r.post.hashtags,
                    "image_count": r.post.image_count,
                }
                st.code(json.dumps(meta, ensure_ascii=False, indent=2), language="json")

        elif channel == "instagram":
            tab_cap, tab_meta = st.tabs(["📸 캡션 (복사)", "📋 메타"])
            with tab_cap:
                st.code(r.rendered, language=None)
                len_color = "green" if 200 <= r.char_count <= 300 else "amber"
                tag_color = "green" if 5 <= r.hashtag_count <= 10 else "amber"
                st.markdown(
                    f"📏 본문 글자수: **{r.char_count}** "
                    f":{ 'white_check_mark' if len_color == 'green' else 'warning' }: · "
                    f"🏷️ 해시태그: **{r.hashtag_count}** "
                    f":{ 'white_check_mark' if tag_color == 'green' else 'warning' }:"
                )
            with tab_meta:
                meta = {
                    "hook": r.caption.hook,
                    "body": r.caption.body,
                    "cta": r.caption.cta,
                    "hashtags": r.caption.hashtags,
                }
                st.code(json.dumps(meta, ensure_ascii=False, indent=2), language="json")

        # 의료법 위반 상세
        if r.compliance.violations:
            with st.expander(f"의료법 위반 {len(r.compliance.violations)}건", expanded=False):
                for v in r.compliance.violations:
                    icon = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(v.severity, "⚪")
                    st.markdown(
                        f"{icon} **[{v.severity.upper()}]** `{v.matched_text}` "
                        f"(위치 {v.position[0]}~{v.position[1]}) — {v.message}"
                    )
