"""src/dashboard/tenant_auth.py — auth 헬퍼 단위 테스트.

Streamlit session_state / query_params 는 진짜 streamlit runtime 없이는 흉내가
어렵기 때문에, 여기서는 verify_password 를 통한 로직 단위만 검증하고
``authenticate_from_query`` / ``render_login_form`` 의 streamlit 의존부는
런타임 통합 테스트(미커버) 대상으로 둔다.

대신 모델·해시 round-trip 으로 ``Tenant.password_hash`` 컬럼이 실제 DB 에 쓰이고
verify 가 그 값으로 통과하는지 확인 — 이게 9-04 의 핵심 invariant.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.admin.passwords import hash_password, verify_password
from src.storage.models import Base, Tenant


def _fresh_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def test_tenant_password_hash_persists_and_verifies():
    SessionLocal = _fresh_db()
    plain = "client-pw-abc-123"
    with SessionLocal() as s:
        t = Tenant(
            name="테스트 의원",
            domain_category="안과",
            region="서울",
            password_hash=hash_password(plain),
        )
        s.add(t)
        s.commit()
        tid = t.id

    with SessionLocal() as s:
        loaded = s.get(Tenant, tid)
        assert loaded is not None
        assert loaded.password_hash and loaded.password_hash.startswith("pbkdf2_sha256$")
        assert verify_password(plain, loaded.password_hash) is True
        assert verify_password("wrong", loaded.password_hash) is False


def test_tenant_password_hash_rotates_on_reissue():
    SessionLocal = _fresh_db()
    with SessionLocal() as s:
        t = Tenant(
            name="A",
            domain_category="x",
            region="x",
            password_hash=hash_password("old-pw"),
        )
        s.add(t)
        s.commit()
        tid = t.id
        old_hash = t.password_hash

    # 재발급
    with SessionLocal() as s:
        t = s.get(Tenant, tid)
        t.password_hash = hash_password("new-pw")
        s.commit()

    with SessionLocal() as s:
        loaded = s.get(Tenant, tid)
        assert loaded.password_hash != old_hash
        assert verify_password("new-pw", loaded.password_hash)
        assert not verify_password("old-pw", loaded.password_hash)


def test_auth_required_env_flag():
    from src.dashboard import tenant_auth

    prev = os.environ.get("TENANT_AUTH_REQUIRED")
    try:
        os.environ.pop("TENANT_AUTH_REQUIRED", None)
        assert tenant_auth.auth_required() is False

        os.environ["TENANT_AUTH_REQUIRED"] = "false"
        assert tenant_auth.auth_required() is False

        os.environ["TENANT_AUTH_REQUIRED"] = "true"
        assert tenant_auth.auth_required() is True

        os.environ["TENANT_AUTH_REQUIRED"] = "1"
        assert tenant_auth.auth_required() is True

        os.environ["TENANT_AUTH_REQUIRED"] = "ON"
        assert tenant_auth.auth_required() is True
    finally:
        if prev is None:
            os.environ.pop("TENANT_AUTH_REQUIRED", None)
        else:
            os.environ["TENANT_AUTH_REQUIRED"] = prev
