"""Phase 4-T2.4 + T3.3 — 측정 (Measurement) 탭.

기능:
- 키워드 등록 / On-Off / 삭제
- "지금 수집" 버튼 — 빠른 데모용 (n=10)
- 최근 Response 카드 — text 미리보기 + cited URLs + 멘션 chip + snippet
- 스케줄러 상태 표시 (다음 실행 시간)

라이브 환경 한계:
- StubEngine 기본 동작 (PERPLEXITY_API_KEY 설정 시 perplexity 자동 사용)
- Streamlit Cloud 컨테이너 재시작 시 APScheduler 작업 유실 (정의서 명시)
"""

from __future__ import annotations

import asyncio

import streamlit as st


def _format_url_short(url: str | None, max_len: int = 50) -> str:
    if not url:
        return "(직접)"
    return url if len(url) <= max_len else url[: max_len - 1] + "…"


def render_measurement_tab(SessionLocal, tenant) -> None:
    # Lazy imports — Streamlit Cloud 캐시 회피
    try:
        from src.collector import collect_for_keyword
        from src.collector.scheduler import get_scheduled_jobs
        from src.engines import get_engine
        from src.storage.models import Keyword, Mention, Query, Response
    except ImportError as _ie:  # pragma: no cover
        st.error(f"측정 모듈 import 실패: `{_ie}`. APScheduler 미설치일 수 있습니다.")
        return

    st.markdown("### 📡 AI 검색 노출 측정 (Measurement)")
    st.caption(
        "키워드를 등록하면 AI 검색 엔진(Perplexity 등)에 동일 질의를 n=30회 보내 브랜드 멘션을 측정합니다. "
        "`PERPLEXITY_API_KEY` 미설정 시 StubEngine 으로 동작 (데모/테스트용)."
    )

    # 엔진 상태
    try:
        engine = get_engine()
        engine_label = f"`{engine.name}`"
    except Exception as e:
        engine_label = f"❌ {e}"

    # 스케줄 상태
    jobs = get_scheduled_jobs()
    if jobs:
        next_run = jobs[0].get("next_run") or "—"
        sched_label = f"🟢 등록됨 · 다음 실행 `{next_run}`"
    else:
        sched_label = "⚪ 비활성 (앱 부팅 시 자동 등록)"

    col_e, col_s = st.columns(2)
    col_e.markdown(f"**엔진**: {engine_label}")
    col_s.markdown(f"**스케줄**: {sched_label}")

    st.divider()

    # ─── 키워드 관리 ──────────────────────────────────────────
    st.markdown("##### 키워드 등록 / 활성화")

    with st.form("ref_kw_add", clear_on_submit=True):
        col_kw, col_brand, col_btn = st.columns([3, 2, 1])
        new_kw = col_kw.text_input("키워드", placeholder="예: 강남 라식 잘하는 곳")
        new_brand = col_brand.text_input(
            "타겟 브랜드 (비우면 테넌트명)", placeholder=tenant.name,
        )
        submit = col_btn.form_submit_button("➕ 추가", use_container_width=True)
        if submit and new_kw.strip():
            with SessionLocal() as s:
                s.add(Keyword(
                    tenant_id=tenant.id,
                    text=new_kw.strip(),
                    target_brand=(new_brand.strip() or tenant.name),
                    is_active=True,
                ))
                s.commit()
            st.success(f"키워드 추가: {new_kw.strip()}")
            st.rerun()

    with SessionLocal() as s:
        kws = (
            s.query(Keyword)
            .filter(Keyword.tenant_id == tenant.id)
            .order_by(Keyword.id.desc())
            .all()
        )
        kw_data = [(k.id, k.text, k.target_brand, k.is_active) for k in kws]

    if not kw_data:
        st.info("등록된 키워드가 없습니다. 위에서 추가하세요.")
        return

    for kid, text, brand, active in kw_data:
        with st.container(border=True):
            col_t, col_b, col_act, col_run, col_del = st.columns([4, 2, 1, 1, 1])
            col_t.markdown(f"**{text}**")
            col_b.caption(f"타겟: `{brand or tenant.name}`")
            new_active = col_act.toggle("활성", value=active, key=f"meas_active_{kid}")
            if new_active != active:
                with SessionLocal() as s:
                    s.query(Keyword).filter(Keyword.id == kid).update({"is_active": new_active})
                    s.commit()
                st.rerun()
            if col_run.button("▶️ 수집", key=f"meas_run_{kid}", use_container_width=True):
                _run_collect_now(SessionLocal, tenant.id, kid, n=10)
                st.rerun()
            if col_del.button("🗑️", key=f"meas_del_{kid}", use_container_width=True):
                with SessionLocal() as s:
                    s.query(Keyword).filter(Keyword.id == kid).delete()
                    s.commit()
                st.rerun()

    st.divider()

    # ─── 경쟁사 후보 검수 (Phase 6) ────────────────────────────
    _render_competitor_section(SessionLocal, tenant)

    st.divider()

    # ─── 키워드별 시계열 (Phase 5) ─────────────────────────────
    _render_timeseries_section(SessionLocal, tenant, kw_data)

    st.divider()

    # ─── 최근 Response 카드 ────────────────────────────────────
    st.markdown("##### 최근 응답 (직전 30건)")
    with SessionLocal() as s:
        rows = (
            s.query(Response, Query)
            .join(Query, Response.query_id == Query.id)
            .filter(Query.tenant_id == tenant.id)
            .order_by(Response.created_at.desc())
            .limit(30)
            .all()
        )
        recent = []
        for r, q in rows:
            mentions = (
                s.query(Mention)
                .filter(Mention.response_id == r.id)
                .order_by(Mention.position.asc())
                .all()
            )
            recent.append({
                "response_id": r.id,
                "query_id": q.id,
                "engine": q.engine,
                "keyword_text": q.prompt.split("\n", 1)[0].replace("키워드:", "").strip(),
                "sample_index": q.sample_index,
                "raw_text": r.raw_text,
                "cited_urls": r.cited_urls or [],
                "latency_ms": r.latency_ms,
                "created_at": r.created_at,
                "mentions": [
                    {"brand": m.brand, "is_target": m.is_target, "is_competitor": m.is_competitor,
                     "position": m.position, "snippet": m.context_snippet,
                     "sentiment": m.sentiment or "neutral"}
                    for m in mentions
                ],
            })

    if not recent:
        st.info("아직 수집된 응답이 없습니다. 위에서 ▶️ 수집 버튼을 눌러 보세요.")
        return

    for item in recent:
        with st.container(border=True):
            head_l, head_r = st.columns([4, 2])
            head_l.markdown(
                f"**`{item['engine']}`** · {item['keyword_text']} · #{item['sample_index']}"
            )
            mentions = item["mentions"]
            if mentions:
                target_count = sum(1 for m in mentions if m["is_target"])
                head_r.markdown(
                    f'<span class="gsd-chip gsd-chip-green">🟢 멘션 {target_count}건</span>'
                    + (
                        f' <span class="gsd-chip gsd-chip-blue">📎 출처 {len(item["cited_urls"])}</span>'
                        if item["cited_urls"]
                        else ""
                    ),
                    unsafe_allow_html=True,
                )
            else:
                head_r.markdown(
                    '<span class="gsd-chip gsd-chip-gray">⚪ 미멘션</span>',
                    unsafe_allow_html=True,
                )
            st.caption(
                f"latency `{item['latency_ms']}ms` · "
                f"{item['created_at'].strftime('%Y-%m-%d %H:%M:%S') if item['created_at'] else '—'}"
            )

            st.markdown(
                f"<div style='padding:10px 14px;background:#fafafa;border-radius:8px;font-size:13px;'>"
                f"{(item['raw_text'][:300] + '…') if len(item['raw_text']) > 300 else item['raw_text']}"
                f"</div>",
                unsafe_allow_html=True,
            )

            if mentions:
                # sentiment 분포 chip — Phase 6
                pos_n = sum(1 for m in mentions if m["sentiment"] == "positive")
                neg_n = sum(1 for m in mentions if m["sentiment"] == "negative")
                neu_n = sum(1 for m in mentions if m["sentiment"] == "neutral")
                if pos_n + neg_n + neu_n > 0:
                    st.markdown(
                        f'<span class="gsd-chip gsd-chip-green">🟢 긍정 {pos_n}</span> '
                        f'<span class="gsd-chip gsd-chip-gray">⚪ 중립 {neu_n}</span> '
                        f'<span class="gsd-chip gsd-chip-red">🔴 부정 {neg_n}</span>',
                        unsafe_allow_html=True,
                    )
                with st.expander(f"멘션 상세 ({len(mentions)}건)", expanded=False):
                    for m in mentions:
                        kind = (
                            "🎯 타겟" if m["is_target"]
                            else "🔵 경쟁사" if m["is_competitor"]
                            else "•"
                        )
                        sent_chip = {
                            "positive": '<span class="gsd-chip gsd-chip-green">긍정</span>',
                            "negative": '<span class="gsd-chip gsd-chip-red">부정</span>',
                            "neutral":  '<span class="gsd-chip gsd-chip-gray">중립</span>',
                        }.get(m["sentiment"], "")
                        st.markdown(
                            f"{kind} **{m['brand']}** {sent_chip} (위치 {m['position']}) — _{m['snippet']}_",
                            unsafe_allow_html=True,
                        )

            if item["cited_urls"]:
                with st.expander(f"출처 URL ({len(item['cited_urls'])}건)", expanded=False):
                    for u in item["cited_urls"]:
                        st.markdown(f"- {_format_url_short(u, 80)}")


