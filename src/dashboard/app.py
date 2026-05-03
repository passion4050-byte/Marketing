"""Streamlit 데모 UI — Phase 1 + Phase 1.5 + UI 개편.

탭 구성:
- FAQ생성프로그램 — GEO general question 매칭 Q&A. 1~10 발행, 각 발행마다 복사.
- 블로그 포스트 — SEO + 레퍼런스 + 이미지 + 사람-톤. 1~10 발행, 각 글마다 복사.

실행: streamlit run src/dashboard/app.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")


def _hydrate_env_from_secrets() -> None:
    """Streamlit Cloud secrets → 환경변수로 흘려보내 기존 os.getenv 코드 재사용."""
    try:
        secrets = st.secrets  # 없으면 StreamlitSecretNotFoundError
    except Exception:
        return
    for key in (
        "LLM_PROVIDER",
        "GOOGLE_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
        "DATABASE_URL",
        "APP_PASSWORD",
        "MAX_DAILY_USD",
        "MAX_CONTENT_GEN_PER_DAY",
    ):
        try:
            val = secrets.get(key)
        except Exception:
            val = None
        if val and not os.environ.get(key):
            os.environ[key] = str(val)


_hydrate_env_from_secrets()

from src.content.generator import generate_blog_post, generate_faq_content  # noqa: E402
from src.content.llm import (  # noqa: E402
    DEFAULT_BLOG_ANGLES,
    DEFAULT_FAQ_ANGLES,
    CostGuardrailExceeded,
    LLMError,
    get_provider,
    pick_angles,
)
from src.content.templates.blog_html import ImageSlot  # noqa: E402
from src.content.templates.schema_org import faq_page_script_tag  # noqa: E402
from src.content.tenant_context import has_active_data  # noqa: E402
from src.dashboard.ai_simulator import render_ai_simulator_tab  # noqa: E402
from src.dashboard.brand_voice_tab import render_brand_voice_tab  # noqa: E402
from src.dashboard.dashboard_tab import render_dashboard_tab  # noqa: E402
from src.dashboard.profile import render_profile_tab  # noqa: E402
from src.dashboard.theme import GLOBAL_CSS, chip  # noqa: E402
from src.storage.db import create_all, get_session_factory  # noqa: E402
from src.storage.models import GeneratedContent, Keyword, Tenant  # noqa: E402

st.set_page_config(
    page_title="HOSPITAL — GEO/AEO 콘텐츠 발행",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── 글로벌 디자인 시스템 ────────────────────────────────────────
st.markdown(GLOBAL_CSS, unsafe_allow_html=True)

UPLOADS_DIR = ROOT / "data" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@st.cache_resource
def _bootstrap():
    create_all()
    factory = get_session_factory()
    # Streamlit Cloud처럼 컨테이너 재시작 = SQLite 휘발 환경에서
    # 자동으로 sample tenants/rules 시드 (idempotent — 이미 있으면 NOOP).
    try:
        from src.storage.seed import seed_if_empty

        with factory() as session:
            seed_if_empty(session)
    except Exception as exc:  # pragma: no cover — 시드 실패가 앱 기동을 막진 않게
        print(f"[warn] auto-seed skipped: {exc}")
    return factory


def _check_password() -> bool:
    """공개 URL에서 demo 보호용 비밀번호 게이트.

    APP_PASSWORD 환경변수(또는 st.secrets) 가 비어 있으면 게이트 비활성.
    """
    expected = os.getenv("APP_PASSWORD", "").strip()
    if not expected:
        return True

    if st.session_state.get("_auth_ok"):
        return True

    st.markdown(
        """
        <div style="max-width:380px;margin:80px auto 0 auto;text-align:center;">
          <div style="font-size:32px;font-weight:800;letter-spacing:-0.03em;">🔒 HOSPITAL</div>
          <div style="font-size:14px;color:#666;margin:6px 0 28px 0;">
            GEO/AEO Content Platform — 비공개 데모
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    col_l, col_c, col_r = st.columns([1, 2, 1])
    with col_c:
        with st.form("login_form", clear_on_submit=False):
            pw = st.text_input("비밀번호", type="password", placeholder="데모 비밀번호 입력")
            submitted = st.form_submit_button("입장", type="primary", use_container_width=True)
        if submitted:
            if pw == expected:
                st.session_state["_auth_ok"] = True
                st.rerun()
            else:
                st.error("비밀번호가 올바르지 않습니다.")
    return False


