"""Dashboard 탭 — 셋팅 데이터 노출 현황.

상단 KPI 4개 + 엔진별 누적 노출 + 일자별 트렌드 + 엔진별 상세 표 + 종합 보고.

⚠️ 이전 mock 흐름은 모두 제거. 모든 차트/표는 Mention/Response/Query 실측에
연결되어 있고, 데이터 0건이면 빈 상태 카드로 측정 탭으로 안내한다.

데이터 정의:
- 노출 (exposure) = target brand 가 등장한 Response 수 (응답 단위, distinct).
- 점유율 (share)   = 엔진의 노출 수 / 전체 엔진 노출 합.
- 노출률 (rate)   = 엔진의 노출 수 / 엔진의 총 응답 수.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd
import streamlit as st
from sqlalchemy import distinct, func

from src.content.tenant_context import calculate_health_score
from src.dashboard.theme import kpi_strip
from src.storage.models import GeneratedContent, Mention, Query, Response

# 강남언니 핑크 (브랜드) — 차트 통일 색상
_BRAND = "#1B68FF"
_BRAND_SOFT = "#FFA0AE"

# Engine ID → 사용자가 알아보는 라벨
_ENGINE_LABEL = {
    "openai": "ChatGPT",
    "openai_search": "ChatGPT",
    "stub": "ChatGPT (데모)",
    "perplexity": "Perplexity",
    "anthropic": "Claude",
    "claude": "Claude",
    "gemini": "Gemini",
    "google": "Gemini",
}


def _label(engine_id: str) -> str:
    return _ENGINE_LABEL.get(engine_id, engine_id.title())


def _exposure_by_engine_day(SessionLocal, tenant_id: int, days: int) -> pd.DataFrame:
    """엔진×일자 별 노출(target 멘션 응답) 수.

    같은 응답에 target 멘션이 여러 개 있어도 노출은 1로 센다 (distinct response_id).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with SessionLocal() as s:
        rows = (
            s.query(
                Query.engine.label("engine"),
                func.date(Response.created_at).label("day"),
                func.count(distinct(Mention.response_id)).label("exposure"),
            )
            .join(Response, Response.query_id == Query.id)
            .join(Mention, Mention.response_id == Response.id)
            .filter(
                Query.tenant_id == tenant_id,
                Mention.is_target.is_(True),
                Response.created_at >= cutoff,
            )
            .group_by(Query.engine, func.date(Response.created_at))
            .all()
        )
    if not rows:
        return pd.DataFrame(columns=["date", "engine", "exposure"])
    return pd.DataFrame(
        [
            {"date": pd.to_datetime(r.day).date(), "engine": _label(r.engine), "exposure": int(r.exposure)}
            for r in rows
        ]
    )


