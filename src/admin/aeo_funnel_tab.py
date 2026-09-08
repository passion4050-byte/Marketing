"""🧭 AEO 퍼널 — "발행했는데 그래서 뭐가 됐나" 를 한 화면에서 본다.

Round 194 (2026-09-08). 사용자 요청: "AI가 우리를 인용한다 → 사람이 들어온다 →
문의가 온다 로 이어지지 않는다는 걸 어드민에서 직관적으로 보고 싶다."

## 왜 기존 "Funnel (전사)" 탭으로는 안 되나
그 탭은 `Publication.cite_count` + `ShortLink.click_count` 를 센다. 그건 **발행물 대장**
기준이라 실제 AEO 사슬(크롤 → 인용 → 검색노출 → 방문 → 문의)의 중간 단계가 통째로 빠져
있다. 그래서 "어디서 끊겼는가" 를 답하지 못한다. 이 탭은 각 단계를 실측 테이블에서
직접 세고, **단계 간 전환율**을 보여준다 — 끊긴 지점이 눈에 바로 들어오게.

## 🔴 raw SQL 을 쓰는 이유
`crawler_hits`·`citation_events`·`gsc_daily`·`naver_search_report`·`ga4_daily`·
`medimap_inquiries` 는 ORM 모델이 없거나 컬럼이 어긋난다. CLAUDE.md 규칙:
ORM 에 없는 컬럼을 `getattr` 로 읽으면 **기본값이 조용히 돌아와 필터가 무력화**된다
(Round 193 실사고: `Tenant.partner_slug` 부재로 self 판정이 죽어 있었다).
그래서 여기서는 전부 raw SQL 로 읽고, 테이블이 없으면 그 단계만 '미측정' 으로 표시한다.
"""

from __future__ import annotations

import streamlit as st

# 단계 정의: (키, 이모지, 라벨, 한 줄 설명)
_STAGES = [
    ("published", "📝", "발행", "블로그 글을 실제로 내보냈는가"),
    ("crawled", "🤖", "AI 크롤러 도달", "AI 봇이 그 글을 실제로 읽었는가"),
    ("cited", "💬", "AI 인용", "AI 답변이 그 글을 출처로 달았는가"),
    ("impressions", "🔍", "검색 노출", "구글·네이버 결과에 떴는가"),
    ("sessions", "👤", "방문", "사람이 실제로 들어왔는가"),
    ("inquiries", "📮", "문의", "돈이 되는 행동을 했는가"),
]

_AI_BOTS = ("claudebot", "oai-searchbot", "chatgpt-user", "perplexitybot", "gptbot", "google-extended")


def _q(s, sql: str, params: dict | None = None):
    """raw SQL 1행 조회. 테이블 미존재 등 실패 시 None (= 미측정)."""
    from sqlalchemy import text as _t

    try:
        row = s.execute(_t(sql), params or {}).fetchone()
        return row
    except Exception:
        return None


