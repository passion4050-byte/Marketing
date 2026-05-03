"""Streamlit 데모 UI — Phase 1 + Phase 1.5.

실행:
    streamlit run src/dashboard/app.py

모드:
- FAQ Schema.org JSON-LD : 기존 데모 (자사 사이트 <head> 삽입용)
- Blog Post (SEO + 레퍼런스 + 이미지) : 사람-톤 블로그 글, 워드프레스/네이버 붙여넣기

API 키 없이도 stub 프로바이더로 즉시 동작.
"""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

# 경로 셋업 후 임포트 (E402 무시)
from src.content.generator import generate_blog_post, generate_faq_content  # noqa: E402
from src.content.llm import CostGuardrailExceeded, LLMError, get_provider  # noqa: E402
from src.content.templates.blog_html import ImageSlot  # noqa: E402
from src.storage.db import create_all, get_session_factory  # noqa: E402
from src.storage.models import GeneratedContent, Keyword, Tenant  # noqa: E402

st.set_page_config(
    page_title="GEO/AEO SaaS — 메디맵 데모",
    page_icon="🏥",
    layout="wide",
)

UPLOADS_DIR = ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@st.cache_resource
def _bootstrap():
    create_all()
    return get_session_factory()


def _provider_status() -> tuple[str, str]:
    name = os.getenv("LLM_PROVIDER", "stub").lower()
    if name == "stub":
        return name, "🟢 키 불필요. 미리 작성된 의료법 안전 콘텐츠 반환."
    if name == "gemini":
        ok = bool(os.getenv("GOOGLE_API_KEY"))
        return name, ("🟢 GOOGLE_API_KEY 감지" if ok else "🔴 GOOGLE_API_KEY 미설정")
    if name == "anthropic":
        ok = bool(os.getenv("ANTHROPIC_API_KEY"))
        return name, ("🟢 ANTHROPIC_API_KEY 감지" if ok else "🔴 ANTHROPIC_API_KEY 미설정")
    if name == "openai":
        ok = bool(os.getenv("OPENAI_API_KEY"))
        return name, ("🟢 OPENAI_API_KEY 감지" if ok else "🔴 OPENAI_API_KEY 미설정")
    return name, f"🔴 알 수 없는 프로바이더: {name}"


def _render_compliance(report) -> None:
    summary = report.summary()
    status_emoji = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(report.status, "?")
    if report.status == "pass":
        st.success(f"{status_emoji} Compliance: {summary}")
    elif report.status == "warn":
        st.warning(f"{status_emoji} Compliance: {summary}")
    else:
        st.error(f"{status_emoji} Compliance: {summary}")

    if report.violations:
        with st.expander(f"위반 항목 {len(report.violations)}개 보기", expanded=report.status != "pass"):
            for v in report.violations:
                sev_color = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(v.severity, "⚪")
                st.markdown(
                    f"{sev_color} **[{v.severity.upper()}]** `{v.matched_text}` (위치 {v.position[0]}~{v.position[1]})  \n"
                    f"   → {v.message}"
                )


def _save_uploaded_image(uploaded) -> str:
    """업로드된 이미지를 ./data/uploads/에 저장하고 상대 경로 반환."""
    raw = uploaded.read()
    digest = hashlib.sha1(raw).hexdigest()[:12]
    ext = Path(uploaded.name).suffix.lower() or ".jpg"
    out = UPLOADS_DIR / f"{digest}{ext}"
    if not out.exists():
        out.write_bytes(raw)
    # CMS에 붙여넣을 때 사용자가 자기 서버 경로로 교체할 수 있도록 상대 경로
    return f"./data/uploads/{out.name}"


def _sidebar() -> None:
    with st.sidebar:
        st.markdown("## 🏥 GEO/AEO SaaS")
        st.caption("메디맵 — Phase 1 / 1.5 Demo")

        provider_name, provider_msg = _provider_status()
        st.markdown(f"### LLM Provider: `{provider_name}`")
        st.caption(provider_msg)

        if provider_name == "stub":
            st.info(
                "💡 키 없이 즉시 동작 모드입니다. 진짜 LLM을 쓰려면 "
                "`.env`의 `LLM_PROVIDER`를 `gemini`로 바꾸고 "
                "[Google AI Studio](https://aistudio.google.com/apikey)에서 무료 키를 발급받아 "
                "`GOOGLE_API_KEY=`에 입력 후 앱을 재실행하세요."
            )

        st.divider()
        st.markdown("### 비용 가드레일")
        st.caption(
            f"하루 한도: {os.getenv('MAX_CONTENT_GEN_PER_DAY', '50')}건  \n"
            f"최대 일일 USD: ${os.getenv('MAX_DAILY_USD', '10.0')}"
        )

        st.divider()
        st.markdown("### 모드 안내")
        st.caption(
            "**FAQ JSON-LD** — 자사 사이트 `<head>`에 넣어 AI 검색엔진의 답변 노출 ↑\n\n"
            "**블로그 포스트** — 워드프레스/티스토리/네이버에 붙여넣을 본문. SEO 메타·이미지·레퍼런스 자동 구성."
        )


