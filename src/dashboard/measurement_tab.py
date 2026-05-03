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
                     "position": m.position, "snippet": m.context_snippet}
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
                with st.expander(f"멘션 상세 ({len(mentions)}건)", expanded=False):
                    for m in mentions:
                        kind = (
                            "🎯 타겟" if m["is_target"]
                            else "🔵 경쟁사" if m["is_competitor"]
                            else "•"
                        )
                        st.markdown(
                            f"{kind} **{m['brand']}** (위치 {m['position']}) — _{m['snippet']}_"
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
