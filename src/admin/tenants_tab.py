"""🏢 테넌트 — CRUD + 계정 관리(계정 정보 리스트 + 비번 발급/수정/무효화 + 완전 삭제). Phase 9-04+.

Phase 9-04 에서 ``Tenant.password_hash`` + ``password_set_at`` 컬럼 추가.
어드민에서 모든 클라이언트 계정을 한 곳에서 관리:
- 계정 정보 리스트: ID/이름/비번 상태/마지막 변경일
- 비번 발급: 자동 생성 (14자) 또는 어드민이 직접 입력
- 비번 무효화: password_hash=NULL → 즉시 로그인 차단, 데이터 보존
- 테넌트 완전 삭제: cascade 로 콘텐츠/Publication 모두 삭제 (이름 입력 확인 필수)
"""

from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone

import streamlit as st


MIN_PW_LENGTH = 8


def _gen_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate_manual_pw(pw: str) -> str | None:
    """수동 입력 비번 검증 — 길이/문자 종류. None=OK, str=에러 메시지."""
    if len(pw) < MIN_PW_LENGTH:
        return f"비밀번호는 최소 {MIN_PW_LENGTH}자 이상이어야 합니다."
    if not any(c.isalpha() for c in pw) or not any(c.isdigit() for c in pw):
        return "비밀번호는 영문과 숫자를 모두 포함해야 합니다."
    return None


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
        _account_management(SessionLocal, rows)
        st.markdown("---")
        _edit_tenant_form(SessionLocal, rows)
        st.markdown("---")
        _danger_zone(SessionLocal, rows)


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


