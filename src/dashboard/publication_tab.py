"""📍 발행 현황 sub-tab — Phase 6.6.

tenant 가 외부 채널에 발행한 콘텐츠 URL 을 등록/추적하고, AI 엔진의 cited_urls 와
매칭하여 인용률을 측정한다. AEO/GEO 의 진짜 KPI 는 "AI 가 우리 콘텐츠를 cite 했는가".

표시:
- 상단 KPI: 총 발행 / AI 인용된 발행 / 인용률
- 채널별 분포
- 발행 테이블 (제목 / 채널 / URL / 발행일 / 인용 엔진 chip)
- 신규 등록 폼 (외부 콘텐츠 직접 입력)
- "🔄 인용 매칭 갱신" 버튼

stale module cache 환경 가드: Publication 모델 미존재 시 reboot 안내만 표시.
"""

from __future__ import annotations

from datetime import datetime, timezone

import streamlit as st


CHANNEL_OPTIONS = [
    ("naver_blog", "📰 네이버 블로그"),
    ("tistory", "📓 티스토리"),
    ("own_blog", "🌐 자사 홈페이지/블로그"),
    ("naver_place", "📍 네이버 플레이스"),
    ("press_release", "📢 보도자료"),
    ("youtube", "▶️ 유튜브"),
    ("threads", "💬 Threads/SNS"),
    ("other", "🔗 기타"),
]
CHANNEL_LABEL_MAP = {k: v for k, v in CHANNEL_OPTIONS}


def _fmt_dt(dt) -> str:
    if dt is None:
        return "—"
    try:
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")
    except Exception:
        return str(dt)[:10]


def _engine_emoji(engine: str) -> str:
    return {
        "perplexity": "🔵 Perplexity",
        "openai": "🟢 OpenAI",
        "gemini": "🟡 Gemini",
        "claude": "🟣 Claude",
        "stub": "⚪ Stub",
    }.get(engine, f"⚙️ {engine}")


def _kpi_section(rows: list) -> None:
    total = len(rows)
    cited = sum(1 for r in rows if (r.cite_count or 0) > 0)
    rate = (cited / total * 100) if total else 0.0
    total_citations = sum((r.cite_count or 0) for r in rows)

    cols = st.columns(4)
    cols[0].metric("📍 등록 발행물", f"{total}건")
    cols[1].metric("🤖 AI 인용된 발행물", f"{cited}건")
    cols[2].metric("📈 인용률", f"{rate:.1f}%")
    cols[3].metric("🔗 누적 인용 수", f"{total_citations}회")


def _channel_distribution(rows: list) -> None:
    """채널별 발행 수 + 인용된 수 차트."""
    if not rows:
        return
    counts: dict[str, dict[str, int]] = {}
    for r in rows:
        ch = r.channel or "other"
        d = counts.setdefault(ch, {"total": 0, "cited": 0})
        d["total"] += 1
        if (r.cite_count or 0) > 0:
            d["cited"] += 1

    chips = []
    for ch, d in sorted(counts.items(), key=lambda x: -x[1]["total"]):
        label = CHANNEL_LABEL_MAP.get(ch, ch)
        chips.append(
            f'<span class="gsd-chip gsd-chip-blue">{label} '
            f'<b>{d["total"]}</b> · 인용 {d["cited"]}</span>'
        )
    st.markdown(" ".join(chips), unsafe_allow_html=True)


def _engine_chips(cited_by_engines) -> str:
    if not cited_by_engines:
        return '<span class="gsd-chip" style="color:#999">미인용</span>'
    parts = []
    for e in cited_by_engines:
        engine = e.get("engine", "?")
        qc = e.get("query_count", 0)
        parts.append(
            f'<span class="gsd-chip gsd-chip-green">{_engine_emoji(engine)} ×{qc}</span>'
        )
    return " ".join(parts)


