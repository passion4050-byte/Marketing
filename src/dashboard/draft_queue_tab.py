"""임시 저장함 — Phase 6.5.

매일 자동 생성된 콘텐츠 (``GeneratedContent.status='draft'``) 를 검수/수정/삭제/복사하는 큐.
'발행 확정' 버튼 → status='published' 전환.

자동 생성 설정 (활성/비활성 + 일일 개수 + 채널) 도 이 탭 상단에서 조정.
"""

from __future__ import annotations

from datetime import datetime, timezone

import streamlit as st


_CHANNEL_LABELS = {
    "schema_org": "🧩 Schema.org FAQ",
    "blog_html": "📝 자사 블로그 (HTML)",
    "naver_blog": "📰 네이버 블로그",
    "instagram": "📸 Instagram",
}
_ALL_CHANNELS = list(_CHANNEL_LABELS.keys())


def _ensure_setting(SessionLocal, tenant_id: int):
    """tenant 별 AutoContentSetting 1행 보장 (없으면 생성).

    stale module cache 에서 AutoContentSetting 모델 자체가 없을 수 있어 ImportError 가드.
    """
    try:
        from src.storage.models import AutoContentSetting
    except ImportError:
        return None

    with SessionLocal() as s:
        row = (
            s.query(AutoContentSetting)
            .filter(AutoContentSetting.tenant_id == tenant_id)
            .first()
        )
        if row is None:
            row = AutoContentSetting(
                tenant_id=tenant_id,
                enabled=False,
                daily_count=2,
                channels=list(_ALL_CHANNELS),
            )
            s.add(row)
            s.commit()
            s.refresh(row)
        # detach
        return {
            "id": row.id,
            "enabled": row.enabled,
            "daily_count": row.daily_count,
            "channels": list(row.channels) if row.channels else list(_ALL_CHANNELS),
            "last_run_at": row.last_run_at,
        }


def _render_setting_card(SessionLocal, tenant) -> None:
    """자동 생성 설정 — 활성/비활성, 일일 개수, 채널 선택."""
    try:
        from src.storage.models import AutoContentSetting
    except ImportError:
        st.warning(
            "⚠️ 자동 콘텐츠 설정 모델이 아직 로드되지 않았습니다. "
            "Streamlit Cloud → Manage app → Reboot app 후 다시 시도해 주세요."
        )
        return

    setting = _ensure_setting(SessionLocal, tenant.id)
    if setting is None:
        st.warning("자동 콘텐츠 설정 로드 실패 — 앱 재시작이 필요합니다.")
        return

    with st.container(border=True):
        st.markdown("##### ⚙️ 자동 콘텐츠 생성 설정")
        st.caption(
            "활성화하면 매일 새벽 03:00 (KST) 에 등록된 키워드와 데이터 피딩/브랜드 보이스/"
            "참고 자료를 바탕으로 임시저장 콘텐츠가 자동 생성됩니다. 사용자는 아래 큐에서 "
            "수정/삭제/발행 확정만 하면 됩니다."
        )

        col_e, col_n, col_status = st.columns([1, 1, 2])
        with col_e:
            enabled = st.toggle(
                "자동 생성",
                value=setting["enabled"],
                key=f"auto_enabled_{tenant.id}",
            )
        with col_n:
            daily_count = st.number_input(
                "일일 개수", 1, 10, int(setting["daily_count"]),
                key=f"auto_count_{tenant.id}",
            )
        with col_status:
            last_run = setting["last_run_at"]
            if last_run:
                last_label = last_run.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            else:
                last_label = "—"
            st.markdown(
                f'<div style="padding-top:32px;font-size:12px;color:#666;">'
                f'마지막 실행: <b>{last_label}</b></div>',
                unsafe_allow_html=True,
            )

        channels_selected = st.multiselect(
            "채널",
            _ALL_CHANNELS,
            default=setting["channels"],
            format_func=lambda c: _CHANNEL_LABELS.get(c, c),
            key=f"auto_channels_{tenant.id}",
            help="향후 유튜브/Threads 등 추가 예정.",
        )

        col_s, col_run = st.columns([1, 1])
        save_clicked = col_s.button(
            "💾 설정 저장", key=f"auto_save_{tenant.id}",
            use_container_width=True, type="primary",
        )
        run_clicked = col_run.button(
            "▶️ 지금 1회 실행", key=f"auto_runnow_{tenant.id}",
            use_container_width=True,
            help="스케줄을 기다리지 않고 즉시 daily_count 만큼 draft 생성 (비용 발생).",
        )

        if save_clicked:
            with SessionLocal() as s:
                row = (
                    s.query(AutoContentSetting)
                    .filter(AutoContentSetting.tenant_id == tenant.id)
                    .first()
                )
                if row is not None:
                    row.enabled = bool(enabled)
                    row.daily_count = int(daily_count)
                    row.channels = list(channels_selected) or list(_ALL_CHANNELS)
                    s.commit()
            st.success("자동 생성 설정이 저장되었습니다.")
            st.rerun()

        if run_clicked:
            from src.collector.scheduler import daily_auto_content_job

            # 임시로 enabled=True 로 보정해서 즉시 실행 (저장 안 했어도 동작)
            with SessionLocal() as s:
                row = (
                    s.query(AutoContentSetting)
                    .filter(AutoContentSetting.tenant_id == tenant.id)
                    .first()
                )
                if row is not None:
                    prev_enabled = row.enabled
                    row.enabled = True
                    row.daily_count = int(daily_count)
                    row.channels = list(channels_selected) or list(_ALL_CHANNELS)
                    s.commit()

            with st.spinner(f"자동 콘텐츠 {daily_count}건 생성 중…"):
                try:
                    result = daily_auto_content_job(SessionLocal)
                except Exception as e:
                    st.error(f"실행 실패: {e}")
                    return
            with SessionLocal() as s:
                row = (
                    s.query(AutoContentSetting)
                    .filter(AutoContentSetting.tenant_id == tenant.id)
                    .first()
                )
                if row is not None and not enabled:
                    row.enabled = prev_enabled
                    s.commit()
            st.success(
                f"✅ {result.get('drafts', 0)}건 임시저장 · 오류 {result.get('errors', 0)}건"
            )
            st.rerun()


