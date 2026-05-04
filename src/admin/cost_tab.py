"""💸 비용 — LLM USD × 테넌트 일/주/월 합산 + 글로벌 가드레일. Phase 9-02."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import streamlit as st


def render_cost_tab(SessionLocal) -> None:
    from src.storage.models import LlmCallLog, Tenant

    st.markdown("### 💸 LLM 비용 대시보드")
    st.caption(
        "모든 테넌트의 LLM 호출 비용을 일/주/월 단위로 합산. "
        "테넌트별 가드레일 + 글로벌 `MAX_DAILY_USD` 환경변수 표시."
    )

    # ─── 글로벌 가드레일 ─────────────────────────────────────
    col_a, col_b, col_c = st.columns(3)
    max_daily = float(os.environ.get("MAX_DAILY_USD", "10.0"))
    col_a.metric("MAX_DAILY_USD", f"${max_daily:.2f}")
    col_b.metric(
        "MAX_CONTENT_GEN_PER_DAY",
        os.environ.get("MAX_CONTENT_GEN_PER_DAY", "—"),
    )

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    with SessionLocal() as s:
        tenants = s.query(Tenant).order_by(Tenant.id).all()
        rows: list[dict] = []
        total_today = total_week = total_month = 0.0
        for t in tenants:
            day_logs = s.query(LlmCallLog).filter(
                LlmCallLog.tenant_id == t.id,
                LlmCallLog.created_at >= today_start,
            ).all()
            week_logs = s.query(LlmCallLog).filter(
                LlmCallLog.tenant_id == t.id,
                LlmCallLog.created_at >= week_start,
            ).all()
            month_logs = s.query(LlmCallLog).filter(
                LlmCallLog.tenant_id == t.id,
                LlmCallLog.created_at >= month_start,
            ).all()
            day_usd = sum((l.cost_usd or 0.0) for l in day_logs)
            week_usd = sum((l.cost_usd or 0.0) for l in week_logs)
            month_usd = sum((l.cost_usd or 0.0) for l in month_logs)
            total_today += day_usd
            total_week += week_usd
            total_month += month_usd
            rows.append({
                "tenant_id": t.id,
                "name": t.name,
                "today_usd": round(day_usd, 4),
                "week_usd": round(week_usd, 4),
                "month_usd": round(month_usd, 4),
                "today_calls": len(day_logs),
                "month_calls": len(month_logs),
                "today_pct_of_cap": (
                    round(day_usd / max_daily * 100, 1) if max_daily > 0 else 0.0
                ),
            })

    col_c.metric("전체 오늘 USD", f"${total_today:.4f}")
    st.markdown(f"**전체 7일 USD**: ${total_week:.4f} · **30일 USD**: ${total_month:.4f}")

    if rows:
        st.markdown("#### 테넌트별 비용")
        st.dataframe(
            rows,
            use_container_width=True,
            column_config={
                "tenant_id": st.column_config.NumberColumn("ID", width="small"),
                "name": st.column_config.TextColumn("테넌트", width="medium"),
                "today_usd": st.column_config.NumberColumn("오늘 USD", format="$%.4f"),
                "week_usd": st.column_config.NumberColumn("7일 USD", format="$%.4f"),
                "month_usd": st.column_config.NumberColumn("30일 USD", format="$%.4f"),
                "today_calls": st.column_config.NumberColumn("오늘 호출", width="small"),
                "month_calls": st.column_config.NumberColumn("30일 호출", width="small"),
                "today_pct_of_cap": st.column_config.NumberColumn(
                    "오늘 / Cap (%)", format="%.1f%%",
                ),
            },
            hide_index=True,
        )
    else:
        st.info("LLM 호출 이력이 없습니다.")

    with st.expander("⚙️ 환경변수 안내", expanded=False):
        st.markdown(
            """
            **Streamlit Cloud Secrets 키:**
            - `MAX_DAILY_USD` — 모든 테넌트 합산 1일 USD 상한 (기본 10.0)
            - `MAX_CONTENT_GEN_PER_DAY` — 1일 콘텐츠 생성 호출 수 상한

            가드레일은 `src/content/cost.py` 의 `check_daily_usd_budget()` 가
            매 호출 전에 사전 체크합니다. 초과 시 `CostGuardrailExceeded` 예외 — 호출 차단.
            """
        )
