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


def upgrade_to_head() -> tuple[bool, str | None]:
    """Streamlit Cloud 부트스트랩에서 호출 — Alembic 을 head 까지 적용.

    Streamlit Community Cloud 는 shell 접근이 없어 alembic CLI 를 따로 못 돌림.
    `create_all()` 은 신규 테이블만 만들고 기존 테이블의 ALTER 는 못 하므로,
    column 이 추가된 신규 마이그레이션이 production 에 적용되도록 부트스트랩에서
    프로그램 방식으로 ``upgrade head`` 를 호출. 실패 시 (False, 에러 메시지) 반환 —
    호출자가 사이드바/배너로 표시. 무한 루프/실패 캐스케이드 방지.
    """
    try:
        from pathlib import Path

        from alembic import command
        from alembic.config import Config

        ini_path = Path(__file__).resolve().parent.parent.parent / "alembic.ini"
        if not ini_path.exists():
            return False, f"alembic.ini not found at {ini_path}"
        cfg = Config(str(ini_path))
        # alembic env.py 가 DATABASE_URL 환경변수를 읽음 — 이미 _hydrate_env_from_secrets 가 셋업
        command.upgrade(cfg, "head")
        return True, None
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"[:500]
