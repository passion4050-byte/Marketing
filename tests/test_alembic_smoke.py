"""Phase 2-T1.6 — Alembic smoke test.

검증:
- in-memory SQLite 에 `alembic upgrade head` 실행 시 9개 테이블 생성 (8 baseline + reference_documents)
- 동일 DB 에 `alembic downgrade base` 실행 시 alembic_version 만 남음 (양방향 동작)
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from alembic import command
from alembic.config import Config

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_TABLES = {
    "tenants",
    "keywords",
    "compliance_rules",
    "generated_contents",
    "doctors",
    "equipment",
    "event_offers",
    "brand_voices",
    "reference_documents",
    "llm_call_logs",
    "queries",
    "responses",
    "mentions",
}


def _list_tables(db_path: str) -> set[str]:
    import sqlite3

    con = sqlite3.connect(db_path)
    rows = con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    con.close()
    return {r[0] for r in rows}


def test_alembic_upgrade_head_creates_all_tables(tmp_path):
    db = tmp_path / "smoke.db"
    cfg = Config(str(ROOT / "alembic.ini"))
    os.environ["DATABASE_URL"] = f"sqlite:///{db}"
    try:
        command.upgrade(cfg, "head")
        tables = _list_tables(str(db))
        # alembic_version 빼고 9개 모델 테이블이 모두 있어야 함
        assert EXPECTED_TABLES.issubset(tables), f"Missing tables: {EXPECTED_TABLES - tables}"
        assert "alembic_version" in tables
    finally:
        os.environ.pop("DATABASE_URL", None)


def test_alembic_downgrade_round_trip(tmp_path):
    db = tmp_path / "round_trip.db"
    cfg = Config(str(ROOT / "alembic.ini"))
    os.environ["DATABASE_URL"] = f"sqlite:///{db}"
    try:
        command.upgrade(cfg, "head")
        tables_after_up = _list_tables(str(db))
        assert "llm_call_logs" in tables_after_up
        assert "reference_documents" in tables_after_up
        assert {"queries", "responses", "mentions"}.issubset(tables_after_up)

        # downgrade 1 step — 가장 최근 마이그레이션 (measurement_tables) 만 사라져야 함
        command.downgrade(cfg, "-1")
        tables_after_down = _list_tables(str(db))
        assert "queries" not in tables_after_down
        assert "responses" not in tables_after_down
        assert "mentions" not in tables_after_down
        # 이전 마이그레이션의 테이블은 보존
        assert "llm_call_logs" in tables_after_down
        assert "reference_documents" in tables_after_down
        assert "tenants" in tables_after_down
    finally:
        os.environ.pop("DATABASE_URL", None)
