"""Phase 4-T2.4 + T3.3 + Phase 9-04+ — 측정 (Measurement) 탭.

기능:
- 키워드 등록 / On-Off / 삭제
- "지금 수집" 버튼 — 빠른 데모용 (n=10)
- **자동 수집** — 첫 방문 시 응답 0건이면 stub 엔진으로 자동 12 샘플 (Phase 9-04+).
  클라이언트는 측정 탭만 열어도 즉시 데이터를 볼 수 있음.
- 최근 Response 카드 — text 미리보기 + cited URLs + 멘션 chip + snippet
- 스케줄러 상태 표시 (다음 실행 시간)

라이브 환경 한계:
- StubEngine 기본 동작 (PERPLEXITY_API_KEY 설정 시 perplexity 자동 사용)
- Streamlit Cloud 컨테이너 재시작 시 APScheduler 작업 유실 (정의서 명시)
"""

from __future__ import annotations

import asyncio

import streamlit as st


_BRAND_PINK = "#FF4D5E"
_BRAND_GRAY = "#9CA3AF"


def _format_url_short(url: str | None, max_len: int = 50) -> str:
    if not url:
        return "(직접)"
    return url if len(url) <= max_len else url[: max_len - 1] + "…"


def _load_publication_urls(SessionLocal, tenant_id: int) -> set[str]:
    """tenant 의 발행된 URL 집합 — Response.cited_urls 와 매칭해 '내 발행 인용' 필터링."""
    try:
        from src.storage.models import Publication
    except ImportError:
        return set()
    with SessionLocal() as s:
        rows = (
            s.query(Publication.url)
            .filter(Publication.tenant_id == tenant_id)
            .all()
        )
    return {r.url.strip() for r in rows if r.url}


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

    # ─── 자동 수집 (Phase 9-04+) — 첫 방문 시 데이터 0건 보호 ────────
    _auto_collect_if_empty(SessionLocal, tenant, kw_data)

    # ─── 키워드별 시계열 (Phase 5) ─────────────────────────────
    _render_timeseries_section(SessionLocal, tenant, kw_data)

    st.divider()

    # ─── 최근 Response 카드 ────────────────────────────────────
    st.markdown("##### 최근 응답 (직전 30건)")
    st.caption(
        "엔진이 키워드에 답한 원문 응답. **🎯 내 발행 인용** 박스는 응답이 인용한 URL 중 "
        "내가 실제 발행해 등록한 콘텐츠와 매칭된 것만 노출 — 더미/외부 출처는 카운트만 표시."
    )
    publication_urls = _load_publication_urls(SessionLocal, tenant.id)

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
        st.info(
            "측정 데이터를 준비 중입니다. 페이지를 새로고침하시거나 잠시 후 다시 확인해주세요. "
            "(자동 수집이 진행됩니다)"
        )
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
                cited_clean = [u.strip() for u in item["cited_urls"] if isinstance(u, str) and u.strip()]
                own_cited = [u for u in cited_clean if u in publication_urls]
                external_count = len(cited_clean) - len(own_cited)

                if own_cited:
                    st.markdown(
                        f"<div style='margin-top:8px;padding:10px 14px;background:#FFF1F3;"
                        f"border:1px solid rgba(255,77,94,0.20);border-radius:10px;'>"
                        f"<div style='font-size:11px;font-weight:700;color:#C2202F;"
                        f"text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;'>"
                        f"🎯 내 발행 콘텐츠 인용 ({len(own_cited)}건)</div>"
                        + "".join(
                            f"<div style='font-size:13px;margin-top:3px;'>"
                            f"<a href='{u}' target='_blank' rel='noopener'>{u}</a></div>"
                            for u in own_cited
                        )
                        + "</div>",
                        unsafe_allow_html=True,
                    )
                if external_count > 0:
                    st.caption(
                        f"📎 외부 출처 {external_count}건 (Publication 미등록 — 카운트만 집계)"
                    )