def _run_collect_now(SessionLocal, tenant_id: int, keyword_id: int, n: int = 10) -> None:
    """UI 의 '지금 수집' 버튼 핸들러. n 만큼 빠른 수집."""
    from src.collector import collect_for_keyword
    from src.engines import get_engine
    from src.storage.models import Keyword

    with SessionLocal() as s:
        kw = s.get(Keyword, keyword_id)
        if kw is None:
            st.error("키워드를 찾을 수 없습니다.")
            return

    try:
        engine = get_engine()
    except Exception as e:
        st.error(f"엔진 초기화 실패: {e}")
        return

    with st.spinner(f"`{engine.name}` 로 n={n} 수집 중…"):
        try:
            result = asyncio.run(collect_for_keyword(
                SessionLocal, tenant_id, kw, engine, n_samples=n, concurrency=3,
            ))
        except Exception as e:
            st.error(f"수집 실패: {e}")
            return

    if result.guardrail_stopped:
        st.warning(
            f"🛑 비용 가드레일에 의해 중단 — 성공 {result.n_success}/{n_total_label(n)} · "
            f"멘션 {result.n_mentions}건. {result.error_msg}"
        )
    else:
        st.success(
            f"✅ 수집 완료 — 성공 {result.n_success}/{result.n_total} · "
            f"실패 {result.n_failed} · 멘션 {result.n_mentions}건"
        )


