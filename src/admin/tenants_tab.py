"""🏢 테넌트 — 추가/편집/비활성 + 클라이언트 비밀번호 발급. Phase 9-02.

TenantPassword 모델은 Phase 9-04 에서 추가 예정. 이번 plan 에서는 기본 환경변수
패턴(``TENANT_PASSWORD_{tenant_id}``) 으로 운영 — 어드민에서 새 비번 발급 시
사용자에게 string 으로 표시하고 클립보드에 복사 (DB 영속 X). 다음 plan 에서
Tenant 모델에 hashed_password column + reset 기능 추가.
"""

from __future__ import annotations

import secrets
import string

import streamlit as st


def _gen_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def render_tenants_tab(SessionLocal) -> None:
    from src.storage.models import Tenant

    st.markdown("### 🏢 테넌트 관리")
    st.caption(
        "클라이언트(병·의원)를 추가/편집/비활성하고, blogkey 접속용 비밀번호를 발급합니다. "
        "비밀번호는 발급 시 1회만 표시되니 즉시 클라이언트에게 전달하세요."
    )

    with SessionLocal() as s:
        rows = s.query(Tenant).order_by(Tenant.id.desc()).all()
        data = [
            {
                "id": t.id,
                "name": t.name,
                "domain_category": t.domain_category,
                "region": t.region,
                "address": t.address or "—",
                "phone": t.phone or "—",
                "homepage": t.homepage or "—",
                "naver_place_url": t.naver_place_url or "—",
                "created_at": t.created_at.strftime("%Y-%m-%d") if t.created_at else "—",
            }
            for t in rows
        ]
    st.markdown(f"#### 등록된 테넌트 ({len(data)}건)")
    if data:
        st.dataframe(
            data,
            use_container_width=True,
            column_config={
                "id": st.column_config.NumberColumn("ID", width="small"),
                "name": st.column_config.TextColumn("이름", width="medium"),
                "domain_category": "분야",
                "region": "지역",
                "homepage": st.column_config.LinkColumn("홈페이지"),
                "naver_place_url": st.column_config.LinkColumn("네이버 플레이스"),
            },
            hide_index=True,
        )
    else:
        st.info("등록된 테넌트가 없습니다. 아래에서 첫 테넌트를 추가하세요.")

    st.markdown("---")
    _add_tenant_form(SessionLocal)
    if rows:
        st.markdown("---")
        _edit_tenant_form(SessionLocal, rows)
        st.markdown("---")
        _password_section(rows)


def _add_tenant_form(SessionLocal) -> None:
    from src.storage.models import Tenant

    with st.expander("➕ 새 테넌트 추가", expanded=False):
        with st.form("admin_new_tenant", clear_on_submit=True):
            col_a, col_b = st.columns(2)
            name = col_a.text_input("이름 *", placeholder="예: 밝은눈안과")
            domain_category = col_b.text_input(
                "분야", placeholder="예: 안과/시력교정",
            )
            col_c, col_d = st.columns(2)
            region = col_c.text_input("지역", placeholder="예: 서울 강남")
            phone = col_d.text_input("전화", placeholder="예: 1588-3989")
            address = st.text_input("주소", placeholder="예: 서울시 강남구...")
            homepage = st.text_input(
                "홈페이지 URL", placeholder="https://...",
            )
            naver_place_url = st.text_input(
                "네이버 플레이스 URL",
                placeholder="https://map.naver.com/p/entry/place/...",
            )
            business_model = st.text_area(
                "비즈니스 모델 (콘텐츠 생성 컨텍스트)",
                height=68,
                placeholder="예: 라식/라섹/렌즈삽입술 전문 안과. 30~40대 직장인 타겟...",
            )
            submitted = st.form_submit_button(
                "🏢 추가", type="primary", use_container_width=True,
            )
        if submitted:
            if not name.strip():
                st.error("이름은 필수입니다.")
                return
            with SessionLocal() as s:
                exists = s.query(Tenant).filter(Tenant.name == name.strip()).first()
                if exists is not None:
                    st.warning(f"동일한 이름의 테넌트가 이미 존재합니다 (id={exists.id}).")
                    return
                t = Tenant(
                    name=name.strip(),
                    domain_category=domain_category.strip() or "기타",
                    region=region.strip() or "전국",
                    address=address.strip() or None,
                    naver_place_url=naver_place_url.strip() or None,
                    phone=phone.strip() or None,
                    homepage=homepage.strip() or None,
                    business_model=business_model.strip(),
                )
                s.add(t)
                s.commit()
                new_id = t.id
            st.success(f"✅ 테넌트 추가됨 — id={new_id}, name={name.strip()}")
            st.rerun()


