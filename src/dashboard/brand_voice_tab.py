"""Brand Voice 탭 — persona.png 레퍼런스 형태.

응답 톤(전문/친근/간결/상세) + 브랜드 핵심 가치 + 커뮤니케이션 스타일.
설정 시 LLM 시스템 프롬프트에 자동 주입되어 모든 콘텐츠 톤이 일관되게 됨.
"""

from __future__ import annotations

import os

import streamlit as st

from src.content.simulator import simulate_response
from src.storage.models import BrandVoice, Tenant


_TONES = [
    ("전문적", "🎓", "신뢰성 있고 정확한 어조 — 의료진 입장"),
    ("친근함", "💛", "따뜻하고 편안한 어조 — 1인칭 \"저희\""),
    ("간결함", "⚡", "핵심만 빠르게 — 짧은 문장 위주"),
    ("상세함", "📚", "자세하고 구체적 — 단계별 설명"),
]


def _get_or_create(session, tenant_id: int) -> BrandVoice:
    """tenant 의 BrandVoice 1행 보장. race / stale cache 시나리오에서도 안전하게 동작.

    rare 케이스: query → None 인데 INSERT 시점에 다른 트랜잭션 (Streamlit rerun /
    Postgres 영속 DB 등) 이 같은 tenant_id 의 row 를 이미 만들어둔 경우 UNIQUE 위반.
    이때 rollback 후 재조회로 복구. 정의서 §3 의 BrandVoice.tenant_id UNIQUE 가 이미
    데이터 무결성을 보장하므로 사용자에게 노출되는 에러는 없게 한다.
    """
    from sqlalchemy.exc import IntegrityError

    bv = (
        session.query(BrandVoice)
        .filter(BrandVoice.tenant_id == tenant_id)
        .one_or_none()
    )
    if bv is not None:
        return bv

    bv = BrandVoice(tenant_id=tenant_id, tone="전문적")
    session.add(bv)
    try:
        session.commit()
        session.refresh(bv)
        return bv
    except IntegrityError:
        session.rollback()
        existing = (
            session.query(BrandVoice)
            .filter(BrandVoice.tenant_id == tenant_id)
            .one_or_none()
        )
        if existing is not None:
            return existing
        # 둘 다 실패하면 메모리 인스턴스로 폴백 (UI 가 죽지 않도록)
        return BrandVoice(tenant_id=tenant_id, tone="전문적")


