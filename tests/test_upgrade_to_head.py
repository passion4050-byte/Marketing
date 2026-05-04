"""upgrade_to_head() — 누락 컬럼 자동 ALTER ADD + alembic stamp.

production 시나리오: alembic_version 추적이 없는 DB 에 ORM 에 신규 nullable 컬럼이
추가됐을 때, 부트스트랩에서 자동으로 컬럼이 추가되는지 검증.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.storage import db as db_module
from src.storage.models import Base, Tenant


@pytest.fixture
def fresh_sqlite_db(tmp_path, monkeypatch):
    """임시 SQLite DB — 각 테스트마다 격리된 파일."""
    db_path = tmp_path / "test_upgrade.db"
    url = f"sqlite:///{db_path}"
    monkeypatch.setenv("DATABASE_URL", url)
    # 모듈 레벨 캐시 reset
    monkeypatch.setattr(db_module, "_engine", None)
    monkeypatch.setattr(db_module, "_SessionLocal", None)
    yield url


def test_add_missing_nullable_column(fresh_sqlite_db):
    """tenants 테이블이 있지만 password_set_at 컬럼이 없을 때, upgrade_to_head 가 추가."""
    url = fresh_sqlite_db
    engine = create_engine(url)

    # 1. password_set_at 없는 형태로 tenants 테이블 직접 생성
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE tenants (
                id INTEGER PRIMARY KEY,
                name VARCHAR(200) UNIQUE NOT NULL,
                domain_category VARCHAR(100) NOT NULL,
                region VARCHAR(100) NOT NULL,
                business_model TEXT DEFAULT '',
                address VARCHAR(300),
                naver_place_url VARCHAR(500),
                phone VARCHAR(50),
                homepage VARCHAR(300),
                password_hash VARCHAR(200),
                created_at TIMESTAMP NOT NULL
            )
        """))

    # 2. 컬럼 누락 확인
    insp = inspect(engine)
    cols_before = {c["name"] for c in insp.get_columns("tenants")}
    assert "password_set_at" not in cols_before

    # 3. upgrade_to_head 호출
    db_module._engine = engine  # 동일 engine 강제
    ok, msg = db_module.upgrade_to_head()
    assert ok, f"upgrade_to_head 실패: {msg}"

    # 4. 컬럼 추가 확인
    insp2 = inspect(engine)
    cols_after = {c["name"] for c in insp2.get_columns("tenants")}
    assert "password_set_at" in cols_after, f"컬럼 미추가. msg={msg}"


def test_alembic_stamp_head_when_no_version_table(fresh_sqlite_db):
    """alembic_version 테이블 없으면 stamp head 가 적용 — 향후 alembic upgrade 정상 작동."""
    url = fresh_sqlite_db
    engine = create_engine(url)
    Base.metadata.create_all(engine)

    insp_before = inspect(engine)
    assert "alembic_version" not in insp_before.get_table_names()

    db_module._engine = engine
    ok, _ = db_module.upgrade_to_head()
    assert ok

    insp_after = inspect(engine)
    assert "alembic_version" in insp_after.get_table_names()

    # alembic_version 에 head revision 박혔는지
    with engine.begin() as conn:
        rev = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    assert rev is not None and len(rev) >= 8


def test_idempotent(fresh_sqlite_db):
    """두 번 호출해도 안전 — 두 번째 호출은 added_cols 가 비어있음."""
    url = fresh_sqlite_db
    engine = create_engine(url)
    Base.metadata.create_all(engine)

    db_module._engine = engine
    ok1, msg1 = db_module.upgrade_to_head()
    ok2, msg2 = db_module.upgrade_to_head()
    assert ok1 and ok2
    # 두 번째 호출은 추가할 컬럼이 없음
    assert msg2 is None or "added cols:" not in (msg2 or "")
