"""DB 엔진/세션 팩토리. SQLite → PostgreSQL 마이그레이션 가능한 형태로 정의."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base


def _resolve_database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///./data/geo.db")
    # SQLite의 경우 파일 경로 디렉토리 미리 확보
    if url.startswith("sqlite:///"):
        path_str = url.replace("sqlite:///", "", 1)
        path = Path(path_str)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)
    return url


_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine():
    global _engine
    if _engine is None:
        url = _resolve_database_url()
        _engine = create_engine(url, echo=False, future=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False, future=True)
    return _SessionLocal


def session_scope() -> Iterator[Session]:
    """간이 컨텍스트 매니저 — Streamlit/스크립트에서 사용."""
    factory = get_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_all() -> None:
    Base.metadata.create_all(get_engine())


def drop_all() -> None:
    Base.metadata.drop_all(get_engine())