def _faq_tab(SessionLocal) -> None:
    with SessionLocal() as session:
        tenants = session.query(Tenant).order_by(Tenant.id).all()
        if not tenants:
            st.error("Tenant 없음. `python scripts/init_db.py` 실행.")
            return

        col_a, col_b = st.columns([1, 2])
        with col_a:
            tenant_options = {f"{t.id}. {t.name} ({t.domain_category})": t for t in tenants}
            selected_label = st.selectbox("Tenant", list(tenant_options.keys()), key="faq_tenant")
            tenant = tenant_options[selected_label]

        with col_b:
            sample_keywords = (
                session.query(Keyword)
                .filter(Keyword.tenant_id == tenant.id, Keyword.is_active.is_(True))
                .all()
            )
            sample_texts = [k.text for k in sample_keywords]
            keyword = st.text_input(
                "키워드",
                value=sample_texts[0] if sample_texts else "",
                placeholder="예: 강남 라식 잘하는 곳",
                key="faq_keyword",
            )

        col_c, col_d, col_e = st.columns([1, 1, 1])
        with col_c:
            n_pairs = st.number_input("FAQ 개수", 3, 10, 5, 1, key="faq_n")
        with col_d:
            max_corrections = st.number_input("최대 자동수정", 0, 5, 3, 1, key="faq_corr")
        with col_e:
            st.write("")
            st.write("")
            run = st.button("✨ FAQ 생성", type="primary", use_container_width=True, key="faq_run")

        st.divider()

        if run:
            if not keyword.strip():
                st.warning("키워드를 입력하세요.")
                return
            try:
                provider = get_provider()
            except LLMError as e:
                st.error(f"❌ {e}")
                return

            with st.spinner(f"`{provider.name}`으로 FAQ 생성 중..."):
                try:
                    result = generate_faq_content(
                        session,
                        tenant_id=tenant.id,
                        keyword=keyword.strip(),
                        n_pairs=int(n_pairs),
                        max_corrections=int(max_corrections),
                        provider=provider,
                        save=True,
                    )
                except CostGuardrailExceeded as e:
                    st.error(f"⛔ {e}")
                    return
                except LLMError as e:
                    st.error(f"❌ {e}")
                    return

            st.subheader("결과")
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Provider", result.provider)
            c2.metric("FAQ 쌍", len(result.qa_pairs))
            c3.metric("자동수정 반복", f"{result.iterations}회")
            c4.metric("저장 ID", result.saved_id or "—")

            _render_compliance(result.compliance)

            tab_p, tab_j = st.tabs(["📋 FAQ 미리보기", "🧩 JSON-LD (복사용)"])
            with tab_p:
                for i, p in enumerate(result.qa_pairs, 1):
                    with st.container(border=True):
                        st.markdown(f"**Q{i}. {p.question}**")
                        st.write(p.answer)
            with tab_j:
                st.caption("자사 사이트 `<head>`에 그대로 붙여넣으세요.")
                st.code(result.json_ld_script, language="html")


