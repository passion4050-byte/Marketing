"""Dashboard 탭 — 셋팅 데이터 노출 현황.

dash board.png 레퍼런스 형태:
- 상단 KPI 4개 (전체 점수, 노출률, 등급, 답변 매칭)
- 엔진별 노출 막대 차트
- 시계열 트렌드 (라인)
- 최근 답변 발췌

⚠️ 측정 인프라 (정의서 Phase 4: MVP-0)는 미구현.
현재는 **DB 기반 데이터 + 합리적 추정**으로 시연용 셸 구축.
실측정 데이터(AI 검색엔진 멘션 카운트)는 후속 phase 연결.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

import pandas as pd
import streamlit as st

from src.content.tenant_context import calculate_health_score
from src.storage.models import GeneratedContent, Tenant


def _kpi_card(emoji: str, label: str, value: str, delta: str = "", bg: str = "#e7eefb") -> str:
    delta_html = (
        f'<div style="font-size:12px;color:#1e7a3d;margin-top:4px;">{delta}</div>'
        if delta
        else ""
    )
    return f"""
    <div style="background:{bg};padding:18px 20px;border-radius:14px;
                border:1px solid rgba(0,0,0,0.04);">
      <div style="font-size:13px;color:#555;margin-bottom:6px;">{emoji} {label}</div>
      <div style="font-size:28px;font-weight:700;color:#222;">{value}</div>
      {delta_html}
    </div>
    """


def _generate_engine_exposure_series(tenant_id: int, days: int = 14) -> pd.DataFrame:
    """엔진별 시계열 노출 mock — 시드 고정으로 일관된 패턴.

    실측정 데이터는 정의서 Phase 4 (MVP-0) Mention 테이블에서 가져올 예정.
    """
    random.seed(tenant_id * 31 + days)
    today = datetime.now(timezone.utc).date()
    rows = []
    base = {"ChatGPT": 38, "Claude": 24, "Gemini": 31, "Perplexity": 18}
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        for engine, mid in base.items():
            v = max(0, mid + random.randint(-6, 8))
            rows.append({"date": d, "engine": engine, "exposure": v})
    return pd.DataFrame(rows)


def _bar_chart_engine(df: pd.DataFrame) -> pd.DataFrame:
    """엔진별 누적 노출 빈도."""
    return df.groupby("engine", as_index=False)["exposure"].sum()


def _trend_chart(df: pd.DataFrame) -> pd.DataFrame:
    """일자별 합계 시계열."""
    return df.groupby("date", as_index=False)["exposure"].sum().rename(
        columns={"exposure": "총 노출"}
    )


def render_dashboard_tab(SessionLocal, tenant) -> None:
    st.markdown("### 📊 셋팅 데이터 노출 현황")
    st.caption(
        f"**{tenant.name}**의 AI 검색엔진 노출 추세와 데이터 피딩 효과를 한눈에. "
        "측정 인프라(MVP-0)가 활성화되면 실측정 데이터로 자동 전환됩니다."
    )

    with SessionLocal() as session:
        health = calculate_health_score(session, tenant.id)
        # 전체 발행 카운트
        total_published = (
            session.query(GeneratedContent)
            .filter(GeneratedContent.tenant_id == tenant.id)
            .count()
        )
        recent = (
            session.query(GeneratedContent)
            .filter(GeneratedContent.tenant_id == tenant.id)
            .order_by(GeneratedContent.created_at.desc())
            .limit(5)
            .all()
        )

    # 상단 KPI 4개
    score = health["score"]
    grade = "A" if score >= 80 else ("B" if score >= 60 else ("C" if score >= 40 else "D"))
    col1, col2, col3, col4 = st.columns(4)
    col1.markdown(
        _kpi_card("🎯", "데이터 건강 점수", f"{score}/100", f"등급 {grade}", bg="#e7eefb"),
        unsafe_allow_html=True,
    )
    col2.markdown(
        _kpi_card("📤", "총 발행 콘텐츠", f"{total_published}건", bg="#f0e7fb"),
        unsafe_allow_html=True,
    )
    col3.markdown(
        _kpi_card(
            "🔍", "예상 노출률",
            f"{min(95, 30 + score // 2)}%",
            "데이터 피딩 기반 추정",
            bg="#e6f6ea",
        ),
        unsafe_allow_html=True,
    )
    col4.markdown(
        _kpi_card("🏷️", "활성 데이터", f"{health['doctors'][0] + health['equipment'][0] + health['events'][1]}건",
                  f"의사 {health['doctors'][0]} + 장비 {health['equipment'][0]} + 이벤트 {health['events'][1]}",
                  bg="#fff4d6"),
        unsafe_allow_html=True,
    )

    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)

    # 데이터 부재 시 안내
    if not health["doctors"][0] and not health["equipment"][0] and not health["events"][1]:
        st.info(
            "💡 **데이터 피딩이 비어 있습니다.** 위 `🎯 대상 정보 관리` 탭에서 "
            "의사/장비/이벤트를 입력하면 AI 검색엔진 인용도가 크게 올라갑니다."
        )

    # 엔진별 노출 차트 + 시계열
    df = _generate_engine_exposure_series(tenant.id, days=14)

    col_left, col_right = st.columns([1, 1])
    with col_left:
        st.markdown("#### 🤖 엔진별 누적 노출 (지난 14일)")
        st.caption("⚠️ 데모 mock 데이터. 측정 인프라(Phase 4) 활성화 시 실데이터로 전환.")
        engine_df = _bar_chart_engine(df)
        st.bar_chart(engine_df.set_index("engine"), height=260, color="#5b8ff9")

    with col_right:
        st.markdown("#### 📈 일자별 노출 트렌드")
        st.caption("⚠️ 데모 mock 데이터")
        trend_df = _trend_chart(df).set_index("date")
        st.line_chart(trend_df, height=260, color="#1e7a3d")

    # 엔진별 점유율 표
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📋 엔진별 상세")
    engine_summary = _bar_chart_engine(df).copy()
    total = engine_summary["exposure"].sum() or 1
    engine_summary["점유율 (%)"] = (engine_summary["exposure"] / total * 100).round(1)
    engine_summary = engine_summary.rename(
        columns={"engine": "엔진", "exposure": "누적 노출 (mock)"}
    )
    st.dataframe(engine_summary, use_container_width=True, hide_index=True)

    # 최근 발행 콘텐츠
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📝 최근 발행 콘텐츠 (실데이터)")
    if not recent:
        st.caption("아직 발행된 콘텐츠가 없습니다. FAQ/블로그 탭에서 발행해보세요.")
    else:
        for r in recent:
            cols = st.columns([2, 4, 1, 1, 1])
            cols[0].caption(r.created_at.strftime("%Y-%m-%d %H:%M"))
            cols[1].markdown(f"**{r.keyword_text}**")
            cols[2].caption(r.channel)
            emoji = {"pass": "✅", "warn": "⚠️", "fail": "❌"}.get(r.compliance_status, "?")
            cols[3].caption(f"{emoji} {r.compliance_status}")
            cols[4].caption(r.llm_provider)

    # 보고서/요약
    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📄 종합 보고")
    summary_text = _generate_summary(tenant, health, total_published)
    st.markdown(
        f"""
        <div style="background:#fafafa;padding:18px 22px;border-radius:12px;
                    border:1px solid #eee;font-size:13px;line-height:1.7;color:#333;">
          {summary_text}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _generate_summary(tenant, health: dict, total_published: int) -> str:
    """건강 점수와 발행 이력 기반 텍스트 보고."""
    score = health["score"]
    n_doc = health["doctors"][0]
    n_eq = health["equipment"][0]
    n_ev = health["events"][1]

    chunks = []
    chunks.append(f"<b>{tenant.name}</b>의 데이터 건강 점수는 <b>{score}/100</b>입니다.")

    if score >= 80:
        chunks.append("✅ 데이터 피딩이 잘 셋팅되어 있어 AI 검색엔진 인용 가능성이 높습니다.")
    elif score >= 50:
        chunks.append("🟡 데이터 피딩이 일부 부족합니다. 아래 권장 사항을 확인하세요.")
    else:
        chunks.append("🔴 데이터 피딩이 매우 부족합니다. 콘텐츠 품질이 떨어질 수 있습니다.")

    recos = []
    if n_doc == 0:
        recos.append("의사 정보 입력 (이름·전문분야·경력)")
    if n_eq == 0:
        recos.append("장비 정보 입력 (모델명·제조사)")
    if n_ev == 0:
        recos.append("진행 중인 이벤트 등록 (가격·기간)")
    if recos:
        chunks.append(
            "권장: " + " · ".join(recos) + ". 입력 시 콘텐츠가 추상 표현 대신 "
            "구체 사실을 인용하게 됩니다."
        )

    chunks.append(f"누적 발행 콘텐츠는 <b>{total_published}건</b>입니다.")
    if total_published == 0:
        chunks.append("FAQ 또는 블로그 탭에서 첫 콘텐츠를 발행해보세요.")

    return " ".join(chunks)