def _account_management(SessionLocal, rows: list) -> None:
    """🔑 클라이언트 계정 관리 — 정보 리스트 + 자동/수동 발급 + 무효화.

    blogkey 접속용 계정. ID = ``Tenant.id`` (정수), 비번 = pbkdf2_sha256 해시로 영속.
    어드민이 잊은 비번은 복구 불가 — 새로 발급해서 클라이언트에게 다시 전달.
    """
    from src.admin.passwords import hash_password
    from src.storage.models import Tenant

    st.markdown("#### 🔑 클라이언트 계정 관리")
    st.caption(
        "blogkey(클라이언트 제품) 접속용 ID + 비밀번호. "
        "ID 는 테넌트 번호(정수), 비번은 발급 시 1회만 평문 표시 — 즉시 클라이언트에 전달."
    )
    if not hasattr(Tenant, "password_hash"):
        st.warning(
            "⚠️ ORM 캐시가 구 모델을 들고 있어 `password_hash` 컬럼이 보이지 않습니다. "
            "Streamlit Cloud 어드민 앱을 **Reboot** 하세요."
        )
        return

    # ─── 계정 정보 리스트 (모든 테넌트의 비번 상태 한눈에) ───────
    with SessionLocal() as s:
        all_tenants = s.query(Tenant).order_by(Tenant.id).all()
        account_rows = []
        for t in all_tenants:
            has_hash = bool(getattr(t, "password_hash", None))
            set_at = getattr(t, "password_set_at", None)
            account_rows.append({
                "id": t.id,
                "name": t.name,
                "login_url": f"https://blogkey.streamlit.app/?tenant={t.id}",
                "status": "🟢 설정됨" if has_hash else "⚪️ 미설정",
                "last_changed": (
                    set_at.strftime("%Y-%m-%d %H:%M") if set_at else "—"
                ),
            })

    st.dataframe(
        account_rows,
        use_container_width=True,
        column_config={
            "id": st.column_config.NumberColumn("ID", width="small"),
            "name": st.column_config.TextColumn("테넌트 이름", width="medium"),
            "login_url": st.column_config.LinkColumn(
                "접속 URL (베이스)", width="medium",
                help="비번 입력 후 ?pw=... 형태로 클라이언트에 전달",
            ),
            "status": st.column_config.TextColumn("비번 상태", width="small"),
            "last_changed": st.column_config.TextColumn("마지막 변경", width="small"),
        },
        hide_index=True,
    )

    st.markdown("---")
    # ─── 액션: 테넌트 선택 + 4가지 액션 ───────────────────────
    labels = {f"#{t.id} {t.name}": t.id for t in rows}
    choice = st.selectbox("테넌트 선택", list(labels.keys()), key="admin_acct_pick")
    tid = labels[choice]

    with SessionLocal() as s:
        t = s.get(Tenant, tid)
        has_hash = bool(getattr(t, "password_hash", None)) if t else False
        last_changed = getattr(t, "password_set_at", None) if t else None
    info_col, _ = st.columns([3, 1])
    info_col.markdown(
        f"**테넌트 #{tid} {t.name if t else ''}** — "
        f"{'🟢 비번 설정됨' if has_hash else '⚪️ 비번 미설정'}"
        + (f" (마지막 변경: {last_changed.strftime('%Y-%m-%d %H:%M')})" if last_changed else "")
    )

    tab_auto, tab_manual, tab_revoke = st.tabs([
        "🎲 자동 생성 발급",
        "✏️ 수동 입력 발급",
        "🔒 비번 무효화",
    ])

    # ── 자동 생성 ────────────────────────────────────────────
    with tab_auto:
        st.caption("14자 영숫자 안전 비밀번호를 자동으로 생성합니다.")
        if st.button(
            "🎲 새 비밀번호 발급" if not has_hash else "🔄 비밀번호 재발급",
            key=f"admin_pw_gen_{tid}",
            type="primary",
        ):
            new_pw = _gen_password(14)
            with SessionLocal() as s:
                t = s.get(Tenant, tid)
                if t is None:
                    st.error("테넌트가 존재하지 않습니다.")
                    return
                t.password_hash = hash_password(new_pw)
                t.password_set_at = _now()
                s.commit()
            st.session_state[f"_admin_pw_show_{tid}"] = new_pw
            st.rerun()

    # ── 수동 입력 ────────────────────────────────────────────
    with tab_manual:
        st.caption(
            f"어드민이 직접 비번을 정해서 발급. 최소 {MIN_PW_LENGTH}자, 영문+숫자 조합 필수. "
            "클라이언트가 외우기 쉬운 비번을 원할 때 사용."
        )
        with st.form(f"admin_pw_manual_{tid}", clear_on_submit=True):
            pw1 = st.text_input("새 비밀번호", type="password", key=f"manual_pw1_{tid}")
            pw2 = st.text_input("비밀번호 확인", type="password", key=f"manual_pw2_{tid}")
            submitted = st.form_submit_button(
                "✏️ 이 비밀번호로 설정", type="primary", use_container_width=True,
            )
        if submitted:
            if pw1 != pw2:
                st.error("두 입력이 일치하지 않습니다.")
            elif (err := _validate_manual_pw(pw1)) is not None:
                st.error(err)
            else:
                with SessionLocal() as s:
                    t = s.get(Tenant, tid)
                    if t is None:
                        st.error("테넌트가 존재하지 않습니다.")
                        return
                    t.password_hash = hash_password(pw1)
                    t.password_set_at = _now()
                    s.commit()
                st.session_state[f"_admin_pw_show_{tid}"] = pw1
                st.rerun()

    # ── 비번 무효화 (로그인 차단, 데이터 유지) ───────────────────
    with tab_revoke:
        st.caption(
            "비번을 즉시 무효화 합니다. 클라이언트는 더 이상 blogkey 에 접속할 수 없지만 "
            "테넌트 데이터(콘텐츠/Publication/통계)는 모두 보존됩니다. 재발급으로 복구 가능."
        )
        if not has_hash:
            st.info("이 테넌트는 현재 비번이 설정되어 있지 않습니다.")
        else:
            confirm = st.checkbox(
                f"확인 — 테넌트 #{tid} {t.name if t else ''} 의 접속을 즉시 차단합니다.",
                key=f"admin_revoke_confirm_{tid}",
            )
            if st.button(
                "🔒 지금 무효화",
                key=f"admin_revoke_btn_{tid}",
                disabled=not confirm,
            ):
                with SessionLocal() as s:
                    t = s.get(Tenant, tid)
                    if t is None:
                        st.error("테넌트가 존재하지 않습니다.")
                        return
                    t.password_hash = None
                    t.password_set_at = _now()
                    s.commit()
                st.session_state.pop(f"_admin_pw_show_{tid}", None)
                st.success(f"✅ 테넌트 #{tid} 의 비밀번호 무효화 완료. 클라이언트 즉시 접속 차단.")
                st.rerun()

    # ─── 발급 직후 평문 표시 (1회) ────────────────────────────
    shown = st.session_state.get(f"_admin_pw_show_{tid}")
    if shown:
        st.markdown("---")
        st.success("✅ 새 비밀번호 (1회 표시 — 즉시 복사):")
        col_id, col_pw = st.columns(2)
        col_id.metric("로그인 ID", f"{tid}")
        col_pw.code(shown, language=None)
        st.info(
            "**클라이언트 접속 URL** (한 번에 보내기 — 비번 자동 입력):\n"
            f"```\nhttps://blogkey.streamlit.app/?tenant={tid}&pw={shown}\n```\n\n"
            "또는 클라이언트가 https://blogkey.streamlit.app 에 직접 접속해서 "
            f"로그인 폼에 **ID={tid}, 비번={shown}** 입력해도 동일하게 동작합니다."
        )
        st.caption(
            "이 화면을 닫거나 다른 테넌트를 선택하면 평문이 사라집니다. "
            "DB 에는 해시만 저장되어 있어 복구 불가능."
        )
        if st.button("✓ 클라이언트에게 전달 완료", key=f"admin_pw_clear_{tid}"):
            st.session_state.pop(f"_admin_pw_show_{tid}", None)
            st.rerun()