def _blog_tab(SessionLocal) -> None:
    with SessionLocal() as session:
        tenants = session.query(Tenant).order_by(Tenant.id).all()
        if not tenants:
            st.error("Tenant 없음. `python scripts/init_db.py` 실행.")
            return

        col_a, col_b = st.columns([1, 2])
        with col_a:
            tenant_options = {f"{t.id}. {t.name} ({t.domain_category})": t for t in tenants}
            selected_label = st.selectbox("Tenant", list(tenant_options.keys()), key="blog_tenant")
            tenant = tenant_options[selected_label]
        with col_b:
            sample_keywords = (
                session.query(Keyword)
                .filter(Keyword.tenant_id == tenant.id, Keyword.is_active.is_(True))
                .all()
            )
            sample_texts = [k.text for k in sample_keywords]
            keyword = st.text_input(
                "키워드",
                value=sample_texts[0] if sample_texts else "",
                placeholder="예: 강남 라식 잘하는 곳",
                key="blog_keyword",
            )

        st.markdown("#### 📚 참고 URL (data feeding) — 줄바꿈으로 여러 개")
        ref_urls_text = st.text_area(
            "참고 URL",
            placeholder=(
                "https://example.com/article1\n"
                "https://blog.example.com/related"
            ),
            height=100,
            key="blog_refs",
            label_visibility="collapsed",
            help=(
                "URL을 입력하면 시스템이 본문/제목/메타를 추출해 LLM 컨텍스트에 주입합니다. "
                "AI는 자료의 사실을 활용하되 본 글의 톤으로 다시 씁니다."
            ),
        )

        st.markdown("#### 🖼️ 이미지 첨부 — 본문 흐름에 맞춰 자동 배치")
        uploaded = st.file_uploader(
            "이미지 업로드",
            accept_multiple_files=True,
            type=["png", "jpg", "jpeg", "webp", "gif"],
            key="blog_images",
            label_visibility="collapsed",
            help="업로드된 이미지는 ./data/uploads/에 저장되고, AI가 alt 텍스트와 배치 위치를 자동 제안합니다.",
        )
        if uploaded:
            st.caption(f"{len(uploaded)}개 이미지 업로드 — AI가 본문 섹션 사이에 배치합니다.")

        col_c, col_d, col_e = st.columns([1, 1, 1])
        with col_c:
            target_chars = st.number_input(
                "목표 본문 길이 (자)", 800, 4000, 2000, 100, key="blog_chars"
            )
        with col_d:
            max_corrections = st.number_input("최대 자동수정", 0, 5, 3, 1, key="blog_corr")
        with col_e:
            st.write("")
            st.write("")
            run = st.button("✨ 블로그 생성", type="primary", use_container_width=True, key="blog_run")

        st.divider()

        if not run:
            return

        if not keyword.strip():
            st.warning("키워드를 입력하세요.")
            return

        try:
            provider = get_provider()
        except LLMError as e:
            st.error(f"❌ {e}")
            return

        # 이미지 저장 + ImageSlot 생성
        image_slots: list[ImageSlot] = []
        if uploaded:
            for i, up in enumerate(uploaded, 1):
                src = _save_uploaded_image(up)
                image_slots.append(
                    ImageSlot(
                        src=src,
                        alt=f"이미지 {i} (AI가 본문 컨텍스트로 자동 작성 예정)",
                        caption=None,
                        after_section=i,
                    )
                )

        ref_urls = [u for u in ref_urls_text.splitlines() if u.strip()]

        with st.spinner(
            f"`{provider.name}`으로 블로그 생성 중... "
            f"(레퍼런스 {len(ref_urls)}개 fetch + LLM 호출 + 의료법 린트)"
        ):
            try:
                result = generate_blog_post(
                    session,
                    tenant_id=tenant.id,
                    keyword=keyword.strip(),
                    reference_urls=ref_urls,
                    images=image_slots,
                    target_chars=int(target_chars),
                    max_corrections=int(max_corrections),
                    provider=provider,
                    save=True,
                )
            except CostGuardrailExceeded as e:
                st.error(f"⛔ {e}")
                return
            except LLMError as e:
                st.error(f"❌ {e}")
                return
            except Exception as e:
                st.exception(e)
                return

        st.subheader("결과")
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Provider", result.provider)
        c2.metric("본문 길이", f"{result.post.total_word_count():,}자")
        c3.metric("섹션", len(result.post.sections))
        c4.metric("레퍼런스", len(result.references))
        c5.metric("자동수정", f"{result.iterations}회")

        _render_compliance(result.compliance)

        tab_preview, tab_meta, tab_body, tab_full, tab_naver, tab_refs, tab_history = st.tabs(
            [
                "📋 미리보기",
                "🏷️ SEO 메타 (head용)",
                "📝 본문 HTML (CMS 붙여넣기)",
                "📄 완성 HTML (단독 페이지)",
                "📱 네이버 블로그 평문",
                "📚 참고 자료",
                "🔁 자동수정 이력",
            ]
        )

        with tab_preview:
            st.markdown(f"## {result.post.title}")
            if result.post.meta_description:
                st.caption(result.post.meta_description)
            st.divider()
            for p in result.post.intro_paragraphs:
                st.write(p)
            for i, sec in enumerate(result.post.sections, 1):
                st.markdown(f"### {sec.heading}")
                for p in sec.paragraphs:
                    st.write(p)
                for sub in sec.sub_sections:
                    st.markdown(f"#### {sub.heading}")
                    for p in sub.paragraphs:
                        st.write(p)
                # 섹션 뒤 이미지 미리보기
                for img in [im for im in result.post.images if im.after_section == i]:
                    img_path = ROOT / img.src.lstrip("./")
                    if img_path.exists():
                        st.image(str(img_path), caption=img.caption or img.alt, use_container_width=True)
                    else:
                        st.info(f"🖼️ [이미지 placeholder] alt: {img.alt}")
            if result.post.conclusion_paragraphs:
                st.markdown("### 마치며")
                for p in result.post.conclusion_paragraphs:
                    st.write(p)
            if result.post.keywords:
                st.caption("🏷️ " + " ".join(f"#{k}" for k in result.post.keywords))

        with tab_meta:
            st.caption("페이지 `<head>` 안에 붙여넣으세요. (제목/메타디스크립션/OG)")
            st.code(result.meta_block, language="html")

        with tab_body:
            st.caption("워드프레스/티스토리 등 CMS 본문 영역에 붙여넣으세요.")
            st.code(result.body_html, language="html")

        with tab_full:
            st.caption("로컬에 저장하면 단독 페이지로 미리보기 가능. 브라우저에서 열어 SEO 메타 확인.")
            st.code(result.full_html, language="html")

        with tab_naver:
            st.caption("네이버 블로그 에디터에 붙여넣으세요. HTML 미지원이라 평문 + 이모지 + 해시태그.")
            st.code(result.naver_plain, language=None)

        with tab_refs:
            if not result.references:
                st.caption("참조 URL이 입력되지 않았습니다.")
            else:
                for r in result.references:
                    with st.container(border=True):
                        st.markdown(f"**[{r.title}]({r.url})**")
                        st.caption(f"본문 {r.char_count:,}자 추출")
                        if r.description:
                            st.write(r.description)
                        with st.expander("본문 미리보기 (앞 1000자)"):
                            st.write(r.body[:1000] + ("..." if len(r.body) > 1000 else ""))

        with tab_history:
            if not result.correction_history:
                st.info("자동수정 시도 없음.")
            else:
                for i, rep in enumerate(result.correction_history):
                    st.markdown(f"#### Attempt {i}")
                    st.markdown(f"- 상태: **{rep.status}** ({rep.summary()})")
                    if rep.violations:
                        for v in rep.violations:
                            st.markdown(
                                f"  - [{v.severity}] `{v.matched_text}` — {v.message}"
                            )


