"""🔐 blogkey 멀티테넌트 격리 — URL 쿼리 ``?tenant=N&pw=...`` 또는 세션 인증. Phase 9-04.

어드민(``src/admin``) 이 발급한 ``Tenant.password_hash`` 를 verify 해서 본인 테넌트만
``_tenant_picker`` 드롭다운에 노출. 환경변수 ``TENANT_AUTH_REQUIRED=true`` 가 켜져
있을 때만 활성. 미설정/false 면 기존처럼 모든 테넌트 노출 (개발/단일 테넌트 모드).

플로우
------
1. URL ``?tenant=3&pw=xxx`` 으로 접속 → ``_authenticate_from_query()`` 가 verify
2. 통과 시 ``st.session_state[_authed_tenants]`` 에 tenant_id set 으로 누적
3. ``allowed_tenant_ids()`` 가 그 set 을 반환 — picker 가 필터에 사용
4. URL 에서 ``pw`` query 는 즉시 제거 (브라우저 history/공유 시 노출 차단)
"""

from __future__ import annotations

import os
from typing import Optional

import streamlit as st


SESSION_KEY = "_authed_tenants"


def auth_required() -> bool:
    """``TENANT_AUTH_REQUIRED`` env 가 truthy 일 때만 격리 모드 활성."""
    val = os.environ.get("TENANT_AUTH_REQUIRED", "").strip().lower()
    return val in {"1", "true", "yes", "on"}


def _authed_set() -> set[int]:
    s = st.session_state.get(SESSION_KEY)
    if not isinstance(s, set):
        s = set()
        st.session_state[SESSION_KEY] = s
    return s


def authenticate_from_query(SessionLocal) -> Optional[int]:
    """URL ``?tenant=N&pw=...`` 처리 — verify 통과 시 tenant_id 반환 + 세션에 저장.

    ``pw`` 쿼리 파라미터는 검증 직후 삭제해서 URL 공유 시 평문 유출을 차단.
    실패 시 None 반환 (조용히 — picker 에서 빈 결과로 드러남).
    """
    from src.admin.passwords import verify_password
    from src.storage.models import Tenant

    qs = st.query_params
    raw_tid = qs.get("tenant")
    pw = qs.get("pw")
    if not raw_tid or not pw:
        return None
    try:
        tid = int(raw_tid)
    except (TypeError, ValueError):
        return None

    # pw 파라미터 즉시 삭제 (검증은 아래에서)
    try:
        del qs["pw"]
    except Exception:
        pass

    with SessionLocal() as s:
        t = s.get(Tenant, tid)
        stored = getattr(t, "password_hash", None) if t else None
    if not verify_password(pw, stored):
        return None

    _authed_set().add(tid)
    return tid


def allowed_tenant_ids() -> set[int]:
    """현재 세션에서 인증된 tenant_id 집합 (auth_required=False 일 땐 의미 없음)."""
    return set(_authed_set())


def is_tenant_authed(tenant_id: int) -> bool:
    return tenant_id in _authed_set()


def render_login_form(SessionLocal) -> bool:
    """직접 로그인 — URL 쿼리 외에도 화면에서 tenant_id + pw 입력 가능.

    어드민(blogkey-adm)에서 발급받은 **로그인 ID** + **비밀번호** 그대로 입력하면 통과.
    ID 는 테넌트 번호 (정수). 잘못된 입력은 같은 메시지로 통일 — enumeration 방지.

    Returns:
        True if 새로 인증 추가됨 (caller 가 rerun 호출).
    """
    from src.admin.passwords import verify_password
    from src.storage.models import Tenant

    st.markdown("### 🔐 클라이언트 접속")
    st.caption(
        "메디맵에서 발급받은 **로그인 ID** 와 **비밀번호** 를 입력하세요. "
        "받지 못하셨다면 메디맵 담당자에게 문의해주세요. "
        "📧 `passion4050@gmail.com`"
    )
    with st.form("blogkey_tenant_login", clear_on_submit=False):
        col_a, col_b = st.columns([1, 2])
        tid_str = col_a.text_input(
            "로그인 ID",
            placeholder="예: 1",
            help="메디맵에서 발급받은 정수 ID",
        )
        pw = col_b.text_input(
            "비밀번호",
            type="password",
            placeholder="발급받은 비밀번호",
        )
        submitted = st.form_submit_button(
            "🔐 접속", type="primary", use_container_width=True,
        )

    # 같은 메시지로 통일 (ID/PW 어느 쪽이 틀렸는지 노출 X)
    GENERIC_FAIL = "ID 또는 비밀번호가 올바르지 않습니다. 발급받은 정보를 다시 확인하세요."

    if not submitted:
        return False
    if not tid_str or not pw:
        st.error("ID 와 비밀번호를 모두 입력하세요.")
        return False
    try:
        tid = int(tid_str.strip())
    except (TypeError, ValueError):
        st.error(GENERIC_FAIL)
        return False
    with SessionLocal() as s:
        t = s.get(Tenant, tid)
        stored = getattr(t, "password_hash", None) if t else None
    if not verify_password(pw, stored):
        st.error(GENERIC_FAIL)
        return False
    _authed_set().add(tid)
    st.success(f"✅ {t.name} 으로 접속 완료")
    return True
