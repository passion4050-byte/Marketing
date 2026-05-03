"""대상 정보 관리 — Doctor / Equipment / EventOffer CRUD UI.

Streamlit 카드 3개 (의사 / 장비 / 이벤트). 각 카드:
- 상태 배지 (대기 중 / 최적화됨 / N개 등록)
- 기존 항목 목록 (편집/삭제/활성 토글)
- 새 항목 추가 폼

사용:
    from src.dashboard.profile import render_profile_tab
    render_profile_tab(SessionLocal, tenant)
"""

from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Optional

import streamlit as st

from src.content.tenant_context import has_active_data
from src.storage.models import Doctor, Equipment, EventOffer


# ─── 상태 배지 ──────────────────────────────────────────────────


def _status_chip(status: str, label: str) -> str:
    """대기 중 / 최적화됨 / 등록 N개 chip."""
    color = {
        "pending": "yellow",
        "optimized": "green",
        "info": "blue",
    }.get(status, "gray")
    return f'<span class="gsd-chip gsd-chip-{color}">{label}</span>'


def _to_aware(d) -> Optional[datetime]:
    """date → aware datetime (UTC 자정 기준)."""
    if d is None:
        return None
    if isinstance(d, datetime):
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


# ─── 의사 카드 ──────────────────────────────────────────────────


def _render_doctor_card(SessionLocal, tenant_id: int) -> None:
    with SessionLocal() as session:
        doctors = (
            session.query(Doctor)
            .filter(Doctor.tenant_id == tenant_id)
            .order_by(Doctor.id)
            .all()
        )
        n_active = sum(1 for d in doctors if d.is_active)
        n_optimized = sum(1 for d in doctors if d.is_complete and d.is_active)

    if n_optimized > 0:
        chip = _status_chip("optimized", f"최적화됨 · {n_optimized}명")
    elif n_active > 0:
        chip = _status_chip("info", f"등록 {n_active}명")
    else:
        chip = _status_chip("pending", "대기 중")

    with st.container(border=True):
        st.markdown(
            f"### 👁️ 의사 자격 정보 &nbsp; {chip}",
            unsafe_allow_html=True,
        )
        st.caption("LLM이 콘텐츠에 의사명/경력을 인용하도록.")

        # 기존 의사 목록
        for d in doctors:
            badge = (
                _status_chip("optimized", "활성")
                if d.is_active
                else _status_chip("pending", "비활성")
            )
            with st.expander(
                f"{d.name} · {d.specialty or '전문분야 미입력'}",
                expanded=False,
            ):
                st.markdown(badge, unsafe_allow_html=True)
                with st.form(f"doctor_edit_{d.id}", clear_on_submit=False):
                    name = st.text_input("의사 이름", value=d.name, key=f"d_name_{d.id}")
                    specialty = st.text_input(
                        "전문 분야",
                        value=d.specialty or "",
                        key=f"d_spec_{d.id}",
                        placeholder="예: 라식/라섹 전문의",
                    )
                    education = st.text_area(
                        "학력 및 경력",
                        value=d.education_career or "",
                        key=f"d_edu_{d.id}",
                        placeholder="연세대학교 의과대학 졸업\n세브란스병원 안과 전문의\n시력교정술 15년 경력",
                        height=100,
                    )
                    certs = st.text_area(
                        "자격증 및 인증",
                        value=d.certifications or "",
                        key=f"d_cert_{d.id}",
                        placeholder="안과 전문의, 굴절교정 전문의",
                        height=70,
                    )
                    is_active = st.toggle("활성 (콘텐츠에 사용)", value=d.is_active, key=f"d_act_{d.id}")
                    col_s, col_d = st.columns(2)
                    with col_s:
                        save = st.form_submit_button("💾 저장", use_container_width=True, type="primary")
                    with col_d:
                        delete = st.form_submit_button("🗑️ 삭제", use_container_width=True)
                if save:
                    with SessionLocal() as s:
                        obj = s.get(Doctor, d.id)
                        if obj:
                            obj.name = name.strip()
                            obj.specialty = specialty.strip() or None
                            obj.education_career = education.strip() or None
                            obj.certifications = certs.strip() or None
                            obj.is_active = is_active
                            s.commit()
                    st.success("저장됨")
                    st.rerun()
                if delete:
                    with SessionLocal() as s:
                        obj = s.get(Doctor, d.id)
                        if obj:
                            s.delete(obj)
                            s.commit()
                    st.warning("삭제됨")
                    st.rerun()

        # 새 의사 추가
        st.markdown("---")
        with st.form("doctor_add", clear_on_submit=True):
            st.markdown("**+ 의사 추가**")
            n_name = st.text_input("의사 이름", placeholder="예: 김시력", key="d_new_name")
            n_specialty = st.text_input("전문 분야", placeholder="예: 라식/라섹 전문의", key="d_new_spec")
            n_education = st.text_area(
                "학력 및 경력",
                placeholder="연세대학교 의과대학 졸업\n세브란스병원 안과 전문의\n시력교정술 15년 경력",
                key="d_new_edu",
                height=100,
            )
            n_certs = st.text_area(
                "자격증 및 인증",
                placeholder="안과 전문의, 굴절교정 전문의",
                key="d_new_cert",
                height=70,
            )
            submitted = st.form_submit_button("➕ 추가하기", use_container_width=True, type="primary")
        if submitted:
            if not n_name.strip():
                st.warning("의사 이름은 필수입니다.")
            else:
                with SessionLocal() as s:
                    s.add(
                        Doctor(
                            tenant_id=tenant_id,
                            name=n_name.strip(),
                            specialty=n_specialty.strip() or None,
                            education_career=n_education.strip() or None,
                            certifications=n_certs.strip() or None,
                            is_active=True,
                        )
                    )
                    s.commit()
                st.success(f"{n_name} 의사 추가됨")
                st.rerun()