def _history_section(SessionLocal, tenant_filter: int | None = None) -> None:
    st.divider()
    st.subheader("최근 생성 이력")
    with SessionLocal() as session:
        q = session.query(GeneratedContent).order_by(GeneratedContent.created_at.desc()).limit(15)
        if tenant_filter:
            q = q.filter(GeneratedContent.tenant_id == tenant_filter)
        recent = q.all()
        if not recent:
            st.caption("아직 생성된 콘텐츠가 없습니다.")
            return
        for r in recent:
            cols = st.columns([2, 3, 1, 1, 1, 1])
            cols[0].caption(r.created_at.strftime("%Y-%m-%d %H:%M"))
            cols[1].markdown(f"**{r.keyword_text}**")
            cols[2].caption(r.channel)
            emoji = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(r.compliance_status, "?")
            cols[3].caption(f"{emoji} {r.compliance_status}")
            cols[4].caption(r.llm_provider)
            cols[5].caption(f"수정 {r.correction_iterations}회")


def main() -> None:
    SessionLocal = _bootstrap()
    _sidebar()

    st.title("AEO 콘텐츠 자동 생성기")
    st.caption(
        "키워드 + (선택) 참고 URL + (선택) 이미지 → 의료법 통과한 콘텐츠 → 복사 가능. "
        "AI 검색엔진(ChatGPT, Perplexity 등) 인용도 + 검색 SEO를 동시에 노립니다."
    )

    mode_tab_faq, mode_tab_blog = st.tabs(["🧩 FAQ Schema.org JSON-LD", "📝 블로그 포스트 (SEO + 이미지 + 레퍼런스)"])
    with mode_tab_faq:
        _faq_tab(SessionLocal)
    with mode_tab_blog:
        _blog_tab(SessionLocal)

    _history_section(SessionLocal)


if __name__ == "__main__":
    main()