def _danger_zone(SessionLocal, rows: list) -> None:
    """🗑️ 테넌트 완전 삭제 — cascade 로 모든 데이터 삭제. 이름 재입력 확인 필수."""
    from src.storage.models import Tenant

    with st.expander("⚠️ Danger Zone — 테넌트 완전 삭제", expanded=False):
        st.warning(
            "**이 작업은 되돌릴 수 없습니다.** 테넌트와 함께 cascade 로 다음 데이터가 모두 삭제됩니다:\n"
            "- 의사/장비/이벤트 정보 · 브랜드 보이스\n"
            "- 모든 생성된 콘텐츠 · 참고 자료(ReferenceDocument)\n"
            "- Publication / ShortLink / ShortLinkClick / 측정 데이터(Query/Response/Mention)\n"
            "- LLM 호출 로그 / 비용 누적치\n\n"
            "데이터를 보존하면서 접속만 차단하고 싶으면 **🔒 비번 무효화** 를 사용하세요."
        )
        labels = {f"#{t.id} {t.name}": t.id for t in rows}
        choice = st.selectbox("삭제할 테넌트 선택", list(labels.keys()), key="admin_del_pick")
        tid = labels[choice]
        target_name = next((t.name for t in rows if t.id == tid), "")

        confirm_name = st.text_input(
            f"확인을 위해 테넌트 이름 **`{target_name}`** 을 정확히 입력하세요:",
            key=f"admin_del_confirm_{tid}",
        )
        name_ok = confirm_name.strip() == target_name
        if confirm_name and not name_ok:
            st.error("이름이 일치하지 않습니다.")
        if st.button(
            "🗑️ 영구 삭제",
            key=f"admin_del_btn_{tid}",
            disabled=not name_ok,
            type="primary",
        ):
            with SessionLocal() as s:
                t = s.get(Tenant, tid)
                if t is None:
                    st.error("테넌트가 존재하지 않습니다.")
                    return
                s.delete(t)
                s.commit()
            st.success(f"✅ 테넌트 #{tid} `{target_name}` 영구 삭제 완료.")
            st.rerun()