def _auto_collect_if_empty(SessionLocal, tenant, kw_data) -> None:
    """첫 방문 시 응답 0건인 활성 키워드에 대해 stub 엔진으로 자동 수집.

    UX 의도: 클라이언트(테넌트 사용자) 가 측정 탭에 들어왔을 때 별도 버튼 클릭
    없이 바로 데이터가 보이도록. **stub 엔진 한정** — 비용 발생 엔진(gemini/anthropic
    등) 은 사용자 의도 없이 자동 호출 금지.

    멱등성: 세션 state 플래그로 같은 (tenant, keyword) 는 세션당 1회만 자동 수집.
    """
    if not kw_data:
        return
    try:
        from src.engines import get_engine
        engine = get_engine()
    except Exception:
        return
    if engine.name != "stub":
        return  # 비용 엔진은 자동 호출 X — 명시적 버튼 클릭 필요

    # 첫 active 키워드만 대상 (n=12 면 ~3-5초 — 페이지 로딩 부담 작음)
    first_active = next((k for k in kw_data if k[3]), None)  # (kid, text, brand, active)
    if first_active is None:
        return
    kid = first_active[0]

    flag_key = f"_auto_collected_{tenant.id}_{kid}"
    if st.session_state.get(flag_key):
        return  # 같은 세션에서 이미 시도

    from datetime import datetime, timedelta, timezone

    from src.storage.models import Query, Response

    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    with SessionLocal() as s:
        n_recent = (
            s.query(Response)
            .join(Query, Response.query_id == Query.id)
            .filter(
                Query.tenant_id == tenant.id,
                Query.keyword_id == kid,
                Response.created_at >= one_hour_ago,
            )
            .count()
        )
    if n_recent >= 6:
        st.session_state[flag_key] = True  # 최근 데이터 충분
        return

    # 자동 수집 실행 — 사용자에게는 짧은 spinner 만 표시
    st.session_state[flag_key] = True
    with st.status("📡 측정 데이터 준비 중… (자동 수집)", expanded=False):
        _run_collect_now(SessionLocal, tenant.id, kid, n=12, silent=True)


def _run_collect_now(
    SessionLocal, tenant_id: int, keyword_id: int, n: int = 10, *, silent: bool = False,
) -> None:
    """UI 의 '지금 수집' 버튼 핸들러. n 만큼 빠른 수집.

    silent=True 면 success/spinner 메시지 생략 — 자동 수집 흐름에 사용.
    """
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

    spinner_ctx = st.spinner(f"`{engine.name}` 로 n={n} 수집 중…") if not silent else _Noop()
    with spinner_ctx:
        try:
            result = asyncio.run(collect_for_keyword(
                SessionLocal, tenant_id, kw, engine, n_samples=n, concurrency=3,
            ))
        except Exception as e:
            if not silent:
                st.error(f"수집 실패: {e}")
            return

    if result.guardrail_stopped:
        if not silent:
            st.warning(
                f"🛑 비용 가드레일에 의해 중단 — 성공 {result.n_success}/{n_total_label(n)} · "
                f"멘션 {result.n_mentions}건. {result.error_msg}"
            )
    else:
        if not silent:
            st.success(
                f"✅ 수집 완료 — 성공 {result.n_success}/{result.n_total} · "
                f"실패 {result.n_failed} · 멘션 {result.n_mentions}건"
            )


