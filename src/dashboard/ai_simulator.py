"""AI 시뮬레이터 탭 — ChatGPT / Claude / Gemini 동시 호출 비교.

각 엔진에 같은 질문을 동시 호출하고 3-column으로 답변/길이/응답시간 표시.
키 없는 엔진은 stub 응답으로 fallback (UI 시연 가능).

데이터 피딩(tenant 사실 정보) ON/OFF 토글로 콘텐츠 인용도 변화 확인.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass

import streamlit as st

from src.content.simulator import simulate_response
from src.content.tenant_context import build_tenant_context_block
from src.storage.models import Tenant


# ─── 엔진 메타 ──────────────────────────────────────────────────


@dataclass
class EngineSpec:
    name: str          # "gemini" | "anthropic" | "openai"
    label: str         # "Gemini" | "Claude" | "ChatGPT"
    color: str         # 카드 색
    emoji: str
    env_var: str
    stub_text: str  # 키 없을 때 fallback 응답


_ENGINES = [
    EngineSpec(
        name="openai",
        label="ChatGPT",
        color="#10a37f",
        emoji="🤖",
        env_var="OPENAI_API_KEY",
        stub_text=(
            "라식 수술은 시력교정에 효과적인 방법으로, **각막을 일부 깎아** "
            "굴절률을 조정하는 시술입니다. 일반적으로 **1~3일** 내에 일상 복귀가 가능하지만, "
            "회복 속도는 개인차가 있을 수 있습니다. 시술 전 정밀 검사를 통해 본인의 눈 상태를 "
            "확인하시고, 안과 전문의와 충분한 상담 후 결정하시는 것을 권장합니다. "
            "✅ 효과와 부작용은 개인차가 있을 수 있습니다."
        ),
    ),
    EngineSpec(
        name="anthropic",
        label="Claude",
        color="#d97757",
        emoji="🟠",
        env_var="ANTHROPIC_API_KEY",
        stub_text=(
            "🩺 라식 수술 후 회복은 **시술 종류와 개인의 회복 속도**에 따라 차이가 있습니다. "
            "일반적으로 일상 복귀까지 1~3일, 안정화까지는 약 1~3개월이 소요되는 것으로 안내됩니다. "
            "회복기 동안 컴퓨터 사용은 단시간으로 제한하고, 인공눈물을 자주 사용해 안구 건조를 예방하세요. "
            "정기 경과 관찰을 통해 의료진의 안내를 따르시고, **결과는 개인차가 있을 수 있다**는 점을 "
            "기억하시기 바랍니다."
        ),
    ),
    EngineSpec(
        name="gemini",
        label="Gemini",
        color="#4285f4",
        emoji="✨",
        env_var="GOOGLE_API_KEY",
        stub_text=(
            "💡 라식 시술 후 일주일은 **안정 회복기**로, 컴퓨터 사용은 1일 4~5시간 이내로 제한하시는 "
            "것을 권장합니다. 인공눈물 사용을 자주 하시고, 화면 밝기를 낮추세요. "
            "시술 후 정기 검진을 통해 회복 상태를 확인하는 것이 중요하며, "
            "이상 증상(통증, 시야 흐림 등) 발생 시 즉시 병원 문의를 권장드립니다. "
            "결과는 개인의 눈 상태에 따라 차이가 있을 수 있습니다."
        ),
    ),
]


def _key_set(engine: EngineSpec) -> bool:
    return bool(os.getenv(engine.env_var))


# ─── 단일 엔진 호출 ─────────────────────────────────────────────


def _call_engine(engine: EngineSpec, question: str, tenant: Tenant, tenant_data_block: str) -> dict:
    """엔진에 질문을 보내고 결과 반환. 키 없으면 stub."""
    start = time.perf_counter()
    text = ""
    error = None
    is_real = False

    if not _key_set(engine):
        # Stub fallback
        text = engine.stub_text
        if tenant_data_block:
            text = (
                f"[{tenant.name}의 김시력 전문의(15년 경력) · 아마리스 레드 1050RS 장비 운영 · "
                f"스마일 라식 특별 할인(189만원, ~2026.08.31) 진행 중]\n\n"
                + text
            )
    else:
        is_real = True
        try:
            from src.content.simulator import (
                _build_simulator_user_prompt,
                _simulate_anthropic,
                _simulate_gemini,
                _simulate_openai,
            )

            prompt = _build_simulator_user_prompt(question, tenant, tenant_data_block)
            if engine.name == "gemini":
                text = _simulate_gemini(prompt)
            elif engine.name == "anthropic":
                text = _simulate_anthropic(prompt)
            elif engine.name == "openai":
                text = _simulate_openai(prompt)
        except Exception as e:
            error = str(e)
            text = engine.stub_text

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return {
        "engine": engine,
        "text": text,
        "elapsed_ms": elapsed_ms,
        "error": error,
        "is_real": is_real,
        "char_count": len(text),
    }


def _render_engine_card(result: dict, needles: list[str]) -> None:
    """엔진별 응답 카드."""
    engine: EngineSpec = result["engine"]
    text = result["text"]
    elapsed = result["elapsed_ms"]
    is_real = result["is_real"]

    # 인용 카운트
    cites = sum(1 for n in needles if n and n in text)

    badge_color = "green" if is_real else "yellow"
    badge_label = "실시간 호출" if is_real else "Mock (키 미설정)"

    st.markdown(
        f"""
        <div style="background:white;padding:14px 18px;border-radius:12px;
                    border:1px solid #eaeaea;border-top:4px solid {engine.color};
                    height:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;
                      margin-bottom:10px;">
            <span style="font-weight:700;font-size:16px;">
              {engine.emoji} {engine.label}
            </span>
            <span class="gsd-chip gsd-chip-{badge_color}">{badge_label}</span>
          </div>
          <div style="font-size:13px;color:#222;line-height:1.65;
                      white-space:pre-wrap;min-height:200px;">{text}</div>
          <div style="margin-top:12px;display:flex;gap:12px;font-size:11px;color:#666;
                      border-top:1px solid #eee;padding-top:10px;">
            <span>📏 {result['char_count']}자</span>
            <span>⏱️ {elapsed}ms</span>
            <span>📌 사실 인용 {cites}개</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if result.get("error"):
        st.caption(f"⚠️ {engine.label} 호출 실패: {result['error']}")