def _collect(SessionLocal, days: int) -> dict:
    """각 단계를 실측 테이블에서 직접 센다. 실패한 단계는 None 으로 남긴다."""
    out: dict = {k: None for k, *_ in _STAGES}
    extra: dict = {}
    bots = "','".join(_AI_BOTS)
    p = {"days": days}

    with SessionLocal() as s:
        r = _q(s, """
            SELECT count(*) FROM generated_contents
            WHERE status='published' AND channel='blog_html'
              AND published_at >= now() - (:days || ' days')::interval
        """, p)
        if r:
            out["published"] = int(r[0])

        # 🔴 크롤 도달은 "글 몇 편이 읽혔나" 로 센다. 히트 수로 세면 봇이 목록 페이지
        #    하나를 1000번 때린 것이 '도달 1000' 으로 보여 실상을 가린다.
        #
        # 🔴 Round 196 (2026-09-08) — 경로 접두사로 매칭하면 안 된다.
        #    처음엔 `path LIKE '/blog/%'` 로 셌는데, 실제 canonical 은 대부분
        #    `/with-partners/<카테고리>/<파트너>/<slug>` 다. 실측: AI 봇이 읽은 ko 글
        #    중 164개가 /with-partners 경로였고 /blog 는 32개뿐 —
        #    **실제 도달의 84%를 놓쳐서 12% 를 71% 대신 보고했다.**
        #    → 경로의 **마지막 세그먼트**를 slug 와 동등 조인한다. 경로 구조가 바뀌어도
        #      안 깨지고, LIKE 스캔보다 빠르며, 언어별 경로도 그대로 잡힌다.
        r = _q(s, f"""
            WITH seg AS (
              SELECT DISTINCT regexp_replace(path, '^.*/', '') AS s
              FROM crawler_hits
              WHERE hit_at >= now() - (:days || ' days')::interval
                AND lower(bot_name) IN ('{bots}')
            )
            SELECT count(*) FROM generated_contents g
            WHERE g.status='published' AND g.channel='blog_html'
              AND g.published_at >= now() - (:days || ' days')::interval
              AND EXISTS (SELECT 1 FROM seg WHERE seg.s = g.slug)
        """, p)
        if r:
            out["crawled"] = int(r[0])

        r = _q(s, """
            SELECT count(DISTINCT content_id) FROM citation_events
            WHERE occurred_at >= now() - (:days || ' days')::interval
        """, p)
        if r:
            out["cited"] = int(r[0])

        gsc = _q(s, """
            SELECT coalesce(sum(impressions),0), coalesce(sum(clicks),0)
            FROM gsc_daily WHERE date >= (current_date - :days)
        """, p)
        nav = _q(s, """
            SELECT coalesce(sum(impressions),0), coalesce(sum(clicks),0)
            FROM naver_search_report
            WHERE period_end >= (current_date - :days)
        """, p)
        if gsc or nav:
            gi, gc = (int(gsc[0]), int(gsc[1])) if gsc else (0, 0)
            ni, nc = (int(nav[0]), int(nav[1])) if nav else (0, 0)
            out["impressions"] = gi + ni
            extra["search_clicks"] = gc + nc
            extra["gsc"] = (gi, gc)
            extra["naver"] = (ni, nc)

        r = _q(s, """
            SELECT coalesce(sum(sessions),0) FROM ga4_daily
            WHERE date >= (current_date - :days)
        """, p)
        if r:
            out["sessions"] = int(r[0])

        # AI 어시스턴트 경유 방문 — 퍼널이 실제로 AI 를 타고 오는지의 직접 증거
        r = _q(s, """
            SELECT coalesce(sum(sessions),0) FROM ga4_source_daily
            WHERE date >= (current_date - :days)
              AND (medium ILIKE '%%ai%%' OR source ILIKE '%%chatgpt%%'
                   OR source ILIKE '%%perplexity%%' OR source ILIKE '%%gemini%%'
                   OR source ILIKE '%%claude%%' OR source ILIKE '%%copilot%%')
        """, p)
        if r:
            extra["ai_sessions"] = int(r[0])

        r = _q(s, """
            SELECT count(*) FROM medimap_inquiries
            WHERE created_at >= now() - (:days || ' days')::interval
        """, p)
        if r:
            out["inquiries"] = int(r[0])

        # 봇이 어디를 읽고 있나 — "글이 아니라 목록·리다이렉트만 읽는" 상태를 드러낸다
        try:
            from sqlalchemy import text as _t
            # is_post 는 접두사가 아니라 **마지막 세그먼트가 실제 발행 slug 인가**로 본다
            # (Round 196 — /with-partners/... 도 개별 글이다).
            extra["bot_paths"] = s.execute(_t(f"""
                SELECT c.path, count(*) AS hits,
                       EXISTS (SELECT 1 FROM generated_contents g
                                WHERE g.status='published'
                                  AND g.slug = regexp_replace(c.path, '^.*/', '')) AS is_post
                FROM crawler_hits c
                WHERE c.hit_at >= now() - (:days || ' days')::interval
                  AND lower(c.bot_name) IN ('{bots}')
                GROUP BY c.path ORDER BY hits DESC LIMIT 8
            """), p).fetchall()
        except Exception:
            extra["bot_paths"] = []

    out["_extra"] = extra
    return out


def _fmt(v) -> str:
    return "—" if v is None else f"{v:,}"


def _bar(pct: float) -> str:
    """전환율을 폭으로 보여주는 막대. 색은 심각도."""
    w = max(2.0, min(100.0, pct))
    color = "#DC2626" if pct < 5 else ("#F59E0B" if pct < 25 else "#15CBA8")
    return (
        f'<div style="background:#EEF2F7;border-radius:6px;height:10px;overflow:hidden">'
        f'<div style="width:{w:.1f}%;height:100%;background:{color}"></div></div>'
    )