def n_total_label(n: int) -> str:
    return str(n)


# ─── Phase 5 — 시계열 + 추세 + 이상치 ──────────────────────────


def _render_timeseries_section(SessionLocal, tenant, kw_data) -> None:
    """키워드별 mention share 시계열 + Wilson CI + 추세 chip + 이상치 overlay."""
    if not kw_data:
        return

    try:
        import altair as alt
        import pandas as pd

        from src.analytics import (
            competitor_share,
            daily_mention_share_series,
            detect_anomalies,
            detect_trend,
            mention_share,
            wilson_ci,
        )
        from src.storage.models import Competitor
    except ImportError as _ie:  # pragma: no cover
        st.warning(f"분석 모듈 import 실패: `{_ie}`")
        return

    st.markdown("##### 📈 키워드별 시계열 (최근 30일)")

    # 키워드 선택 — kw_data: list[(id, text, brand, active)]
    options = {f"{text} [{kid}]": kid for kid, text, _b, _a in kw_data}
    label = st.selectbox(
        "키워드", list(options.keys()), key="meas_ts_kw",
    )
    keyword_id = options[label]
    keyword_text = label.rsplit(" [", 1)[0]

    days = st.slider("표시 기간 (일)", 7, 60, 30, key="meas_ts_days")

    with SessionLocal() as s:
        series = daily_mention_share_series(s, tenant.id, keyword_id, days=days)
        agg = mention_share(s, tenant.id, keyword_id)

    if not series:
        st.info("데이터가 없습니다. 위에서 ▶️ 수집 버튼으로 데이터를 모아보세요.")
        return

    # 시계열 → DataFrame
    df = pd.DataFrame([
        {
            "day": d.day.isoformat(),
            "share": d.share,
            "weighted_share": d.weighted_share,
            "n": d.n,
        }
        for d in series
    ])

    # Wilson CI 시계열 (각 날짜마다 n 기반)
    df["ci_lo"] = [wilson_ci(d.share, d.n)[0] if d.n > 0 else 0.0 for d in series]
    df["ci_hi"] = [wilson_ci(d.share, d.n)[1] if d.n > 0 else 0.0 for d in series]

    # 추세 + 이상치 (n>0 인 날의 share 만)
    nonzero = [d.share for d in series if d.n > 0]
    trend = detect_trend(nonzero) if nonzero else {
        "trend": "insufficient_data", "is_significant": False, "p_value": None, "tau": None,
        "n_points": 0,
    }
    anomalies = detect_anomalies([d.share for d in series])

    # 헤더 chip + KPI
    col_t, col_a, col_n = st.columns(3)
    col_t.markdown(_trend_chip_html(trend), unsafe_allow_html=True)
    col_a.markdown(_anomaly_chip_html(len(anomalies)), unsafe_allow_html=True)
    col_n.metric("누적 응답", agg["n"])

    col_s, col_w = st.columns(2)
    col_s.metric(
        "단순 share", f"{agg['share']:.1%}",
        help=f"95% CI: [{agg['ci_95'][0]:.2f}, {agg['ci_95'][1]:.2f}]",
    )
    col_w.metric(
        "가중 share", f"{agg['weighted_share']:.1%}",
        help=f"95% CI: [{agg['weighted_ci_95'][0]:.2f}, {agg['weighted_ci_95'][1]:.2f}]",
    )

    # sentiment 분포 KPI — Phase 6
    if agg.get("n", 0) > 0:
        col_p, col_n2, col_neu = st.columns(3)
        col_p.metric("🟢 긍정 share", f"{agg.get('positive_share', 0.0):.1%}")
        col_n2.metric("🔴 부정 share", f"{agg.get('negative_share', 0.0):.1%}")
        col_neu.metric("⚪ 중립 share", f"{agg.get('neutral_share', 0.0):.1%}")

    # ─── Altair line + CI 음영 + 이상치 dot ──────────────────
    base = alt.Chart(df).encode(
        x=alt.X("day:T", title="날짜"),
    )
    band = base.mark_area(opacity=0.18, color="#5b8ff9").encode(
        y=alt.Y("ci_lo:Q", title="Mention Share"),
        y2="ci_hi:Q",
    )
    line = base.mark_line(strokeWidth=2.5, color="#5b8ff9").encode(
        y=alt.Y("share:Q", title="Mention Share"),
    )
    points = base.mark_circle(size=50, color="#5b8ff9").encode(
        y="share:Q",
    )
    layers = [band, line, points]

    if anomalies:
        anomaly_df = pd.DataFrame([
            {"day": series[a.index].day.isoformat(), "share": a.value}
            for a in anomalies
        ])
        anomaly_layer = alt.Chart(anomaly_df).mark_point(
            size=200, color="#a02520", filled=True, shape="diamond",
        ).encode(x="day:T", y="share:Q")
        layers.append(anomaly_layer)

    chart = alt.layer(*layers).properties(height=320).interactive()
    st.altair_chart(chart, use_container_width=True)
    st.caption(
        f"키워드 `{keyword_text}` · 가중 share = max(target weight) per response · "
        f"이상치는 직전 7일 평균 ± 2σ 벗어난 시점."
    )

    # by_brand 테이블
    if agg["by_brand"]:
        with st.expander(f"브랜드별 멘션 카운트 ({len(agg['by_brand'])}개)", expanded=False):
            for brand, count in agg["by_brand"].items():
                st.markdown(f"- **{brand}** — {count}건")

    # ─── 경쟁사 비교 차트 — Phase 6-T3.4 ────────────────────
    with SessionLocal() as cs:
        confirmed = (
            cs.query(Competitor)
            .filter(Competitor.tenant_id == tenant.id, Competitor.confirmed == True)  # noqa: E712
            .all()
        )
        confirmed_names = [c.name for c in confirmed]

    if confirmed_names:
        st.markdown("##### 🆚 경쟁사 비교")
        rows = [{"브랜드": tenant.name + " (자기)", "share": agg.get("share", 0.0)}]
        with SessionLocal() as cs:
            for cname in confirmed_names:
                cshr = competitor_share(cs, tenant.id, keyword_id, cname)
                rows.append({"브랜드": cname, "share": cshr["share"]})
        comp_df = pd.DataFrame(rows)
        comp_chart = (
            alt.Chart(comp_df)
            .mark_bar(color="#5b8ff9")
            .encode(
                x=alt.X("share:Q", axis=alt.Axis(format=".0%"), title="Mention Share"),
                y=alt.Y("브랜드:N", sort="-x"),
                tooltip=[alt.Tooltip("브랜드:N"), alt.Tooltip("share:Q", format=".1%")],
            )
            .properties(height=max(120, 30 * len(rows)))
        )
        st.altair_chart(comp_chart, use_container_width=True)