# ─── 장비 카드 ──────────────────────────────────────────────────


def _render_equipment_card(SessionLocal, tenant_id: int) -> None:
    with SessionLocal() as session:
        items = (
            session.query(Equipment)
            .filter(Equipment.tenant_id == tenant_id)
            .order_by(Equipment.id)
            .all()
        )
        n_active = sum(1 for e in items if e.is_active)
        n_optimized = sum(1 for e in items if e.is_complete and e.is_active)

    if n_optimized > 0:
        chip = _status_chip("optimized", f"최적화됨 · {n_optimized}개")
    elif n_active > 0:
        chip = _status_chip("info", f"등록 {n_active}개")
    else:
        chip = _status_chip("pending", "대기 중")

    with st.container(border=True):
        st.markdown(
            f"### 🩻 의료 장비 &nbsp; {chip}",
            unsafe_allow_html=True,
        )
        st.caption("콘텐츠가 실제 장비 모델명을 언급하도록.")

        for eq in items:
            badge = (
                _status_chip("optimized", "활성")
                if eq.is_active
                else _status_chip("pending", "비활성")
            )
            with st.expander(
                f"{eq.name} · {eq.manufacturer or '제조사 미입력'}",
                expanded=False,
            ):
                st.markdown(badge, unsafe_allow_html=True)
                with st.form(f"eq_edit_{eq.id}"):
                    name = st.text_input("장비 이름", value=eq.name, key=f"e_name_{eq.id}")
                    manuf = st.text_input(
                        "제조사",
                        value=eq.manufacturer or "",
                        key=f"e_man_{eq.id}",
                        placeholder="예: SCHWIND",
                    )
                    desc = st.text_area(
                        "장비 설명",
                        value=eq.description or "",
                        key=f"e_desc_{eq.id}",
                        placeholder="최첨단 엑시머 레이저 장비\n스마트펄스 기술 탑재\n안전하고 정밀한 시력교정",
                        height=100,
                    )
                    feats = st.text_area(
                        "주요 기능",
                        value=eq.features or "",
                        key=f"e_feat_{eq.id}",
                        placeholder="라식, 라섹, 스마일 라식",
                        height=70,
                    )
                    is_active = st.toggle("활성", value=eq.is_active, key=f"e_act_{eq.id}")
                    col_s, col_d = st.columns(2)
                    with col_s:
                        save = st.form_submit_button("💾 저장", use_container_width=True, type="primary")
                    with col_d:
                        delete = st.form_submit_button("🗑️ 삭제", use_container_width=True)
                if save:
                    with SessionLocal() as s:
                        obj = s.get(Equipment, eq.id)
                        if obj:
                            obj.name = name.strip()
                            obj.manufacturer = manuf.strip() or None
                            obj.description = desc.strip() or None
                            obj.features = feats.strip() or None
                            obj.is_active = is_active
                            s.commit()
                    st.success("저장됨")
                    st.rerun()
                if delete:
                    with SessionLocal() as s:
                        obj = s.get(Equipment, eq.id)
                        if obj:
                            s.delete(obj)
                            s.commit()
                    st.warning("삭제됨")
                    st.rerun()

        st.markdown("---")
        with st.form("eq_add", clear_on_submit=True):
            st.markdown("**+ 장비 추가**")
            n_name = st.text_input("장비 이름", placeholder="예: 아마리스 레드 1050RS", key="e_new_name")
            n_manuf = st.text_input("제조사", placeholder="예: SCHWIND", key="e_new_man")
            n_desc = st.text_area(
                "장비 설명",
                placeholder="최첨단 엑시머 레이저 장비\n스마트펄스 기술 탑재\n안전하고 정밀한 시력교정",
                key="e_new_desc",
                height=100,
            )
            n_feats = st.text_area(
                "주요 기능",
                placeholder="라식, 라섹, 스마일 라식",
                key="e_new_feat",
                height=70,
            )
            submitted = st.form_submit_button("➕ 추가하기", use_container_width=True, type="primary")
        if submitted:
            if not n_name.strip():
                st.warning("장비 이름은 필수입니다.")
            else:
                with SessionLocal() as s:
                    s.add(
                        Equipment(
                            tenant_id=tenant_id,
                            name=n_name.strip(),
                            manufacturer=n_manuf.strip() or None,
                            description=n_desc.strip() or None,
                            features=n_feats.strip() or None,
                            is_active=True,
                        )
                    )
                    s.commit()
                st.success(f"{n_name} 장비 추가됨")
                st.rerun()


