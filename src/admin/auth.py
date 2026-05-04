"""어드민 인증 — ``ADMIN_APP_PASSWORD`` 게이트.

blogkey 의 APP_PASSWORD 와 *별개* 의 비밀번호. 환경변수 또는 Streamlit secrets
에 ``ADMIN_APP_PASSWORD`` 로 설정. 미설정 시 기본 비밀번호 ``"admin"`` 사용 (개발).
"""

from __future__ import annotations

import os
from typing import Optional

import streamlit as st


_SESSION_KEY = "_admin_authenticated"


def _expected_password() -> Optional[str]:
    return os.environ.get("ADMIN_APP_PASSWORD") or os.environ.get("APP_PASSWORD_ADMIN")


def is_authenticated() -> bool:
    return st.session_state.get(_SESSION_KEY) is True


def require_admin_login() -> bool:
    """비밀번호 입력 게이트. 통과 시 True 반환, 미통과 시 False (페이지 차단)."""
    if is_authenticated():
        return True

    expected = _expected_password()
    if not expected:
        st.warning(
            "⚠️ ADMIN_APP_PASSWORD 환경변수 미설정. 기본 비밀번호 `admin` 으로 임시 동작 중."
        )
        expected = "admin"

    st.markdown("## 🔒 메디맵 어드민")
    st.caption(
        "메디맵 직원 전용 — 모든 테넌트를 통합 관리합니다. "
        "클라이언트 제품(blogkey)과는 별도 비밀번호."
    )
    pw = st.text_input(
        "Admin password", type="password", key="_admin_pw_input",
    )
    col_btn, _ = st.columns([1, 4])
    if col_btn.button("로그인", type="primary"):
        if pw == expected:
            st.session_state[_SESSION_KEY] = True
            st.success("✅ 인증 통과")
            st.rerun()
        else:
            st.error("비밀번호가 일치하지 않습니다.")
    return False


def logout_button() -> None:
    if st.sidebar.button("🚪 로그아웃", key="_admin_logout"):
        st.session_state.pop(_SESSION_KEY, None)
        st.rerun()
