"""structlog 설정 — Phase 2-T3.7 (INF-03).

환경변수:
- LOG_LEVEL=DEBUG|INFO|WARNING|ERROR (기본: INFO)
- LOG_FORMAT=json|console (기본: json — 운영용. 로컬은 console 권장)

사용:
    from src.observability.logging_config import configure_logging
    configure_logging()  # 진입점에서 1회 호출

    import structlog
    log = structlog.get_logger(__name__)
    log.info("event", key="value")  # JSON 또는 컬러 콘솔
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


_CONFIGURED = False


def configure_logging(level: str | None = None, json_format: bool | None = None) -> None:
    """structlog + stdlib logging 통합 설정. 한 번만 적용 (idempotent)."""
    global _CONFIGURED
    if _CONFIGURED:
        return

    log_level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    if json_format is None:
        json_format = os.getenv("LOG_FORMAT", "json").lower() == "json"

    # stdlib logging 설정 — structlog 와 같은 stream 사용
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level, logging.INFO),
    )

    # structlog 버전마다 일부 API 시그니처가 달라 방어적으로 import + 구성
    try:
        processors: list = [
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
        ]
        if json_format:
            processors.append(structlog.processors.JSONRenderer(ensure_ascii=False))
        else:
            processors.append(structlog.dev.ConsoleRenderer(colors=True))

        kwargs: dict = {
            "processors": processors,
            "cache_logger_on_first_use": True,
        }
        # 일부 구버전은 make_filtering_bound_logger 미지원
        if hasattr(structlog, "make_filtering_bound_logger"):
            kwargs["wrapper_class"] = structlog.make_filtering_bound_logger(
                getattr(logging, log_level, logging.INFO)
            )
        # 일부 구버전은 PrintLoggerFactory 시그니처 다름
        if hasattr(structlog, "PrintLoggerFactory"):
            try:
                kwargs["logger_factory"] = structlog.PrintLoggerFactory(file=sys.stdout)
            except TypeError:
                kwargs["logger_factory"] = structlog.PrintLoggerFactory()

        structlog.configure(**kwargs)
    except Exception:
        # 어떤 이유로든 실패하면 stdlib logging 만 활성 — 앱 기동 우선
        pass
    _CONFIGURED = True