# ─── 이벤트 카드 ────────────────────────────────────────────────


def _render_event_card(SessionLocal, tenant_id: int) -> None:
    with SessionLocal() as session:
        items = (
            session.query(EventOffer)
            .filter(EventOffer.tenant_id == tenant_id)
            .order_by(EventOffer.id)
            .all()
        )
        now = datetime.now(timezone.utc)
        n_running = sum(1 for ev in items if ev.is_currently_running(now))
        n_total = len(items)

    if n_running > 0:
        chip = _status_chip("optimized", f"진행 중 · {n_running}개")
    elif n_total > 0:
        chip = _status_chip("info", f"등록 {n_total}개")
    else:
        chip = _status_chip("pending", "대기 중")

    with st.container(border=True):
        st.markdown(
            f"### 🏷️ 이벤트 가격 &nbsp; {chip}",
            unsafe_allow_html=True,
        )
        st.caption("진행 중인 이벤트가 콘텐츠 끝에 자연 노출 (의료법 종료일 자동 반영).")

        for ev in items:
            running = ev.is_currently_running(datetime.now(timezone.utc))
            badge_color = "optimized" if running else "pending"
            badge_label = "진행 중" if running else "예정/종료"
            badge = _status_chip(badge_color, badge_label)
            with st.expander(
                f"{ev.name} · "
                f"{(ev.regular_price or 0):,}원 → {(ev.discount_price or 0):,}원",
                expanded=False,
            ):
                st.markdown(badge, unsafe_allow_html=True)
                with st.form(f"ev_edit_{ev.id}"):
                    name = st.text_input("이벤트 이름", value=ev.name, key=f"v_name_{ev.id}")
                    col_p1, col_p2 = st.columns(2)
                    with col_p1:
                        regular = st.number_input(
                            "정상 가격 (원)",
                            min_value=0,
                            step=10000,
                            value=ev.regular_price or 0,
                            key=f"v_reg_{ev.id}",
                        )
                    with col_p2:
                        discount = st.number_input(
                            "할인 가격 (원)",
                            min_value=0,
                            step=10000,
                            value=ev.discount_price or 0,
                            key=f"v_dis_{ev.id}",
                        )
                    col_d1, col_d2 = st.columns(2)
                    with col_d1:
                        ps = st.date_input(
                            "시작일",
                            value=(ev.period_start.date() if ev.period_start else datetime.now().date()),
                            key=f"v_ps_{ev.id}",
                        )
                    with col_d2:
                        pe = st.date_input(
                            "종료일",
                            value=(ev.period_end.date() if ev.period_end else datetime.now().date()),
                            key=f"v_pe_{ev.id}",
                        )
                    notes = st.text_area(
                        "조건/유의사항",
                        value=ev.notes or "",
                        key=f"v_notes_{ev.id}",
                        height=70,
                    )
                    is_active = st.toggle("활성", value=ev.is_active, key=f"v_act_{ev.id}")
                    col_s, col_dl = st.columns(2)
                    with col_s:
                        save = st.form_submit_button("💾 저장", use_container_width=True, type="primary")
                    with col_dl:
                        delete = st.form_submit_button("🗑️ 삭제", use_container_width=True)
                if save:
                    with SessionLocal() as s:
                        obj = s.get(EventOffer, ev.id)
                        if obj:
                            obj.name = name.strip()
                            obj.regular_price = int(regular) or None
                            obj.discount_price = int(discount) or None
                            obj.period_start = _to_aware(ps)
                            obj.period_end = _to_aware(pe)
                            obj.notes = notes.strip() or None
                            obj.is_active = is_active
                            s.commit()
                    st.success("저장됨")
                    st.rerun()
                if delete:
                    with SessionLocal() as s:
                        obj = s.get(EventOffer, ev.id)
                        if obj:
                            s.delete(obj)
                            s.commit()
                    st.warning("삭제됨")
                    st.rerun()

        st.markdown("---")
        with st.form("ev_add", clear_on_submit=True):
            st.markdown("**+ 이벤트 추가**")
            n_name = st.text_input("이벤트 이름", placeholder="예: 스마일 라식 특별 할인", key="v_new_name")
            col_p1, col_p2 = st.columns(2)
            with col_p1:
                n_reg = st.number_input("정상 가격 (원)", min_value=0, step=10000, value=2500000, key="v_new_reg")
            with col_p2:
                n_dis = st.number_input("할인 가격 (원)", min_value=0, step=10000, value=1890000, key="v_new_dis")
            col_d1, col_d2 = st.columns(2)
            with col_d1:
                n_ps = st.date_input("시작일", value=datetime.now().date(), key="v_new_ps")
            with col_d2:
                n_pe = st.date_input("종료일", value=datetime.now().date(), key="v_new_pe")
            n_notes = st.text_area("조건/유의사항", placeholder="예: 첫 시술자 한정. 검사료 별도.", key="v_new_notes", height=70)
            submitted = st.form_submit_button("➕ 이벤트 추가", use_container_width=True, type="primary")
        if submitted:
            if not n_name.strip():
                st.warning("이벤트 이름은 필수입니다.")
            elif _to_aware(n_pe) and _to_aware(n_ps) and _to_aware(n_pe) < _to_aware(n_ps):
                st.warning("종료일은 시작일 이후여야 합니다.")
            else:
                with SessionLocal() as s:
                    s.add(
                        EventOffer(
                            tenant_id=tenant_id,
                            name=n_name.strip(),
                            regular_price=int(n_reg) or None,
                            discount_price=int(n_dis) or None,
                            period_start=_to_aware(n_ps),
                            period_end=_to_aware(n_pe),
                            notes=n_notes.strip() or None,
                            is_active=True,
                        )
                    )
                    s.commit()
                st.success(f"{n_name} 이벤트 추가됨")
                st.rerun()