def _engine_summary(SessionLocal, tenant_id: int, days: int) -> pd.DataFrame:
    """엔진 단위 — 응답 수, 노출 수, 노출률, 점유율."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with SessionLocal() as s:
        resp_rows = (
            s.query(Query.engine.label("engine"), func.count(Response.id).label("n"))
            .join(Response, Response.query_id == Query.id)
            .filter(Query.tenant_id == tenant_id, Response.created_at >= cutoff)
            .group_by(Query.engine)
            .all()
        )
        exp_rows = (
            s.query(
                Query.engine.label("engine"),
                func.count(distinct(Mention.response_id)).label("n"),
            )
            .join(Response, Response.query_id == Query.id)
            .join(Mention, Mention.response_id == Response.id)
            .filter(
                Query.tenant_id == tenant_id,
                Mention.is_target.is_(True),
                Response.created_at >= cutoff,
            )
            .group_by(Query.engine)
            .all()
        )
    resp_map = {r.engine: int(r.n) for r in resp_rows}
    exp_map = {r.engine: int(r.n) for r in exp_rows}
    if not resp_map:
        return pd.DataFrame(columns=["엔진", "응답 수", "노출 수", "노출률 (%)", "점유율 (%)"])

    total_exp = sum(exp_map.values()) or 1
    rows = []
    for engine, n_resp in sorted(resp_map.items(), key=lambda x: -exp_map.get(x[0], 0)):
        n_exp = exp_map.get(engine, 0)
        rows.append(
            {
                "엔진": _label(engine),
                "응답 수": n_resp,
                "노출 수": n_exp,
                "노출률 (%)": round(n_exp / n_resp * 100, 1) if n_resp else 0.0,
                "점유율 (%)": round(n_exp / total_exp * 100, 1),
            }
        )
    return pd.DataFrame(rows)


def render_dashboard_tab(SessionLocal, tenant) -> None:
    st.markdown(
        f"""
        <div class="gsd-tab-heading">
          <div class="gsd-tab-heading-left">
            <h3>📊 셋팅 데이터 노출 현황</h3>
            <p><b>{tenant.name}</b> · AI 검색엔진 노출 추세 + 데이터 피딩 효과</p>
          </div>
          <span class="gsd-chip gsd-chip-blue">실시간 KPI</span>
        </div>
        """,
        unsafe_allow_html=True,
    )

    days = 14

    with SessionLocal() as session:
        health = calculate_health_score(session, tenant.id)
        total_published = (
            session.query(GeneratedContent)
            .filter(GeneratedContent.tenant_id == tenant.id)
            .count()
        )

    # 실측 데이터 조회 (KPI 계산에 필요)
    df_day = _exposure_by_engine_day(SessionLocal, tenant.id, days=days)
    df_engine = _engine_summary(SessionLocal, tenant.id, days=days)

    total_responses = int(df_engine["응답 수"].sum()) if not df_engine.empty else 0
    total_exposures = int(df_engine["노출 수"].sum()) if not df_engine.empty else 0
    real_exposure_rate = (
        round(total_exposures / total_responses * 100, 1) if total_responses else 0.0
    )

    # 상단 KPI 4개 — 노출률은 이제 실측 (응답 N건 중 등장 X건)
    score = health["score"]
    grade = "A" if score >= 80 else ("B" if score >= 60 else ("C" if score >= 40 else "D"))
    n_total = health["doctors"][0] + health["equipment"][0] + health["events"][1]

    if total_responses > 0:
        rate_label = f"{real_exposure_rate}%"
        rate_caption = f"응답 {total_responses}건 중 {total_exposures}건 등장"
    else:
        rate_label = "—"
        rate_caption = "측정 데이터 없음"

    st.markdown(
        kpi_strip(
            [
                ("🎯", "데이터 건강 점수", f"{score}/100", f"등급 {grade}"),
                ("📤", "총 발행 콘텐츠", f"{total_published}건", "누적"),
                ("🔍", "AI 응답 노출률", rate_label, rate_caption),
                (
                    "🏷️",
                    "활성 데이터",
                    f"{n_total}건",
                    f"의사 {health['doctors'][0]} · 장비 {health['equipment'][0]} · 이벤트 {health['events'][1]}",
                ),
            ]
        ),
        unsafe_allow_html=True,
    )

    # 데이터 부재 시 안내
    if not health["doctors"][0] and not health["equipment"][0] and not health["events"][1]:
        st.info(
            "💡 **데이터 피딩이 비어 있습니다.** 위 `🎯 대상 정보 관리` 탭에서 "
            "의사/장비/이벤트를 입력하면 AI 검색엔진 인용도가 크게 올라갑니다."
        )

    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)

    # ─── 엔진별 누적 + 일자별 트렌드 ─────────────────────────────
    col_left, col_right = st.columns([1, 1])
    with col_left:
        st.markdown(f"#### 🤖 엔진별 누적 노출 (지난 {days}일)")
        st.caption(
            "내 브랜드(target)가 등장한 응답 수를 엔진별로 집계. "
            "측정 탭의 활성 키워드 기준."
        )
        if df_engine.empty or total_exposures == 0:
            _empty_state("아직 측정 데이터가 없어요.", show_to_measure=True)
        else:
            engine_bar = (
                df_engine[["엔진", "노출 수"]]
                .rename(columns={"노출 수": "노출"})
                .set_index("엔진")
            )
            st.bar_chart(engine_bar, height=260, color=_BRAND)

    with col_right:
        st.markdown("#### 📈 일자별 노출 트렌드")
        st.caption("위와 동일 기준 — 일자별 합계.")
        if df_day.empty:
            _empty_state("아직 측정 데이터가 없어요.", show_to_measure=False)
        else:
            trend = (
                df_day.groupby("date", as_index=False)["exposure"]
                .sum()
                .rename(columns={"exposure": "총 노출"})
                .set_index("date")
            )
            st.line_chart(trend, height=260, color=_BRAND)

    # ─── 엔진별 상세 표 ─────────────────────────────────────────
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📋 엔진별 상세")
    st.caption(
        "**응답 수** = 등록 키워드로 엔진을 호출한 횟수 · "
        "**노출 수** = 응답 안에 내 브랜드가 등장한 응답 수 · "
        "**노출률** = 노출/응답 · "
        "**점유율** = 엔진 노출 / 전체 엔진 노출 합."
    )
    if df_engine.empty:
        _empty_state(
            "엔진 응답이 아직 없습니다.", show_to_measure=True,
        )
    else:
        st.dataframe(
            df_engine,
            use_container_width=True,
            hide_index=True,
            column_config={
                "노출률 (%)": st.column_config.ProgressColumn(
                    "노출률 (%)", min_value=0, max_value=100, format="%.1f%%",
                ),
                "점유율 (%)": st.column_config.ProgressColumn(
                    "점유율 (%)", min_value=0, max_value=100, format="%.1f%%",
                ),
            },
        )

    # 종합 보고
    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)
    st.markdown("#### 📄 종합 보고")
    summary_text = _generate_summary(
        tenant, health, total_published,
        total_responses=total_responses,
        total_exposures=total_exposures,
        rate=real_exposure_rate,
    )
    st.markdown(
        f"""
        <div style="background:#fafafa;padding:18px 22px;border-radius:12px;
                    border:1px solid #eee;font-size:13px;line-height:1.7;color:#333;">
          {summary_text}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _empty_state(message: str, *, show_to_measure: bool) -> None:
    """차트/표 자리에 들어가는 빈 상태 카드. 측정 탭 안내 옵션."""
    body = f"📭 {message}"
    if show_to_measure:
        body += " 옆 **`📡 측정`** 탭에서 키워드를 등록하고 ▶️ 수집을 실행하면 곧바로 채워집니다."
    st.markdown(
        f"""
        <div style="height:240px;display:flex;align-items:center;justify-content:center;
                    background:#fafafa;border:1px dashed #e5e7eb;border-radius:12px;
                    color:#6b7280;font-size:13.5px;text-align:center;padding:24px;">
          {body}
        </div>
        """,
        unsafe_allow_html=True,
    )


def _generate_summary(
    tenant, health: dict, total_published: int,
    *,
    total_responses: int = 0,
    total_exposures: int = 0,
    rate: float = 0.0,
) -> str:
    """건강 점수 + 발행 + 실측 노출률을 묶은 텍스트 보고."""
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
        chunks.append("**✨ 콘텐츠 발행** 탭에서 첫 콘텐츠를 발행해보세요.")

    if total_responses > 0:
        chunks.append(
            f"최근 14일 측정 — 엔진 응답 <b>{total_responses}건</b> 중 "
            f"내 브랜드가 <b>{total_exposures}건({rate}%)</b> 등장했습니다."
        )
    else:
        chunks.append(
            "최근 14일 측정 데이터가 없습니다. **📡 측정** 탭에서 키워드를 등록하고 "
            "▶️ 수집을 실행하면 위 차트가 자동으로 채워집니다."
        )

    return " ".join(chunks)