def render_aeo_funnel_tab(SessionLocal) -> None:
    from src.admin.theme import admin_chip

    st.markdown("### 🧭 AEO 퍼널 — 어디서 끊기는가")
    st.caption(
        "발행 → AI 크롤러 도달 → AI 인용 → 검색 노출 → 방문 → 문의. "
        "각 단계를 실측 테이블에서 직접 세고, **바로 앞 단계 대비 전환율**을 보여줍니다. "
        "숫자가 아니라 **떨어지는 지점**을 보세요."
    )

    days = st.selectbox(
        "기간", [30, 60, 90, 180, 365], index=0,
        format_func=lambda d: f"최근 {d}일", key="aeo_funnel_days",
    )

    try:
        data = _collect(SessionLocal, int(days))
    except Exception as e:  # pragma: no cover
        st.error(f"집계 실패: {e}")
        return

    extra = data.get("_extra", {})

    # ── 퍼널 본체 ────────────────────────────────────────────────
    prev_val = None
    rows_html = []
    breaks: list[tuple[str, float]] = []

    for key, emoji, label, desc in _STAGES:
        val = data.get(key)
        if val is None:
            conv_html = '<span style="color:#94A3B8">미측정</span>'
            bar_html = ""
        elif prev_val is None:
            conv_html = '<span style="color:#64748B">기준</span>'
            bar_html = _bar(100.0)
        elif prev_val == 0:
            conv_html = '<span style="color:#94A3B8">—</span>'
            bar_html = _bar(0.0)
        else:
            pct = 100.0 * val / prev_val
            # 검색 노출은 글 수가 아니라 노출 횟수라 100% 를 넘을 수 있다 — 전환율로 읽지 않는다.
            if key == "impressions":
                conv_html = '<span style="color:#64748B">(횟수 지표)</span>'
                bar_html = ""
            else:
                col = "#DC2626" if pct < 5 else ("#F59E0B" if pct < 25 else "#15CBA8")
                conv_html = f'<b style="color:{col}">{pct:.1f}%</b>'
                bar_html = _bar(pct)
                if pct < 5:
                    breaks.append((label, pct))

        rows_html.append(
            f'<tr>'
            f'<td style="padding:12px 10px;white-space:nowrap"><b>{emoji} {label}</b>'
            f'<div style="font-size:11px;color:#94A3B8;font-weight:400">{desc}</div></td>'
            f'<td style="padding:12px 10px;text-align:right;font-size:20px;font-weight:900">{_fmt(val)}</td>'
            f'<td style="padding:12px 10px;text-align:right;white-space:nowrap">{conv_html}'
            f'<div style="margin-top:5px;min-width:120px">{bar_html}</div></td>'
            f'</tr>'
        )
        if val is not None and key != "impressions":
            prev_val = val

    st.markdown(
        '<table style="width:100%;border-collapse:collapse;font-size:13px">'
        '<thead><tr style="background:#F8FAFC">'
        '<th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748B">단계</th>'
        '<th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748B">값</th>'
        '<th style="padding:8px 10px;text-align:right;font-size:11px;color:#64748B">앞 단계 대비</th>'
        '</tr></thead><tbody>' + "".join(rows_html) + '</tbody></table>',
        unsafe_allow_html=True,
    )

    # ── 진단 한 줄 ───────────────────────────────────────────────
    st.markdown("")
    if breaks:
        worst = min(breaks, key=lambda x: x[1])
        st.error(
            f"🔴 **가장 크게 끊기는 곳: {worst[0]} ({worst[1]:.1f}%)**  \n"
            + " · ".join(f"{n} {p:.1f}%" for n, p in breaks)
            + "  \n앞 단계를 더 늘려도 여기서 막히면 결과는 안 바뀝니다. **여기부터 고쳐야 합니다.**"
        )
    elif all(data.get(k) is None for k, *_ in _STAGES):
        st.info("측정 테이블이 아직 없습니다.")
    else:
        st.success("✅ 5% 미만으로 끊기는 단계가 없습니다.")

    # ── 보조 지표 ────────────────────────────────────────────────
    c1, c2, c3 = st.columns(3)
    c1.metric(
        "검색 클릭", _fmt(extra.get("search_clicks")),
        help=(
            f"구글 {extra.get('gsc', ('—', '—'))[1]} · 네이버 {extra.get('naver', ('—', '—'))[1]}"
            if "gsc" in extra else "미측정"
        ),
    )
    c2.metric(
        "AI 경유 방문", _fmt(extra.get("ai_sessions")),
        help="chatgpt.com·perplexity·gemini 등에서 넘어온 세션. AEO 가 실제로 사람을 데려오는지의 직접 증거.",
    )
    _pub, _cit = data.get("published"), data.get("cited")
    c3.metric(
        "인용률",
        "—" if not _pub else f"{100.0 * (_cit or 0) / _pub:.1f}%",
        help="기간 내 발행 글 중 AI 인용이 붙은 비율. 양을 늘려도 이 비율이 안 오르면 형식 문제입니다.",
    )

    # ── 🔴 봇이 실제로 읽는 곳 ───────────────────────────────────
    st.markdown("---")
    st.markdown("#### 🤖 AI 봇이 실제로 읽는 경로")
    st.caption(
        "`개별 글` 태그는 경로의 마지막 세그먼트가 실제 발행 slug 인 경우입니다 "
        "(`/blog/…` 뿐 아니라 `/with-partners/…` 도 개별 글입니다). "
        "목록·리다이렉트만 보이면 글이 크롤되지 않고 있다는 뜻이고, 크롤이 안 되면 인용은 구조적으로 불가능합니다."
    )
    paths = extra.get("bot_paths") or []
    if not paths:
        st.info("기간 내 AI 봇 히트가 없습니다.")
    else:
        total = sum(int(r[1]) for r in paths) or 1
        for path, hits, is_post in paths:
            chip = admin_chip("개별 글", "mint") if is_post else admin_chip("목록·기타", "gray")
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:10px;padding:6px 0;'
                f'border-bottom:1px solid #F1F5F9">'
                f'<div style="flex:1;font-family:monospace;font-size:12px;overflow:hidden;'
                f'text-overflow:ellipsis;white-space:nowrap">{path}</div>'
                f'<div>{chip}</div>'
                f'<div style="width:60px;text-align:right;font-weight:700">{int(hits):,}</div>'
                f'<div style="width:46px;text-align:right;font-size:11px;color:#94A3B8">'
                f'{100.0 * int(hits) / total:.0f}%</div></div>',
                unsafe_allow_html=True,
            )
