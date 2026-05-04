"""계정 관리 — 수동 비번 검증, 비번 무효화, 테넌트 cascade 삭제."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.admin.passwords import hash_password, verify_password
from src.admin.tenants_tab import _validate_manual_pw
from src.storage.models import Base, Tenant


def _fresh_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ─── 수동 비번 검증 ──────────────────────────────────────────


@pytest.mark.parametrize(
    "pw,expected_ok",
    [
        ("abc12345", True),       # 8자 영숫자 OK
        ("Strong123!", True),     # 길이/문자 OK
        ("short1", False),        # 너무 짧음
        ("12345678", False),      # 숫자만
        ("abcdefgh", False),      # 영문만
        ("", False),              # 빈 문자열
    ],
)
def test_validate_manual_pw(pw, expected_ok):
    err = _validate_manual_pw(pw)
    assert (err is None) == expected_ok, f"pw={pw!r} err={err!r}"


# ─── 비번 무효화 = password_hash NULL ────────────────────────


def test_revoke_password_blocks_login():
    SessionLocal = _fresh_db()
    plain = "client-pw-1234"
    with SessionLocal() as s:
        t = Tenant(
            name="A", domain_category="x", region="x",
            password_hash=hash_password(plain),
        )
        s.add(t)
        s.commit()
        tid = t.id

    # verify 가 잘 통과하는 상태
    with SessionLocal() as s:
        assert verify_password(plain, s.get(Tenant, tid).password_hash) is True

    # 무효화: password_hash → None
    with SessionLocal() as s:
        s.get(Tenant, tid).password_hash = None
        s.commit()

    # 같은 비번으로도 verify 실패
    with SessionLocal() as s:
        assert verify_password(plain, s.get(Tenant, tid).password_hash) is False


# ─── 테넌트 hard delete cascade ────────────────────────────


def test_tenant_delete_cascades_to_dependent_rows():
    """Keyword 가 cascade 로 함께 삭제되는지 — 어드민 'Danger Zone' 의 invariant."""
    from src.storage.models import Keyword

    SessionLocal = _fresh_db()
    with SessionLocal() as s:
        t = Tenant(name="A", domain_category="x", region="x")
        s.add(t)
        s.commit()
        kw = Keyword(tenant_id=t.id, text="라식")
        s.add(kw)
        s.commit()
        tid = t.id
        kw_id = kw.id

    # 테넌트 삭제 → keyword 도 cascade
    with SessionLocal() as s:
        s.delete(s.get(Tenant, tid))
        s.commit()

    with SessionLocal() as s:
        assert s.get(Tenant, tid) is None
        assert s.get(Keyword, kw_id) is None


# ─── password_set_at 컬럼 round-trip ──────────────────────


def test_password_set_at_round_trip():
    from datetime import datetime, timezone

    SessionLocal = _fresh_db()
    now = datetime.now(timezone.utc)
    with SessionLocal() as s:
        t = Tenant(
            name="A", domain_category="x", region="x",
            password_hash=hash_password("p1"),
            password_set_at=now,
        )
        s.add(t)
        s.commit()
        tid = t.id
    with SessionLocal() as s:
        loaded = s.get(Tenant, tid)
        assert loaded.password_set_at is not None
        # SQLite 는 tz 를 영속 안 함 (naive 로 read) — naive 로 통일해서 5초 이내 비교.
        # Postgres 에선 tz 그대로 보존됨.
        loaded_naive = loaded.password_set_at.replace(tzinfo=None)
        now_naive = now.replace(tzinfo=None)
        assert abs((loaded_naive - now_naive).total_seconds()) < 5