def _render_competitor_section(SessionLocal, tenant) -> None:
    """🎯 경쟁사 후보 검수 섹션 — discover_competitors() 결과를 카드로 노출.

    승인 → confirmed=True INSERT (다음 수집부터 Mention 자동 인식).
    거절 → confirmed=False INSERT (다음 discover 호출 때 제외).
    confirmed=True 인 경쟁사는 별도 list 로 + 삭제 버튼.
    """
    try:
        from src.analytics.competitor import discover_competitors
        from src.storage.models import Competitor
    except ImportError as _ie:  # pragma: no cover
        st.warning(f"경쟁사 모듈 import 실패: `{_ie}`")
        return

    st.markdown("##### 🎯 경쟁사 후보 검수")
    st.caption(
        "AI 응답에서 자동 발견된 의료기관 후보입니다. 승인하면 다음 수집부터 "
        "멘션으로 자동 인식되어 비교 분석에 포함됩니다."
    )

    # 후보 + confirmed 목록 동시 조회
    with SessionLocal() as s:
        candidates = discover_competitors(s, tenant.id)
        confirmed = (
            s.query(Competitor)
            .filter(Competitor.tenant_id == tenant.id, Competitor.confirmed == True)  # noqa: E712
            .order_by(Competitor.first_seen_at.desc())
            .all()
        )
        confirmed_data = [(c.id, c.name, c.discovery_source, c.first_seen_at) for c in confirmed]

    # 후보 카드
    if not candidates:
        st.info(
            "⚪ 임계 통과한 후보가 없습니다 — 응답 ≥ 3개 + 키워드 ≥ 2개 가 필요합니다. "
            "(이미 등록되었거나, 자기 브랜드는 자동 제외)"
        )
    else:
        for cand in candidates:
            with st.container(border=True):
                head_l, head_r = st.columns([4, 2])
                head_l.markdown(
                    f"**{cand.name}** — 멘션 `{cand.mention_count}` · "
                    f"응답 `{cand.response_count}` · 키워드 `{cand.keyword_count}`"
                )
                first = cand.first_seen.strftime("%Y-%m-%d") if cand.first_seen else "—"
                head_r.caption(f"최초 등장 {first}")

                if cand.sample_snippets:
                    snippet = cand.sample_snippets[0]
                    if len(snippet) > 180:
                        snippet = snippet[:180] + "…"
                    st.markdown(
                        f"<div style='padding:8px 12px;background:#fafafa;border-radius:6px;"
                        f"font-size:12px;color:#555;'>“…{snippet}…”</div>",
                        unsafe_allow_html=True,
                    )

                col_y, col_n = st.columns(2)
                if col_y.button(
                    "✅ 승인", key=f"comp_approve_{cand.name}", use_container_width=True
                ):
                    with SessionLocal() as ws:
                        ws.add(Competitor(
                            tenant_id=tenant.id,
                            name=cand.name,
                            aliases=None,
                            discovery_source="ai_response",
                            confirmed=True,
                            first_seen_at=cand.first_seen,
                        ))
                        ws.commit()
                    st.success(f"승인: {cand.name}")
                    st.rerun()
                if col_n.button(
                    "❌ 거절", key=f"comp_reject_{cand.name}", use_container_width=True
                ):
                    with SessionLocal() as ws:
                        ws.add(Competitor(
                            tenant_id=tenant.id,
                            name=cand.name,
                            aliases=None,
                            discovery_source="ai_response",
                            confirmed=False,
                            first_seen_at=cand.first_seen,
                        ))
                        ws.commit()
                    st.info(f"거절: {cand.name} (다음 후보 풀에서 제외)")
                    st.rerun()

    # 확정 경쟁사 목록
    if confirmed_data:
        with st.expander(f"✅ 확정 경쟁사 ({len(confirmed_data)}개)", expanded=False):
            for cid, name, source, first_seen in confirmed_data:
                col_n, col_s, col_d = st.columns([3, 2, 1])
                col_n.markdown(f"**{name}**")
                col_s.caption(
                    f"`{source}` · {first_seen.strftime('%Y-%m-%d') if first_seen else '—'}"
                )
                if col_d.button("🗑️", key=f"comp_del_{cid}", use_container_width=True):
                    with SessionLocal() as ws:
                        ws.query(Competitor).filter(Competitor.id == cid).delete()
                        ws.commit()
                    st.rerun()


def _trend_chip_html(trend: dict) -> str:
    t = trend.get("trend", "insufficient_data")
    p = trend.get("p_value")
    if t == "increasing":
        return (
            f'<span class="gsd-chip gsd-chip-green">↑ 증가 추세'
            f'{f" (p={p:.3f})" if p is not None else ""}</span>'
        )
    if t == "decreasing":
        return (
            f'<span class="gsd-chip gsd-chip-red">↓ 감소 추세'
            f'{f" (p={p:.3f})" if p is not None else ""}</span>'
        )
    if t == "no trend":
        return '<span class="gsd-chip gsd-chip-gray">→ 변화 없음</span>'
    return '<span class="gsd-chip gsd-chip-gray">⏳ 데이터 부족 (7일 미만)</span>'


def _anomaly_chip_html(n: int) -> str:
    if n == 0:
        return '<span class="gsd-chip gsd-chip-green">✓ 이상치 없음</span>'
    return (
        f'<span class="gsd-chip gsd-chip-yellow">⚠️ 이상치 {n}건 (최근 14일)</span>'
    )
