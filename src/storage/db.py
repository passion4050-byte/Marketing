"""DB 엔진/세션 팩토리. SQLite → PostgreSQL 마이그레이션 가능한 형태로 정의."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base


def _resolve_database_url() -> str:
    """DATABASE_URL 우선. 미설정 시 STREAMLIT_ALLOW_SQLITE=true 로 명시 허용한 경우에만 sqlite fallback.

    2026-05-24: 사용자가 Streamlit Cloud secrets 에 DATABASE_URL 누락 시 sqlite 로 silent
    fallback 되어 입력 데이터가 컨테이너 휘발되는 사고 발생. 명시 토글 없이는 RuntimeError.
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        allow_sqlite = os.getenv("STREAMLIT_ALLOW_SQLITE", "").strip().lower() in ("1", "true", "yes", "on")
        if not allow_sqlite:
            raise RuntimeError(
                "DATABASE_URL 환경변수 미설정. Streamlit Cloud Secrets 에 추가 필요.\n"
                "  postgresql://postgres.<REF>:<PW>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres\n"
                "로컬 개발용 sqlite 가 필요하면 STREAMLIT_ALLOW_SQLITE=true 명시 (휘발성 주의)."
            )
        url = "sqlite:///./data/geo.db"
    if url.startswith("sqlite:///"):
        path_str = url.replace("sqlite:///", "", 1)
        path = Path(path_str)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)
    return url


def get_db_kind() -> str:
    """현재 DB 종류 — Streamlit 배너 표시용."""
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return "sqlite-fallback"
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        return "postgres"
    if url.startswith("sqlite"):
        return "sqlite"
    return "unknown"


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
    """Streamlit Cloud 부트스트랩 — schema 를 ORM 기준으로 동기화.

    Streamlit Community Cloud 는 shell 접근 X — alembic CLI 못 돌림. 또한
    production DB(blogkey 가 처음 부팅하며 ``create_all`` 로 생성한 Supabase Postgres)는
    alembic_version 추적이 비어있어 ``alembic upgrade head`` 가 첫 마이그레이션부터
    돌려고 시도 → ``DuplicateTable`` 충돌. 그래서 이 함수는:

    1. ``create_all()`` 은 이미 호출자가 부름 (신규 테이블 생성)
    2. SQLAlchemy ``inspect`` 로 ORM 모델과 실제 DB 의 컬럼 차이 계산
    3. 누락된 **nullable** 컬럼만 ``ALTER TABLE ADD COLUMN`` 으로 안전하게 추가
       (NOT NULL 컬럼은 default 가 있어야 안전 → 보수적으로 skip)
    4. alembic_version 이 비어있으면 ``stamp head`` 로 동기화 — 이후 신규 마이그레이션
       은 정상 ``alembic upgrade`` 로 처리 가능

    실패 시 (False, 에러 메시지) 반환. 무한 루프/캐스케이드 방지를 위해 단일 호출만.
    """
    added_cols: list[str] = []
    try:
        from pathlib import Path

        from sqlalchemy import inspect, text

        engine = get_engine()
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        # 누락된 nullable 컬럼 ALTER ADD
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # create_all 이 이미 만들었거나 만들 예정
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
            for col in table.columns:
                if col.name in existing_cols or not col.nullable:
                    continue
                col_type = col.type.compile(dialect=engine.dialect)
                stmt = (
                    f'ALTER TABLE "{table.name}" '
                    f'ADD COLUMN IF NOT EXISTS "{col.name}" {col_type}'
                )
                # SQLite 는 IF NOT EXISTS 미지원 → 폴백
                try:
                    with engine.begin() as conn:
                        conn.execute(text(stmt))
                except Exception:
                    fallback = (
                        f'ALTER TABLE "{table.name}" '
                        f'ADD COLUMN "{col.name}" {col_type}'
                    )
                    with engine.begin() as conn:
                        conn.execute(text(fallback))
                added_cols.append(f"{table.name}.{col.name}")

        # alembic_version 동기화 — 비어있으면 stamp head, 있으면 가능한 만큼 upgrade
        from alembic import command
        from alembic.config import Config

        ini_path = Path(__file__).resolve().parent.parent.parent / "alembic.ini"
        if ini_path.exists():
            cfg = Config(str(ini_path))
            inspector2 = inspect(engine)
            if "alembic_version" not in inspector2.get_table_names():
                command.stamp(cfg, "head")
            else:
                # 정상 alembic 환경 — 진짜 마이그레이션 적용
                try:
                    command.upgrade(cfg, "head")
                except Exception:
                    pass  # 컬럼은 위에서 이미 추가됨

        msg = ("added cols: " + ", ".join(added_cols)) if added_cols else None
        return True, msg
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"[:500]


def __getattr__(name: str):
    """Lazy SessionLocal alias — Streamlit/scheduler/scripts 의 ``from src.storage.db import SessionLocal`` 호환.

    2026-05-24: scripts/run_auto_content_once.py 가 SessionLocal 직접 import 했으나
    db.py 는 get_session_factory() 만 노출. module-level __getattr__ (PEP 562) 로
    lazy 호환. 첫 접근 시 get_session_factory() 호출 → DATABASE_URL 미설정 시 명시 에러.
    """
    if name == "SessionLocal":
        return get_session_factory()
    raise AttributeError(f"module 'src.storage.db' has no attribute {name!r}")
