"""Alembic env — Phase 2 도입.

핵심:
- DATABASE_URL 환경변수에서 동적으로 URL 로드 (SQLite 기본 + Postgres 호환)
- target_metadata = src.storage.models.Base.metadata (autogenerate 지원)
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

# 프로젝트 루트를 sys.path 에 추가 — `src.storage.models` import 가능하도록
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# .env 자동 로드 (로컬 개발 시)
try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except Exception:
    pass

from src.storage.models import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL 환경변수 우선, 없으면 alembic.ini 의 sqlalchemy.url, 그것도 없으면 기본 SQLite
db_url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url") or "sqlite:///./data/geo.db"
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Offline mode — URL 만으로 SQL 문을 출력."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=url.startswith("sqlite"),  # SQLite ALTER 호환
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online mode — 실제 엔진에 연결하여 마이그레이션 실행."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=is_sqlite,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