# ─── 진입점 ─────────────────────────────────────────────────────


def render_profile_tab(SessionLocal, tenant) -> None:
    """대상 정보 관리 탭 본체. 호출자(app.py)가 tenant 선택 후 호출."""
    counts = None
    with SessionLocal() as session:
        counts = has_active_data(session, tenant.id)

    st.markdown("##### 🎯 데이터 피딩 — 콘텐츠가 인용할 사실 정보")
    st.caption(
        "여기 입력하신 의사/장비/이벤트 정보가 FAQ·블로그 발행 시 LLM 컨텍스트로 자동 주입되어, "
        "콘텐츠가 추상 표현 대신 **구체 사실(의사명·장비 모델·가격·기간)**을 인용하게 됩니다. "
        "AI 검색엔진 인용도가 크게 올라갑니다."
    )

    # 요약 메트릭
    m1, m2, m3 = st.columns(3)
    m1.metric("등록 의사", f"{counts['doctors']}명")
    m2.metric("등록 장비", f"{counts['equipment']}개")
    m3.metric("진행 중 이벤트", f"{counts['active_events']}개")

    st.divider()

    col_d, col_e, col_v = st.columns(3, gap="medium")
    with col_d:
        _render_doctor_card(SessionLocal, tenant.id)
    with col_e:
        _render_equipment_card(SessionLocal, tenant.id)
    with col_v:
        _render_event_card(SessionLocal, tenant.id)