# ─── 진입점 ─────────────────────────────────────────────────────


_DEFAULT_QUESTIONS = [
    "라식 수술 후 회복 기간은 얼마나 걸리나요?",
    "강남에서 라식 잘하는 안과 추천해주세요",
    "각막이 얇은데 시력교정 가능한가요?",
    "라식과 라섹 중 어떤 게 더 안전한가요?",
    "라식 수술 비용은 보통 얼마인가요?",
]


def render_ai_simulator_tab(SessionLocal, tenant) -> None:
    st.markdown("### 🧪 AI 응답 시뮬레이터")
    st.caption(
        "동일 질문을 ChatGPT / Claude / Gemini 세 엔진에 동시 호출해 답변을 비교하세요. "
        "데이터 피딩 ON/OFF로 사실 인용도 변화를 확인할 수 있습니다."
    )

    # 키 상태 표시
    chips = []
    for eng in _ENGINES:
        ok = _key_set(eng)
        chips.append(
            f'<span class="gsd-chip gsd-chip-{"green" if ok else "gray"}">'
            f'{eng.emoji} {eng.label} {"✓" if ok else "Mock"}</span>'
        )
    st.markdown(" ".join(chips), unsafe_allow_html=True)

    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)

    # 질문 입력
    sample_q = st.selectbox(
        "샘플 질문",
        _DEFAULT_QUESTIONS,
        key=f"ais_sample_{tenant.id}",
    )
    custom_q = st.text_input(
        "또는 직접 입력",
        value="",
        placeholder="예: 라식 수술 후 운전 가능한가요?",
        key=f"ais_custom_{tenant.id}",
    )
    question = custom_q.strip() or sample_q

    col_t, col_b1, col_b2 = st.columns([2, 1, 1])
    with col_t:
        with_feed = st.toggle(
            "데이터 피딩 사용 (의사/장비/이벤트 사실 주입)",
            value=True,
            key=f"ais_feed_{tenant.id}",
            help="ON: tenant 정보를 LLM 컨텍스트로 주입. OFF: 일반 답변.",
        )
    with col_b1:
        run = st.button("⚡ 3엔진 호출", type="primary", key=f"ais_run_{tenant.id}", use_container_width=True)
    with col_b2:
        st.caption(f"질문: {question[:40]}{'...' if len(question) > 40 else ''}")

    if not run:
        return

    # tenant_data_block 미리 빌드
    with SessionLocal() as session:
        from src.storage.models import Doctor, Equipment, EventOffer, Tenant

        t = session.get(Tenant, tenant.id)
        if not t:
            st.error("Tenant fetch 실패")
            return
        if with_feed:
            data_block = build_tenant_context_block(session, tenant.id)
        else:
            data_block = ""

        # 인용 needle 추출
        needles = []
        needles.extend(
            d.name
            for d in session.query(Doctor)
            .filter(Doctor.tenant_id == tenant.id, Doctor.is_active.is_(True))
            .all()
        )
        needles.extend(
            e.name
            for e in session.query(Equipment)
            .filter(Equipment.tenant_id == tenant.id, Equipment.is_active.is_(True))
            .all()
        )
        needles.extend(
            ev.name
            for ev in session.query(EventOffer)
            .filter(EventOffer.tenant_id == tenant.id, EventOffer.is_active.is_(True))
            .all()
        )

    progress = st.progress(0.0, text="3엔진 호출 시작...")
    results = []
    for i, eng in enumerate(_ENGINES, 1):
        progress.progress((i - 1) / len(_ENGINES), text=f"{eng.label} 호출 중...")
        results.append(_call_engine(eng, question, t, data_block))
    progress.progress(1.0, text="완료 ✓")
    progress.empty()

    # 3-column 카드
    cols = st.columns(3, gap="medium")
    for col, result in zip(cols, results):
        with col:
            _render_engine_card(result, needles)

    # 종합 통계
    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📊 종합 통계")
    m1, m2, m3, m4 = st.columns(4)

    avg_chars = int(sum(r["char_count"] for r in results) / len(results))
    m1.metric("평균 응답 길이", f"{avg_chars}자")

    avg_ms = int(sum(r["elapsed_ms"] for r in results) / len(results))
    m2.metric("평균 응답 시간", f"{avg_ms}ms")

    total_cites = sum(
        sum(1 for n in needles if n and n in r["text"]) for r in results
    )
    max_possible = len(needles) * len(results) or 1
    m3.metric("총 사실 인용", f"{total_cites}/{max_possible}")

    real_calls = sum(1 for r in results if r["is_real"])
    m4.metric("실시간 호출", f"{real_calls}/{len(results)}", help="키 설정된 엔진 수")

    st.caption(
        f"💡 **사실 인용 needles** ({len(needles)}개): "
        + ", ".join(f"`{n}`" for n in needles[:5])
        + (f" 외 {len(needles) - 5}개" if len(needles) > 5 else "")
    )