def _provider_status() -> tuple[str, str, bool]:
    name = os.getenv("LLM_PROVIDER", "stub").lower()
    if name == "stub":
        return name, "키 불필요. 미리 작성된 의료법 안전 콘텐츠 반환.", True
    if name == "gemini":
        ok = bool(os.getenv("GOOGLE_API_KEY"))
        return name, "GOOGLE_API_KEY 감지" if ok else "GOOGLE_API_KEY 미설정", ok
    if name == "anthropic":
        ok = bool(os.getenv("ANTHROPIC_API_KEY"))
        return name, "ANTHROPIC_API_KEY 감지" if ok else "ANTHROPIC_API_KEY 미설정", ok
    if name == "openai":
        ok = bool(os.getenv("OPENAI_API_KEY"))
        return name, "OPENAI_API_KEY 감지" if ok else "OPENAI_API_KEY 미설정", ok
    return name, f"알 수 없는 프로바이더: {name}", False


def _compliance_chip(report) -> str:
    s = report.status
    if s == "pass":
        return f'<span class="gsd-chip gsd-chip-green">✅ {report.summary()}</span>'
    if s == "warn":
        return f'<span class="gsd-chip gsd-chip-yellow">⚠️ {report.summary()}</span>'
    return f'<span class="gsd-chip gsd-chip-red">❌ {report.summary()}</span>'


def _render_compliance_inline(report) -> None:
    st.markdown(_compliance_chip(report), unsafe_allow_html=True)
    if report.violations:
        with st.expander(f"위반 {len(report.violations)}개 보기", expanded=False):
            for v in report.violations:
                sev_color = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(v.severity, "⚪")
                st.markdown(
                    f"{sev_color} **[{v.severity.upper()}]** `{v.matched_text}` (위치 {v.position[0]}~{v.position[1]})  \n"
                    f"   → {v.message}"
                )


def _save_uploaded_image(uploaded) -> str:
    raw = uploaded.read()
    digest = hashlib.sha1(raw).hexdigest()[:12]
    ext = Path(uploaded.name).suffix.lower() or ".jpg"
    out = UPLOADS_DIR / f"{digest}{ext}"
    if not out.exists():
        out.write_bytes(raw)
    return f"./data/uploads/{out.name}"