def _render_queue(SessionLocal, tenant) -> None:
    """status='draft' 인 콘텐츠 list.

    stale module cache 에서 status 가 없으면 빈 큐로 노출 (없는 게 안전).
    """
    from src.dashboard.app import render_content_card
    from src.storage.models import GeneratedContent

    if not hasattr(GeneratedContent, "status"):
        st.warning(
            "⚠️ 자동 콘텐츠 큐 기능이 활성화되려면 앱 재시작이 필요합니다. "
            "Streamlit Cloud → Manage app → Reboot app 을 눌러주세요."
        )
        return

    with SessionLocal() as session:
        rows = (
            session.query(GeneratedContent)
            .filter(
                GeneratedContent.tenant_id == tenant.id,
                GeneratedContent.status == "draft",
            )
            .order_by(GeneratedContent.created_at.desc())
            .limit(50)
            .all()
        )
        items = [(c.id, c.channel, c.keyword_text, c.created_at) for c in rows]

    st.markdown(f"##### 📥 임시 저장함 ({len(items)}건)")

    if not items:
        st.markdown(
            """
            <div class="gsd-empty-state">
              <div class="gsd-empty-state-icon">📥</div>
              <div class="gsd-empty-state-title">아직 임시 저장된 콘텐츠가 없습니다</div>
              <div class="gsd-empty-state-desc">
                위에서 <b>자동 생성</b> 을 활성화하거나 <b>지금 1회 실행</b> 으로 즉시 생성해 보세요.
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    # 채널별 카운트 chip
    counts: dict[str, int] = {}
    for _i, ch, _k, _t in items:
        counts[ch] = counts.get(ch, 0) + 1
    chips = []
    for ch, cnt in counts.items():
        label = _CHANNEL_LABELS.get(ch, ch)
        chips.append(f'<span class="gsd-chip gsd-chip-blue">{label} {cnt}</span>')
    st.markdown(" ".join(chips), unsafe_allow_html=True)

    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    for cid, channel, keyword_text, created_at in items:
        # 헤더 → render_content_card 가 expander 로 그림
        # 임시저장함 전용: '발행 확정' 버튼 부착
        col_card, col_publish = st.columns([7, 1])
        with col_card:
            render_content_card(SessionLocal, cid, key_prefix=f"draft_{tenant.id}")
        with col_publish:
            if st.button(
                "🚀 발행", key=f"draft_publish_{cid}",
                use_container_width=True, type="primary",
                help="status 를 'published' 로 전환 — 임시저장함에서 사라지고 발행 이력에 합쳐집니다.",
            ):
                from src.storage.models import GeneratedContent

                with SessionLocal() as s:
                    obj = s.get(GeneratedContent, cid)
                    if obj is not None:
                        obj.status = "published"
                        s.commit()
                st.success("발행 확정됨")
                st.rerun()


def render_draft_queue_tab(SessionLocal, tenant) -> None:
    """임시 저장함 메인 진입점."""
    st.markdown("### 📥 자동 생성 임시 저장함")
    st.caption(
        "데이터 피딩 + 브랜드 보이스 + 참고 자료 + 키워드를 바탕으로 매일 자동 생성된 "
        "콘텐츠를 검수합니다. 수정/삭제/복사 후 '🚀 발행' 으로 확정하면 발행 이력에 합쳐집니다."
    )
    _render_setting_card(SessionLocal, tenant)
    st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)
    _render_queue(SessionLocal, tenant)