class _Noop:
    """silent 모드용 no-op context manager."""
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False


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

    st.markdown("###### 🧪 AI가 본 내 브랜드")
    st.caption(
        f"등록 키워드 `{keyword_text}` 로 4엔진을 호출했을 때 내 브랜드가 어떻게 등장했는지."
    )
    col_s, col_w = st.columns(2)
    col_s.metric(
        "AI 응답 노출률", f"{agg['share']:.1%}",
        help=(
            f"AI가 같은 질문에 답한 {agg['n']}건 중 내 브랜드가 '있음/없음' 으로 등장한 비율. "
            f"95% 신뢰구간 [{agg['ci_95'][0]:.2f}, {agg['ci_95'][1]:.2f}]"
        ),
    )
    col_w.metric(
        "추천 강도 노출률", f"{agg['weighted_share']:.1%}",
        help=(
            "응답 안에서 등장 위치(앞쪽일수록 높음)와 추천 표현(권장/추천 vs 단순 언급)을 "
            "0~1 가중치로 환산한 노출률. 단순 노출률보다 콘텐츠 인용 강도를 잘 반영. "
            f"95% 신뢰구간 [{agg['weighted_ci_95'][0]:.2f}, {agg['weighted_ci_95'][1]:.2f}]"
        ),
    )

    # AI 톤 분석 — sentiment 분포
    if agg.get("n", 0) > 0:
        st.markdown("###### 💬 AI가 쓴 톤 분석")
        st.caption(
            "내 브랜드를 다룬 응답의 어조 — AI가 답을 작성한 문장 안에서 평가가 긍/중/부 중 "
            "어디에 가까웠는지를 분류."
        )
        col_p, col_neu, col_n2 = st.columns(3)
        col_p.metric(
            "🟢 긍정", f"{agg.get('positive_share', 0.0):.1%}",
            help="추천·권장·잘함 등 긍정 표현이 포함된 응답 비율",
        )
        col_neu.metric(
            "⚪ 중립", f"{agg.get('neutral_share', 0.0):.1%}",
            help="단순 언급/사실 나열 — 평가 단어 없는 응답 비율",
        )
        col_n2.metric(
            "🔴 부정", f"{agg.get('negative_share', 0.0):.1%}",
            help="주의·논란·부정 평가가 포함된 응답 비율 (없을수록 좋음)",
        )

    # ─── Altair line + CI 음영 + 이상치 dot ──────────────────
    base = alt.Chart(df).encode(
        x=alt.X("day:T", title="날짜"),
    )
    band = base.mark_area(opacity=0.18, color=_BRAND_PINK).encode(
        y=alt.Y("ci_lo:Q", title="Mention Share"),
        y2="ci_hi:Q",
    )
    line = base.mark_line(strokeWidth=2.5, color=_BRAND_PINK).encode(
        y=alt.Y("share:Q", title="Mention Share"),
    )
    points = base.mark_circle(size=50, color=_BRAND_PINK).encode(
        y="share:Q",
    )
    layers = [band, line, points]

    if anomalies:
        anomaly_df = pd.DataFrame([
            {"day": series[a.index].day.isoformat(), "share": a.value}
            for a in anomalies
        ])
        anomaly_layer = alt.Chart(anomaly_df).mark_point(
            size=200, color="#C2202F", filled=True, shape="diamond",
        ).encode(x="day:T", y="share:Q")
        layers.append(anomaly_layer)

    chart = alt.layer(*layers).properties(height=320).interactive()
    st.altair_chart(chart, use_container_width=True)
    st.caption(
        f"키워드 `{keyword_text}` · 가중 share = max(target weight) per response · "
        f"이상치는 직전 7일 평균 ± 2σ 벗어난 시점."
    )

    # by_brand — 본인 vs 경쟁사 막대 (항상 노출, expander 제거)
    if agg["by_brand"]:
        st.markdown("###### 🏆 본 키워드 응답에 가장 많이 등장한 브랜드")
        st.caption(
            "n=" + str(agg["n"]) + " 응답 안에서 각 브랜드가 등장한 횟수. "
            "**핑크 = 내 브랜드**, 회색 = 경쟁사. 막대가 짧으면 그 브랜드는 AI가 거의 언급 안 한 것."
        )
        bb_rows = sorted(agg["by_brand"].items(), key=lambda x: -x[1])[:8]
        bb_df = pd.DataFrame(
            [
                {
                    "브랜드": b,
                    "멘션": int(c),
                    "구분": "내 브랜드" if b == tenant.name else "경쟁사",
                }
                for b, c in bb_rows
            ]
        )
        bb_chart = (
            alt.Chart(bb_df)
            .mark_bar(cornerRadiusEnd=4)
            .encode(
                x=alt.X("멘션:Q", title="등장 횟수"),
                y=alt.Y("브랜드:N", sort="-x", title=None),
                color=alt.Color(
                    "구분:N",
                    scale=alt.Scale(
                        domain=["내 브랜드", "경쟁사"],
                        range=[_BRAND_PINK, _BRAND_GRAY],
                    ),
                    legend=alt.Legend(title=None, orient="top"),
                ),
                tooltip=[
                    alt.Tooltip("브랜드:N"),
                    alt.Tooltip("멘션:Q", title="등장 횟수"),
                    alt.Tooltip("구분:N"),
                ],
            )
            .properties(height=max(140, 32 * len(bb_df)))
        )
        st.altair_chart(bb_chart, use_container_width=True)

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
            .mark_bar(color=_BRAND_PINK)
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

    st.markdown("##### 🎯 경쟁사 후보 검수 — TOP 3")
    st.caption(
        f"등록 키워드를 4엔진(ChatGPT · Gemini · Claude · Perplexity)에 질의했을 때 "
        f"`{tenant.name}` 외에 가장 많이 등장한 의료기관 상위 3개. 승인 시 멘션 분석에 자동 포함."
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

    # 후보 카드 — 멘션 카운트 desc + top 3
    if not candidates:
        st.info(
            "⚪ 아직 노출된 경쟁사가 없습니다 — 측정 응답이 더 쌓이면 자동으로 채워집니다. "
            "(키워드 등록 + 수집 실행 후 응답 ≥ 3개 + 키워드 ≥ 2개 통과한 후보만 노출)"
        )
    else:
        ranked = sorted(
            candidates,
            key=lambda c: (-(c.mention_count or 0), -(c.response_count or 0), c.name),
        )
        top = ranked[:3]
        rank_styles = [
            ("🥇 1위", "#FFF6D6", "#B45309"),
            ("🥈 2위", "#F1F5F9", "#475569"),
            ("🥉 3위", "#FFF1EA", "#B53D14"),
        ]
        for idx, cand in enumerate(top):
            label, bg, fg = rank_styles[idx]
            with st.container(border=True):
                head_l, head_r = st.columns([4, 2])
                head_l.markdown(
                    f"<span style='display:inline-block;padding:3px 10px;border-radius:999px;"
                    f"background:{bg};color:{fg};font-weight:700;font-size:12px;"
                    f"margin-right:10px;'>{label}</span>"
                    f"<b style='font-size:15px;'>{cand.name}</b>"
                    f"<div style='margin-top:6px;color:#6B7280;font-size:12.5px;'>"
                    f"등장 응답 <b>{cand.response_count}</b>건 · 멘션 <b>{cand.mention_count}</b>회 · "
                    f"키워드 <b>{cand.keyword_count}</b>개</div>",
                    unsafe_allow_html=True,
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
                    "✅ 승인 — 멘션 분석 포함", key=f"comp_approve_{cand.name}",
                    use_container_width=True, type="primary",
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
                    "❌ 거절", key=f"comp_reject_{cand.name}", use_container_width=True,
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

        if len(ranked) > 3:
            with st.expander(f"하위 후보 더 보기 ({len(ranked) - 3}개)", expanded=False):
                for cand in ranked[3:]:
                    st.markdown(
                        f"- **{cand.name}** — 응답 {cand.response_count}건 · "
                        f"멘션 {cand.mention_count}회 · 키워드 {cand.keyword_count}개"
                    )
                st.caption("필요 시 위 TOP 3 가 승인/거절 처리되면 자동으로 다음 순위가 올라옵니다.")

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