def _render_tone_picker(current_tone: str) -> str:
    """4-column 톤 카드. 선택된 카드 하이라이트."""
    cols = st.columns(4)
    selected = current_tone

    for col, (tone, emoji, desc) in zip(cols, _TONES):
        is_sel = tone == current_tone
        bg = "#e7eefb" if is_sel else "#fafafa"
        border = "#5b8ff9" if is_sel else "#eee"
        with col:
            st.markdown(
                f"""
                <div style="background:{bg};padding:14px 16px;border-radius:12px;
                            border:2px solid {border};min-height:130px;">
                  <div style="font-size:22px;margin-bottom:6px;">{emoji}</div>
                  <div style="font-weight:700;font-size:15px;margin-bottom:4px;">{tone}</div>
                  <div style="font-size:11px;color:#666;line-height:1.4;">{desc}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button(
                "✓ 선택" if is_sel else "선택",
                key=f"bv_tone_{tone}",
                use_container_width=True,
                type="primary" if is_sel else "secondary",
                disabled=is_sel,
            ):
                selected = tone

    return selected


def render_brand_voice_tab(SessionLocal, tenant) -> None:
    st.markdown("### 🎨 브랜드 보이스 설정")
    st.caption(
        f"AI가 **{tenant.name}**의 브랜드에 일관된 톤으로 응답하도록 설정하세요. "
        "설정값은 모든 FAQ/블로그 발행 시 LLM 시스템 프롬프트에 자동 주입됩니다."
    )

    with SessionLocal() as session:
        bv = _get_or_create(session, tenant.id)
        # detached snapshot
        snapshot = {
            "tone": bv.tone,
            "vision": bv.vision or "",
            "mission": bv.mission or "",
            "core_values": bv.core_values or "",
            "style_guide": bv.style_guide or "",
            "formality": bv.formality or "",
            "forbidden_words": bv.forbidden_words or "",
        }

    # 톤 선택
    st.markdown("#### 🎯 응답 톤 선택")
    new_tone = _render_tone_picker(snapshot["tone"])
    if new_tone != snapshot["tone"]:
        with SessionLocal() as session:
            obj = (
                session.query(BrandVoice).filter(BrandVoice.tenant_id == tenant.id).one()
            )
            obj.tone = new_tone
            session.commit()
        st.success(f"톤 변경: {new_tone}")
        st.rerun()

    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)

    # 브랜드 핵심 가치 + 커뮤니케이션 스타일
    col_a, col_b = st.columns(2)
    with col_a:
        with st.container(border=True):
            st.markdown("#### 🌟 브랜드 핵심 가치")
            with st.form("bv_values"):
                vision = st.text_area(
                    "비전 (장기 방향)",
                    value=snapshot["vision"],
                    height=70,
                    placeholder="예: 정확한 진단과 안전한 시술로 환자분께 더 나은 미래를 함께 만듭니다.",
                )
                mission = st.text_area(
                    "미션 (현재 활동)",
                    value=snapshot["mission"],
                    height=70,
                    placeholder="예: 정밀한 검사와 안전한 시술, 환자 만족도, 최신 장비",
                )
                core_values = st.text_area(
                    "핵심 가치",
                    value=snapshot["core_values"],
                    height=70,
                    placeholder="예: 안전, 정밀, 환자 중심",
                )
                save_v = st.form_submit_button("💾 핵심 가치 저장", type="primary", use_container_width=True)
            if save_v:
                with SessionLocal() as session:
                    obj = session.query(BrandVoice).filter(BrandVoice.tenant_id == tenant.id).one()
                    obj.vision = vision.strip() or None
                    obj.mission = mission.strip() or None
                    obj.core_values = core_values.strip() or None
                    session.commit()
                st.success("저장됨")
                st.rerun()

    with col_b:
        with st.container(border=True):
            st.markdown("#### 💬 커뮤니케이션 스타일")
            with st.form("bv_style"):
                style_guide = st.text_area(
                    "안내문 양식",
                    value=snapshot["style_guide"],
                    height=70,
                    placeholder="예: 환영하실 BGN 밝은눈안과입니다, 무엇을 도와드릴까요?",
                )
                formality = st.text_input(
                    "격식 / 단어 선호",
                    value=snapshot["formality"],
                    placeholder="예: 입니다 통일, 100% 보임, 환자 등 어휘",
                )
                forbidden = st.text_area(
                    "금지 단어 (콤마 구분)",
                    value=snapshot["forbidden_words"],
                    height=70,
                    placeholder="예: 100% 보장, 최고, 완치",
                    help="이미 의료법 린터가 잡지만 추가로 회피할 표현이 있으면.",
                )
                save_s = st.form_submit_button("💾 스타일 저장", type="primary", use_container_width=True)
            if save_s:
                with SessionLocal() as session:
                    obj = session.query(BrandVoice).filter(BrandVoice.tenant_id == tenant.id).one()
                    obj.style_guide = style_guide.strip() or None
                    obj.formality = formality.strip() or None
                    obj.forbidden_words = forbidden.strip() or None
                    session.commit()
                st.success("저장됨")
                st.rerun()

    # AI 응답 미리보기
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)
    st.markdown("#### 👀 AI 응답 미리보기")
    st.caption("브랜드 보이스 적용 전/후 차이를 확인하세요. 같은 질문, 같은 데이터 피딩.")

    sample_q = st.text_input(
        "미리보기 질문",
        value="라식 수술 예약은 어떻게 하나요?",
        key="bv_preview_q",
    )
    if st.button("🔁 미리보기 생성", type="primary", key="bv_preview_run"):
        with st.spinner("브랜드 보이스 적용 전/후 비교 중..."):
            # before — brand voice 비활성으로 호출 (기본 system prompt만)
            with SessionLocal() as session:
                t = session.get(Tenant, tenant.id)
                # 임시로 brand voice를 비워서 호출
                bv_obj = session.query(BrandVoice).filter(BrandVoice.tenant_id == tenant.id).one()
                # snapshot 후 임시 무력화
                saved = (bv_obj.tone, bv_obj.vision, bv_obj.mission, bv_obj.core_values, bv_obj.style_guide)
                bv_obj.tone = ""
                bv_obj.vision = None
                bv_obj.mission = None
                bv_obj.core_values = None
                bv_obj.style_guide = None
                session.flush()  # 일시적
                before = simulate_response(session, t, sample_q, with_feed=True)
                # 복원
                bv_obj.tone = saved[0]
                bv_obj.vision = saved[1]
                bv_obj.mission = saved[2]
                bv_obj.core_values = saved[3]
                bv_obj.style_guide = saved[4]
                session.commit()

                after = simulate_response(session, t, sample_q, with_feed=True)

        col_x, col_y = st.columns(2)
        with col_x:
            st.markdown(
                f"""
                <div style="background:#fff3f3;padding:14px 18px;border-radius:12px;
                            border:1px solid #f4cccc;">
                  <div style="font-weight:700;color:#a02520;margin-bottom:8px;">설정 전 응답</div>
                  <div style="font-size:13px;color:#444;line-height:1.6;
                              white-space:pre-wrap;">{before.text}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        with col_y:
            st.markdown(
                f"""
                <div style="background:#f0fbf3;padding:14px 18px;border-radius:12px;
                            border:1px solid #c2e8cf;">
                  <div style="font-weight:700;color:#1e7a3d;margin-bottom:8px;">설정 후 응답</div>
                  <div style="font-size:13px;color:#222;line-height:1.6;
                              white-space:pre-wrap;">{after.text}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # 적용 상태
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)
    with st.container(border=True):
        st.markdown("**✅ 적용 상태 (LLM 시스템 프롬프트에 자동 주입)**")
        with SessionLocal() as session:
            obj = session.query(BrandVoice).filter(BrandVoice.tenant_id == tenant.id).one_or_none()
            if obj:
                block = obj.to_prompt_block()
                if block:
                    st.code(block, language=None)
                else:
                    st.caption("설정값 없음 — 위에서 톤/가치/스타일을 입력하세요.")
            else:
                st.caption("아직 설정되지 않았습니다.")