def _sidebar() -> None:
    with st.sidebar:
        st.markdown(
            """
            <div style="padding:8px 4px 16px 4px;">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1a1a1a;">
                🏥 HOSPITAL
              </div>
              <div style="font-size:12px;color:#888;margin-top:2px;letter-spacing:0.04em;">
                GEO/AEO Content Platform
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        provider_name, provider_msg, ok = _provider_status()
        chip_color = "green" if ok else "red"
        st.markdown(
            f"**LLM Provider** &nbsp; {chip(provider_name, chip_color)}",
            unsafe_allow_html=True,
        )
        st.caption(provider_msg)

        if provider_name == "stub":
            st.info(
                "💡 키 없이 동작 모드입니다. `.env`에서 `LLM_PROVIDER=gemini`로 바꾸고 "
                "[Google AI Studio](https://aistudio.google.com/apikey)에서 무료 키 발급 후 재실행."
            )
        elif not ok:
            st.warning(f"`LLM_PROVIDER={provider_name}` 인데 해당 API 키가 비어있습니다.")

        st.divider()
        st.markdown("**📊 비용 가드레일**")
        st.caption(
            f"하루 한도: **{os.getenv('MAX_CONTENT_GEN_PER_DAY', '50')}건**  \n"
            f"일일 한도 USD: **${os.getenv('MAX_DAILY_USD', '10.0')}**"
        )

        st.divider()
        st.markdown("**📚 탭 안내**")
        st.caption(
            "**📊 대시보드** · 노출 현황 / KPI  \n"
            "**🎯 데이터 피딩** · 의사·장비·이벤트 입력  \n"
            "**🧩 FAQ** · GEO Q&A 발행  \n"
            "**📝 블로그** · SEO + 이미지 + 레퍼런스  \n"
            "**🧪 시뮬레이터** · 3엔진 비교  \n"
            "**🎨 브랜드 보이스** · 톤앤매너 설정"
        )


def _tenant_picker(SessionLocal, *, key: str) -> tuple[Tenant, list[str]]:
    """대상(Tenant) 드롭다운 + sample keywords 리스트 반환."""
    with SessionLocal() as session:
        tenants = session.query(Tenant).order_by(Tenant.id).all()
        if not tenants:
            st.error("대상(Tenant) 없음. 터미널에서 `python scripts/init_db.py` 실행하세요.")
            st.stop()

        labels = {f"{t.id}. {t.name} — {t.domain_category} ({t.region})": t for t in tenants}
        selected = st.selectbox("대상", list(labels.keys()), key=f"{key}_tenant")
        tenant = labels[selected]

        sample_keywords = (
            session.query(Keyword)
            .filter(Keyword.tenant_id == tenant.id, Keyword.is_active.is_(True))
            .all()
        )
        # detached object — Streamlit이 다른 세션에서 안전하게 쓸 수 있도록 dict 변환
        tenant_data = type("T", (), {
            "id": tenant.id,
            "name": tenant.name,
            "domain_category": tenant.domain_category,
            "region": tenant.region,
            "address": tenant.address or "",
            "naver_place_url": tenant.naver_place_url or "",
            "phone": tenant.phone or "",
            "homepage": tenant.homepage or "",
        })()
        sample_texts = [k.text for k in sample_keywords]
        return tenant_data, sample_texts


def _tenant_info_card(SessionLocal, tenant) -> None:
    """대상 정보 카드 — 영업 정보 + 데이터 피딩 상태 미리보기."""
    bits = []
    if tenant.address:
        bits.append(f"📍 {tenant.address}")
    if tenant.phone:
        bits.append(f"☎ {tenant.phone}")
    if tenant.homepage:
        bits.append(f"🌐 [{tenant.homepage}]({tenant.homepage})")
    if tenant.naver_place_url:
        bits.append(f"🗺️ [네이버 플레이스]({tenant.naver_place_url})")

    with SessionLocal() as session:
        counts = has_active_data(session, tenant.id)

    chips = []
    if counts["doctors"] > 0:
        chips.append(f'<span class="gsd-chip gsd-chip-blue">👁️ 의사 {counts["doctors"]}명</span>')
    else:
        chips.append('<span class="gsd-chip gsd-chip-gray">👁️ 의사 미입력</span>')
    if counts["equipment"] > 0:
        chips.append(f'<span class="gsd-chip gsd-chip-blue">🩻 장비 {counts["equipment"]}개</span>')
    else:
        chips.append('<span class="gsd-chip gsd-chip-gray">🩻 장비 미입력</span>')
    if counts["active_events"] > 0:
        chips.append(f'<span class="gsd-chip gsd-chip-green">🏷️ 진행 이벤트 {counts["active_events"]}개</span>')
    else:
        chips.append('<span class="gsd-chip gsd-chip-gray">🏷️ 진행 이벤트 없음</span>')

    if not (bits or chips):
        return

    with st.container(border=True):
        st.markdown("**대상 정보** (콘텐츠 끝부분에 자연 노출 + LLM 컨텍스트로 주입)")
        if bits:
            st.markdown(" · ".join(bits))
        st.markdown(" ".join(chips), unsafe_allow_html=True)
        if counts["doctors"] == 0 and counts["equipment"] == 0 and counts["active_events"] == 0:
            st.caption(
                "💡 **데이터 피딩 권장** — 위 `🎯 대상 정보 관리` 탭에서 의사/장비/이벤트를 입력하면 "
                "콘텐츠 품질이 크게 올라갑니다."
            )


# ─── FAQ 탭 ─────────────────────────────────────────────────────


def _render_faq_card(idx: int, result, total: int) -> None:
    """1개 FAQ 결과 카드 — 미리보기 + JSON-LD 복사."""
    with st.container(border=True):
        col_h1, col_h2 = st.columns([3, 1])
        with col_h1:
            st.markdown(f"### 📦 발행 {idx} / {total}")
            if result.qa_pairs:
                first_q = result.qa_pairs[0].question[:60]
                st.caption(f"첫 질문: {first_q}…")
        with col_h2:
            st.markdown(_compliance_chip(result.compliance), unsafe_allow_html=True)

        st.caption(
            f"Provider {result.provider} · FAQ {len(result.qa_pairs)}쌍 · "
            f"자동수정 {result.iterations}회 · 저장 ID {result.saved_id or '—'}"
        )

        tab_p, tab_j = st.tabs(["📋 Q&A 미리보기", "🧩 JSON-LD (복사)"])
        with tab_p:
            for i, p in enumerate(result.qa_pairs, 1):
                st.markdown(f"**Q{i}.** {p.question}")
                st.markdown(p.answer)
                st.divider()
        with tab_j:
            st.caption("자사 사이트 `<head>`에 그대로 붙여넣으세요. 우측 상단 복사 아이콘 활용.")
            st.code(result.json_ld_script, language="html")

        if result.compliance.violations:
            with st.expander(f"⚠️ Compliance 위반 {len(result.compliance.violations)}개"):
                for v in result.compliance.violations:
                    sev = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(v.severity, "⚪")
                    st.markdown(f"{sev} `{v.matched_text}` — {v.message}")


def _faq_tab(SessionLocal) -> None:
    st.markdown("##### 🎯 GEO Q&A 발행 — AI 검색엔진 답변 인용 노리기")
    st.caption(
        "사용자가 AI에게 일반 질문(예: \"강남 라식 어디가 좋아?\")을 했을 때, "
        "당신의 Q&A가 답변에 \"맞춤 추천\"으로 인용되도록 콘텐츠를 발행합니다."
    )

    tenant, sample_texts = _tenant_picker(SessionLocal, key="faq")
    _tenant_info_card(SessionLocal, tenant)

    keyword = st.text_input(
        "키워드",
        value=sample_texts[0] if sample_texts else "",
        placeholder="예: 강남 라식 잘하는 곳",
        key="faq_keyword",
        help="AI 검색엔진에 노출시키고 싶은 핵심 키워드/주제",
    )
    if sample_texts:
        st.caption(
            "💡 샘플: " + " · ".join(f"`{s}`" for s in sample_texts[:5])
        )

    col_c, col_d, col_e, col_f = st.columns([1, 1, 1, 1])
    with col_c:
        daily_count = st.slider(
            "일일 발행 개수",
            1, 10, 1, 1,
            key="faq_daily",
            help="오늘 발행할 FAQ 콘텐츠 개수. 각각 다른 관점/소주제로 자동 차별화.",
        )
    with col_d:
        n_pairs = st.number_input("Q&A 쌍/콘텐츠", 3, 10, 5, 1, key="faq_n")
    with col_e:
        max_corrections = st.number_input("자동수정 최대", 0, 5, 3, 1, key="faq_corr")
    with col_f:
        st.write("")
        st.write("")
        run = st.button("✨ FAQ 발행", type="primary", use_container_width=True, key="faq_run")

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

    angles = pick_angles(DEFAULT_FAQ_ANGLES, daily_count) if daily_count > 1 else [""]
    progress = st.progress(0.0, text=f"발행 1/{daily_count} 시작...")
    results = []

    with SessionLocal() as session:
        for i, angle in enumerate(angles, 1):
            progress.progress((i - 1) / daily_count, text=f"발행 {i}/{daily_count} — {angle or '기본 관점'} ...")
            try:
                r = generate_faq_content(
                    session,
                    tenant_id=tenant.id,
                    keyword=keyword.strip(),
                    n_pairs=int(n_pairs),
                    max_corrections=int(max_corrections),
                    provider=provider,
                    angle=angle,
                    save=True,
                )
                results.append(r)
            except CostGuardrailExceeded as e:
                st.error(f"⛔ {e}")
                progress.empty()
                return
            except LLMError as e:
                st.error(f"❌ {i}번째 발행 LLM 오류: {e}")
                continue
            except Exception as e:
                st.exception(e)
                continue
        progress.progress(1.0, text=f"발행 {daily_count}개 완료 ✓")

    progress.empty()

    if not results:
        st.error("발행된 결과가 없습니다.")
        return

    pass_count = sum(1 for r in results if r.passed)
    st.success(f"✅ {len(results)}개 발행 완료 · 의료법 통과 {pass_count}개 / 검수권장 {len(results) - pass_count}개")

    for idx, r in enumerate(results, 1):
        _render_faq_card(idx, r, total=len(results))


# ─── 블로그 탭 ──────────────────────────────────────────────────


def _render_blog_card(idx: int, result, total: int) -> None:
    with st.container(border=True):
        col_h1, col_h2 = st.columns([3, 1])
        with col_h1:
            st.markdown(f"### 📰 발행 {idx} / {total} — {result.post.title}")
            st.caption(result.post.meta_description[:120] + ("…" if len(result.post.meta_description) > 120 else ""))
        with col_h2:
            st.markdown(_compliance_chip(result.compliance), unsafe_allow_html=True)

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("길이", f"{result.post.total_word_count():,}자")
        c2.metric("섹션", len(result.post.sections))
        c3.metric("레퍼런스", len(result.references))
        c4.metric("자동수정", f"{result.iterations}회")

        tab_preview, tab_meta, tab_body, tab_full, tab_naver, tab_refs = st.tabs(
            ["📋 미리보기", "🏷️ SEO 메타", "📝 본문 HTML (복사)", "📄 완성 HTML (복사)", "📱 네이버 평문 (복사)", "📚 참고/위치"]
        )

        with tab_preview:
            st.markdown(f"## {result.post.title}")
            if result.post.meta_description:
                st.caption(result.post.meta_description)
            st.divider()
            for p in result.post.intro_paragraphs:
                st.markdown(p)
            for i, sec in enumerate(result.post.sections, 1):
                st.markdown(f"### {sec.heading}")
                for p in sec.paragraphs:
                    st.markdown(p)
                for sub in sec.sub_sections:
                    st.markdown(f"#### {sub.heading}")
                    for p in sub.paragraphs:
                        st.markdown(p)
                for img in [im for im in result.post.images if im.after_section == i]:
                    img_path = ROOT / img.src.lstrip("./")
                    if img_path.exists():
                        st.image(str(img_path), caption=img.caption or img.alt, use_container_width=True)
                    else:
                        st.info(f"🖼️ [이미지 placeholder] alt: {img.alt}")
            if result.post.conclusion_paragraphs:
                st.markdown("### 마치며")
                for p in result.post.conclusion_paragraphs:
                    st.markdown(p)
            if result.post.tenant_name or result.post.tenant_address:
                with st.container(border=True):
                    st.markdown(f"**📍 {result.post.tenant_name}**")
                    if result.post.tenant_address:
                        st.markdown(f"주소: {result.post.tenant_address}")
                    if result.post.tenant_naver_place_url:
                        st.markdown(f"네이버 지도: [{result.post.tenant_naver_place_url}]({result.post.tenant_naver_place_url})")
            if result.post.keywords:
                st.caption("🏷️ " + " ".join(f"#{k}" for k in result.post.keywords))

        with tab_meta:
            st.caption("페이지 `<head>` 안에 붙여넣으세요. (제목/메타디스크립션/OG)")
            st.code(result.meta_block, language="html")

        with tab_body:
            st.caption("워드프레스/티스토리 등 CMS 본문 영역에 붙여넣으세요.")
            st.code(result.body_html, language="html")

        with tab_full:
            st.caption("로컬에 저장 → 브라우저에서 열어 단독 미리보기 가능.")
            st.code(result.full_html, language="html")

        with tab_naver:
            st.caption("네이버 블로그 에디터에 붙여넣으세요. 평문 + 이모지 + 해시태그.")
            st.code(result.naver_plain, language=None)

        with tab_refs:
            if result.references:
                st.markdown("**참고 자료 (data feeding)**")
                for r in result.references:
                    with st.container(border=True):
                        st.markdown(f"**[{r.title}]({r.url})**")
                        st.caption(f"본문 {r.char_count:,}자 추출")
                        if r.description:
                            st.write(r.description)
                        with st.expander("본문 미리보기"):
                            st.write(r.body[:600] + ("…" if len(r.body) > 600 else ""))
            else:
                st.caption("입력된 참고 URL 없음.")

            if result.post.tenant_naver_place_url or result.post.tenant_address:
                st.markdown("**위치 안내 (본문 끝에 자동 노출)**")
                with st.container(border=True):
                    if result.post.tenant_address:
                        st.markdown(f"📍 {result.post.tenant_address}")
                    if result.post.tenant_naver_place_url:
                        st.markdown(f"🗺️ [{result.post.tenant_naver_place_url}]({result.post.tenant_naver_place_url})")
                    if result.post.tenant_phone:
                        st.markdown(f"☎ {result.post.tenant_phone}")
                    if result.post.tenant_homepage:
                        st.markdown(f"🌐 [{result.post.tenant_homepage}]({result.post.tenant_homepage})")

        if result.compliance.violations:
            with st.expander(f"⚠️ Compliance 위반 {len(result.compliance.violations)}개"):
                for v in result.compliance.violations:
                    sev = {"error": "🔴", "warning": "🟡", "info": "🔵"}.get(v.severity, "⚪")
                    st.markdown(f"{sev} `{v.matched_text}` — {v.message}")


def _blog_tab(SessionLocal) -> None:
    st.markdown("##### 📝 SEO 블로그 발행 — 사람-톤 + 레퍼런스 + 이미지 + 위치 자동")
    st.caption(
        "키워드 + 참고 URL + 이미지 → 의료법 통과한 사람-톤 블로그 글. "
        "워드프레스/티스토리/네이버 에디터에 그대로 붙여넣기."
    )

    tenant, sample_texts = _tenant_picker(SessionLocal, key="blog")
    _tenant_info_card(SessionLocal, tenant)

    keyword = st.text_input(
        "키워드",
        value=sample_texts[0] if sample_texts else "",
        placeholder="예: 강남 라식 잘하는 곳",
        key="blog_keyword",
    )
    if sample_texts:
        st.caption("💡 샘플: " + " · ".join(f"`{s}`" for s in sample_texts[:5]))

    st.markdown('<div class="gsd-section-title">📚 참고 URL — Data feeding</div>', unsafe_allow_html=True)
    ref_urls_text = st.text_area(
        "참고 URL",
        placeholder="https://example.com/article1\nhttps://blog.example.com/related",
        height=90,
        key="blog_refs",
        label_visibility="collapsed",
        help="URL을 입력하면 시스템이 본문/제목/메타를 추출해 LLM 컨텍스트에 주입합니다. AI는 자료를 인용하되 본 글의 톤으로 다시 씁니다.",
    )

    st.markdown('<div class="gsd-section-title">🖼️ 이미지 첨부 — 본문 흐름에 자동 배치</div>', unsafe_allow_html=True)
    uploaded = st.file_uploader(
        "이미지 업로드",
        accept_multiple_files=True,
        type=["png", "jpg", "jpeg", "webp", "gif"],
        key="blog_images",
        label_visibility="collapsed",
        help="업로드된 이미지는 ./data/uploads/에 저장되고, AI가 alt 텍스트와 배치 위치를 자동 제안합니다.",
    )
    if uploaded:
        st.caption(f"✅ {len(uploaded)}개 업로드. AI가 본문 섹션 사이에 배치합니다.")

    col_c, col_d, col_e, col_f = st.columns([1, 1, 1, 1])
    with col_c:
        daily_count = st.slider(
            "일일 발행 개수",
            1, 10, 1, 1,
            key="blog_daily",
            help="오늘 발행할 블로그 글 개수. 각각 다른 관점/소주제로 자동 차별화.",
        )
    with col_d:
        target_chars = st.number_input("목표 본문 길이 (자)", 800, 4000, 2000, 100, key="blog_chars")
    with col_e:
        max_corrections = st.number_input("자동수정 최대", 0, 5, 3, 1, key="blog_corr")
    with col_f:
        st.write("")
        st.write("")
        run = st.button("✨ 블로그 발행", type="primary", use_container_width=True, key="blog_run")

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

    # 이미지 저장
    image_slots: list[ImageSlot] = []
    if uploaded:
        for i, up in enumerate(uploaded, 1):
            src = _save_uploaded_image(up)
            image_slots.append(
                ImageSlot(
                    src=src,
                    alt=f"이미지 {i} — AI가 본문 컨텍스트로 alt 작성 예정",
                    caption=None,
                    after_section=i,
                )
            )

    ref_urls = [u for u in ref_urls_text.splitlines() if u.strip()]
    angles = pick_angles(DEFAULT_BLOG_ANGLES, daily_count) if daily_count > 1 else [""]

    progress = st.progress(0.0, text=f"발행 1/{daily_count} 시작...")
    results = []

    with SessionLocal() as session:
        for i, angle in enumerate(angles, 1):
            progress.progress(
                (i - 1) / daily_count,
                text=f"발행 {i}/{daily_count} — {angle or '기본 관점'} (참고 {len(ref_urls)}개 · 이미지 {len(image_slots)}개)...",
            )
            try:
                r = generate_blog_post(
                    session,
                    tenant_id=tenant.id,
                    keyword=keyword.strip(),
                    reference_urls=ref_urls,
                    images=image_slots,
                    target_chars=int(target_chars),
                    max_corrections=int(max_corrections),
                    provider=provider,
                    angle=angle,
                    save=True,
                )
                results.append(r)
            except CostGuardrailExceeded as e:
                st.error(f"⛔ {e}")
                progress.empty()
                return
            except LLMError as e:
                st.error(f"❌ {i}번째 발행 오류: {e}")
                continue
            except Exception as e:
                st.exception(e)
                continue
        progress.progress(1.0, text=f"발행 {daily_count}개 완료 ✓")

    progress.empty()

    if not results:
        st.error("발행된 결과가 없습니다.")
        return

    pass_count = sum(1 for r in results if r.passed)
    st.success(f"✅ {len(results)}개 발행 완료 · 의료법 통과 {pass_count}개 / 검수권장 {len(results) - pass_count}개")

    for idx, r in enumerate(results, 1):
        _render_blog_card(idx, r, total=len(results))


# ─── 이력 ───────────────────────────────────────────────────────


def _history_section(SessionLocal) -> None:
    st.divider()
    st.subheader("🗂️ 최근 발행 이력")
    with SessionLocal() as session:
        recent = (
            session.query(GeneratedContent)
            .order_by(GeneratedContent.created_at.desc())
            .limit(20)
            .all()
        )
        if not recent:
            st.caption("아직 발행된 콘텐츠가 없습니다.")
            return
        for r in recent:
            cols = st.columns([2, 4, 1, 1, 1, 1])
            cols[0].caption(r.created_at.strftime("%Y-%m-%d %H:%M"))
            cols[1].markdown(f"**{r.keyword_text}**")
            cols[2].caption(r.channel)
            emoji = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(r.compliance_status, "?")
            cols[3].caption(f"{emoji} {r.compliance_status}")
            cols[4].caption(r.llm_provider)
            cols[5].caption(f"수정 {r.correction_iterations}회")


def main() -> None:
    if not _check_password():
        st.stop()
    SessionLocal = _bootstrap()
    _sidebar()

    st.markdown(
        """
        <div style="padding:8px 0 16px 0;">
          <div style="font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#1a1a1a;">
            AEO 콘텐츠 자동 발행 프로그램
          </div>
          <div style="font-size:14px;color:#666;margin-top:4px;">
            GEO/AEO SaaS — 키워드 → 의료법 통과 콘텐츠 → 복사 가능 ·
            AI 검색엔진 인용도 + 구글/네이버 SEO 동시 최적화
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    tab_dash, tab_feed, tab_faq, tab_blog, tab_sim, tab_voice = st.tabs(
        [
            "📊 대시보드",
            "🎯 데이터 피딩",
            "🧩 FAQ 생성기",
            "📝 블로그 포스트",
            "🧪 AI 시뮬레이터",
            "🎨 브랜드 보이스",
        ]
    )
    with tab_dash:
        tenant, _ = _tenant_picker(SessionLocal, key="dash")
        render_dashboard_tab(SessionLocal, tenant)
    with tab_feed:
        tenant, _ = _tenant_picker(SessionLocal, key="profile")
        render_profile_tab(SessionLocal, tenant)
    with tab_faq:
        _faq_tab(SessionLocal)
    with tab_blog:
        _blog_tab(SessionLocal)
    with tab_sim:
        tenant, _ = _tenant_picker(SessionLocal, key="aisim")
        render_ai_simulator_tab(SessionLocal, tenant)
    with tab_voice:
        tenant, _ = _tenant_picker(SessionLocal, key="voice")
        render_brand_voice_tab(SessionLocal, tenant)

    _history_section(SessionLocal)


if __name__ == "__main__":
    main()
