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

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level, logging.INFO)),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
    _CONFIGURED = True
