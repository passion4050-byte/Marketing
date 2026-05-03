"""Mention 시그널 룰북 로더 — Phase 5-T1.2.

config/mention_signals.yaml 의 추천/비교/부정 키워드를 frozenset 으로 로드해
extract_mentions v2 가 매치 위치 ± window 자에서 빠르게 lookup 한다.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class MentionSignals:
    """3 카테고리 시그널 키워드 — 모두 frozenset 으로 빠른 substring 검사."""

    recommendation: frozenset[str]
    comparison: frozenset[str]
    negative: frozenset[str]

    @classmethod
    def empty(cls) -> "MentionSignals":
        return cls(frozenset(), frozenset(), frozenset())


_DEFAULT_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "mention_signals.yaml"
_cache: MentionSignals | None = None


def load_signals(path: Path | str | None = None, *, refresh: bool = False) -> MentionSignals:
    """yaml 파일에서 시그널 로드. 모듈-레벨 캐시 (테스트는 refresh=True)."""
    global _cache
    if _cache is not None and not refresh and path is None:
        return _cache

    p = Path(path) if path else _DEFAULT_PATH
    if not p.exists():
        signals = MentionSignals.empty()
    else:
        try:
            with open(p, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
        except Exception:
            data = {}

        signals = MentionSignals(
            recommendation=frozenset(_clean(data.get("recommendation"))),
            comparison=frozenset(_clean(data.get("comparison"))),
            negative=frozenset(_clean(data.get("negative"))),
        )

    if path is None:
        _cache = signals
    return signals


def _clean(items) -> list[str]:
    if not items:
        return []
    return [str(x).strip() for x in items if str(x).strip()]


def reset_cache() -> None:
    """테스트용 — 모듈 캐시 초기화."""
    global _cache
    _cache = None


__all__ = ["MentionSignals", "load_signals", "reset_cache"]