def _edit_tenant_form(SessionLocal, rows: list) -> None:
    from src.storage.models import Tenant

    with st.expander("✏️ 테넌트 편집", expanded=False):
        labels = {f"#{t.id} {t.name}": t.id for t in rows}
        if not labels:
            return
        choice = st.selectbox(
            "테넌트 선택",
            list(labels.keys()),
            key="admin_edit_tenant_pick",
        )
        tid = labels[choice]
        with SessionLocal() as s:
            t = s.get(Tenant, tid)
            if t is None:
                st.error("테넌트가 존재하지 않습니다.")
                return
            current = {
                "phone": t.phone or "",
                "address": t.address or "",
                "homepage": t.homepage or "",
                "naver_place_url": t.naver_place_url or "",
                "business_model": t.business_model or "",
            }
        with st.form(f"admin_edit_tenant_{tid}"):
            phone = st.text_input("전화", value=current["phone"])
            address = st.text_input("주소", value=current["address"])
            homepage = st.text_input("홈페이지", value=current["homepage"])
            naver_place_url = st.text_input(
                "네이버 플레이스 URL", value=current["naver_place_url"],
            )
            business_model = st.text_area(
                "비즈니스 모델", value=current["business_model"], height=80,
            )
            saved = st.form_submit_button(
                "💾 저장", type="primary", use_container_width=True,
            )
        if saved:
            with SessionLocal() as s:
                t = s.get(Tenant, tid)
                if t is None:
                    st.error("테넌트가 존재하지 않습니다.")
                    return
                t.phone = phone.strip() or None
                t.address = address.strip() or None
                t.homepage = homepage.strip() or None
                t.naver_place_url = naver_place_url.strip() or None
                t.business_model = business_model.strip()
                s.commit()
            st.success("✅ 저장됨")
            st.rerun()


def _password_section(rows: list) -> None:
    """비밀번호 발급 — Phase 9-02 임시: 환경변수 컨벤션 안내.

    Phase 9-04 에서 Tenant.password_hash column 추가 후 진짜 발급/리셋 기능 도입.
    """
    with st.expander("🔑 클라이언트 비밀번호 발급 (임시)", expanded=False):
        st.caption(
            "**임시 운영안**: blogkey 의 `_tenant_picker` 격리(Phase 9-04)가 들어오기 전까지는 "
            "Streamlit Cloud secrets 에 `TENANT_PASSWORD_{id}` 형태로 등록하고 클라이언트에게 "
            "URL 쿼리 파라미터(예: `?tenant=1&pw=abc`) 로 접속 가이드 제공. "
            "Phase 9-04 에서 Tenant.password_hash + 정식 로그인 도입 예정."
        )
        labels = {f"#{t.id} {t.name}": t.id for t in rows}
        choice = st.selectbox(
            "테넌트 선택",
            list(labels.keys()),
            key="admin_pw_pick",
        )
        tid = labels[choice]
        if st.button("🎲 새 비밀번호 생성", key=f"admin_pw_gen_{tid}"):
            new_pw = _gen_password(14)
            st.session_state[f"_admin_pw_show_{tid}"] = new_pw
        shown = st.session_state.get(f"_admin_pw_show_{tid}")
        if shown:
            st.success("✅ 새 비밀번호 (1회 표시 — 즉시 복사):")
            st.code(shown, language=None)
            st.info(
                f"Streamlit Cloud secrets 에 다음 줄 추가:\n```\n"
                f"TENANT_PASSWORD_{tid} = \"{shown}\"\n```"
            )
            st.caption("이 화면을 닫으면 비밀번호가 사라집니다 — 즉시 클라이언트에게 전달.")