def _publication_table(SessionLocal, rows: list) -> None:
    """발행 테이블 — 제목 / 채널 / URL / 발행일 / 인용 엔진 / 작업."""
    if not rows:
        st.markdown(
            """
            <div class="gsd-empty-state">
              <div class="gsd-empty-state-icon">📍</div>
              <div class="gsd-empty-state-title">아직 등록된 발행 URL 이 없습니다</div>
              <div class="gsd-empty-state-desc">
                아래 폼으로 외부에 발행한 콘텐츠를 등록하거나,<br>
                <b>✨ 콘텐츠 발행 → 발행 이력</b> 의 콘텐츠 카드에서
                <b>📍 어디에 발행했어요</b> 폼을 사용해 등록하세요.
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    from src.storage.models import Publication

    for r in rows:
        with st.container(border=True):
            col_a, col_b = st.columns([5, 2])
            channel_label = CHANNEL_LABEL_MAP.get(r.channel, r.channel)
            with col_a:
                title_safe = r.title or "(제목 없음)"
                st.markdown(
                    f"**{title_safe}** "
                    f'<span class="gsd-chip">{channel_label}</span>',
                    unsafe_allow_html=True,
                )
                st.markdown(
                    f"<div style='font-size:12px;color:#666'>"
                    f"🔗 <a href='{r.url}' target='_blank'>{r.url}</a> · "
                    f"📅 발행 {_fmt_dt(r.published_at)} · "
                    f"🔄 마지막 매칭 {_fmt_dt(r.last_checked_at)}"
                    f"</div>",
                    unsafe_allow_html=True,
                )
                if r.destination_label:
                    st.caption(f"📌 {r.destination_label}")
                if r.notes:
                    st.caption(f"📝 {r.notes}")
                st.markdown(_engine_chips(r.cited_by_engines), unsafe_allow_html=True)
            with col_b:
                if st.button(
                    "🗑️ 삭제", key=f"pub_del_{r.id}",
                    use_container_width=True, type="secondary",
                ):
                    with SessionLocal() as s:
                        obj = s.get(Publication, r.id)
                        if obj is not None:
                            s.delete(obj)
                            s.commit()
                    st.rerun()


def _register_form(SessionLocal, tenant) -> None:
    """외부 콘텐츠 직접 등록 폼 (콘텐츠 카드에 연결되지 않은 발행물 — PR/타사 미디어 등).

    UTM/단축링크 자동 주입은 Publication.url 자체에 적용하지 *않는다* — Publication.url 은
    AI cite 응답과 매칭하기 위한 *canonical* 형태로 보관해야 하기 때문. 등록 직후
    `_utm_link_helper()` 가 별도 공유용 UTM 링크 + 단축링크를 노출한다.
    """
    from src.storage.models import Publication

    with st.expander("➕ 새 발행물 등록 (외부 콘텐츠 직접 입력)", expanded=False):
        with st.form(f"pub_new_{tenant.id}", clear_on_submit=True):
            col_ch, col_dt = st.columns([2, 1])
            channel = col_ch.selectbox(
                "채널",
                [k for k, _ in CHANNEL_OPTIONS],
                format_func=lambda k: CHANNEL_LABEL_MAP.get(k, k),
                key=f"new_pub_ch_{tenant.id}",
            )
            published_date = col_dt.date_input(
                "발행일", key=f"new_pub_date_{tenant.id}",
            )

            title = st.text_input(
                "제목", key=f"new_pub_title_{tenant.id}",
                placeholder="예: 강남 라식 가격 비교 가이드",
            )
            url = st.text_input(
                "공개 URL *", key=f"new_pub_url_{tenant.id}",
                placeholder="https://blog.naver.com/medimap/...",
            )
            destination_label = st.text_input(
                "어디에 (자유 입력)", key=f"new_pub_dest_{tenant.id}",
                placeholder="예: 메디맵 네이버블로그 / 헬스조선 보도자료",
            )
            notes = st.text_area(
                "메모", key=f"new_pub_notes_{tenant.id}",
                height=68, placeholder="이 발행에 대한 추가 메모 (선택)",
            )

            submitted = st.form_submit_button(
                "📍 등록", type="primary", use_container_width=True,
            )
        if submitted:
            if not url.strip():
                st.error("URL 은 필수입니다.")
                return
            published_at = datetime(
                published_date.year, published_date.month, published_date.day,
                tzinfo=timezone.utc,
            )
            with SessionLocal() as s:
                # 중복 검사 (UNIQUE constraint 의존하기보단 친절한 메시지)
                exists = (
                    s.query(Publication)
                    .filter(
                        Publication.tenant_id == tenant.id,
                        Publication.url == url.strip(),
                    )
                    .first()
                )
                if exists is not None:
                    st.warning(f"이미 등록된 URL 입니다 (id={exists.id}).")
                    return
                pub = Publication(
                    tenant_id=tenant.id,
                    channel=channel,
                    destination_label=destination_label.strip(),
                    url=url.strip(),
                    title=title.strip(),
                    published_at=published_at,
                    notes=notes.strip() or None,
                )
                s.add(pub)
                s.commit()
            st.success(f"등록되었습니다 — {channel}")
            st.rerun()


def _utm_link_helper(tenant) -> None:
    """공유용 UTM 링크 + 단축링크 생성기.

    Publication.url 은 canonical 로 두되, 사용자가 SNS/댓글/타 블로그에 *유입용*으로
    배포할 때 쓸 UTM-fied 링크를 즉석에서 만들어준다. AI 가 그 링크를 cite 하면
    GA4/내부 분석에서 utm_source=ai_cite 로 집계 가능.
    """
    from src.marketing.funnel import (
        UtmParams,
        apply_publication_funnel,
        inject_utm,
        shortlink_for,
    )

    with st.expander("🔗 공유용 UTM 링크 / 단축링크 생성", expanded=False):
        st.caption(
            "자사 페이지 URL 을 입력하면 UTM 이 부착된 공유 링크와, 클릭 추적이 가능한 "
            "단축링크(m.medimap.kr/r/{slug}) 를 만듭니다. **Publication 의 canonical URL 은 "
            "건드리지 않습니다** — AI cite 매칭은 canonical 로만 동작합니다."
        )
        col_u, col_s = st.columns([3, 2])
        url = col_u.text_input(
            "원본 URL (자사 페이지 권장)",
            key=f"utm_helper_url_{tenant.id}",
            placeholder="https://medimap.kr/blog/lasik-guide",
        )
        source = col_s.selectbox(
            "utm_source",
            ["own_blog", "naver_blog", "tistory", "press_release", "instagram", "threads", "kakao", "email"],
            key=f"utm_helper_src_{tenant.id}",
        )
        col_c, col_t = st.columns([2, 2])
        campaign = col_c.text_input(
            "utm_campaign (비워두면 slug 자동)",
            key=f"utm_helper_camp_{tenant.id}",
            placeholder="예: lasik_guide_2026q2",
        )
        custom_slug = col_t.text_input(
            "단축 slug (비워두면 자동)",
            key=f"utm_helper_slug_{tenant.id}",
            placeholder="예: lasik",
        )
        if not url.strip():
            return
        try:
            if campaign.strip():
                utm_url = inject_utm(
                    url.strip(),
                    UtmParams(
                        source=source,
                        medium="ai_cite",
                        campaign=campaign.strip(),
                    ),
                )
            else:
                utm_url = apply_publication_funnel(url.strip(), channel=source)
            short_slug = (custom_slug.strip() or campaign.strip()
                          or url.rstrip("/").split("/")[-1] or "link")
            short_url = shortlink_for(short_slug)
        except ValueError as e:
            st.error(f"링크 생성 실패: {e}")
            return

        st.markdown("**📤 공유용 UTM 링크**")
        st.code(utm_url, language=None)
        st.markdown("**🔗 단축링크 (click 추적용 — Phase 7-04 redirect 라우트와 함께 동작)**")
        st.code(short_url, language=None)


def _match_button(SessionLocal, tenant) -> None:
    if st.button(
        "🔄 AI 인용 매칭 갱신",
        key=f"pub_match_{tenant.id}",
        use_container_width=True,
        help="등록된 발행 URL 들이 이미 수집된 AI 응답의 cited_urls 에 등장하는지 다시 매칭합니다.",
    ):
        from src.analytics.citation import match_publications_to_responses

        with SessionLocal() as s:
            try:
                summary = match_publications_to_responses(s, tenant.id)
            except Exception as e:
                st.error(f"매칭 실패: {e}")
                return
        engines_part = ", ".join(
            f"{k}: {v}" for k, v in summary.get("engines", {}).items()
        ) or "—"
        st.success(
            f"✅ 발행 {summary['publications']}건 · 인용된 발행 "
            f"{summary['matched_publications']}건 · 누적 신규 인용 "
            f"{summary['new_citations']}회 ({engines_part})"
        )
        st.rerun()


def render_publication_tab(SessionLocal, tenant) -> None:
    """발행 현황 탭 본체."""
    try:
        from src.storage.models import Publication
    except ImportError:
        st.warning(
            "⚠️ 발행 추적 모델이 아직 로드되지 않았습니다. "
            "Streamlit Cloud → Manage app → Reboot app 후 다시 시도해 주세요."
        )
        return

    st.markdown("### 📍 발행 현황 — AEO/GEO 인용 매칭")
    st.caption(
        "tenant 가 외부 채널에 발행한 URL 을 등록하고, AI 엔진(Perplexity·OpenAI·Gemini·Claude) "
        "응답의 인용 URL 과 자동 매칭합니다. **AEO/GEO 의 진짜 KPI** 는 발행 자체가 아니라 "
        "AI 가 그 URL 을 cite 하는지 — 여기서 그걸 추적합니다."
    )

    with SessionLocal() as s:
        rows = (
            s.query(Publication)
            .filter(Publication.tenant_id == tenant.id)
            .order_by(Publication.created_at.desc())
            .all()
        )
        # detach for use after session close
        for r in rows:
            _ = r.cited_by_engines  # eager load JSON
            _ = r.created_at

    _kpi_section(rows)
    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
    _channel_distribution(rows)
    st.markdown("<div style='height:14px'></div>", unsafe_allow_html=True)

    col_match, _ = st.columns([1, 3])
    with col_match:
        _match_button(SessionLocal, tenant)

    st.markdown("#### 📋 등록된 발행물")
    _publication_table(SessionLocal, rows)

    st.markdown("---")
    _register_form(SessionLocal, tenant)
    _utm_link_helper(tenant)

    with st.expander("📚 AEO/GEO 인용을 늘리는 법 — 빠른 가이드", expanded=False):
        st.markdown(
            """
            **AI 검색엔진은 무엇을 cite 하는가?**
            1. **권위 도메인**: 정부(보건복지부, 식약처) / 학회(안과학회) / 대중 미디어(헬스조선, 코메디닷컴)
            2. **구조화된 콘텐츠**: FAQ Schema.org, JSON-LD, 명시적 Q&A 형식
            3. **신선한 콘텐츠**: 최근 6개월 내 발행물이 더 자주 cite
            4. **백링크**: 다른 도메인이 링크하는 글일수록 cite 확률↑
            5. **자사 도메인**: schema 가 잘 깔린 자사 홈페이지/블로그

            **메디맵 권장 발행 우선순위**
            1. 자사 홈페이지 + JSON-LD (FAQPage 스키마) — 100% 통제, 최우선
            2. 네이버 블로그 (메디맵 운영 계정) — 한국 검색 노출 + Naver AI 활용
            3. 보도자료 (헬스조선 / 코메디닷컴 / 메디게이트) — 권위 도메인 백링크
            4. 학회/협회 칼럼 기고 (안과학회 등) — 도메인 권위 최상위

            **자동 발행을 안 하는 이유 (현재 정책)**
            - 네이버/티스토리는 자동 게시 시 **계정 정지/스팸 분류** 위험
            - AI 가 cite 할 만한 권위 도메인은 **에디터 검수** 가 필수
            - "복사 → 외부 발행 → URL 등록" 루프가 안전하면서도 AEO 효과는 동일
            """
        )
