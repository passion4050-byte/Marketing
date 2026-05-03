"""Phase 5-T1.5 — signals 룰북 로더 pytest."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.parser.signals import MentionSignals, load_signals, reset_cache


@pytest.fixture(autouse=True)
def _clean():
    reset_cache()
    yield
    reset_cache()


def test_load_default_yaml_returns_signals():
    s = load_signals()
    assert isinstance(s, MentionSignals)
    # 기본 yaml 에 '추천' 단어가 있어야
    assert "추천" in s.recommendation
    # 부정 키워드도
    assert "별로" in s.negative or any("별로" in n for n in s.negative)


def test_load_custom_path(tmp_path: Path):
    custom = tmp_path / "signals.yaml"
    custom.write_text(
        "recommendation:\n"
        "  - 최고\n"
        "  - 1위\n"
        "comparison:\n"
        "  - 비해\n"
        "negative:\n"
        "  - 안좋음\n",
        encoding="utf-8",
    )
    s = load_signals(custom)
    assert "최고" in s.recommendation
    assert "1위" in s.recommendation
    assert s.comparison == frozenset(["비해"])
    assert s.negative == frozenset(["안좋음"])


def test_load_missing_path_returns_empty_signals(tmp_path: Path):
    missing = tmp_path / "nonexistent.yaml"
    s = load_signals(missing)
    assert s.recommendation == frozenset()
    assert s.comparison == frozenset()
    assert s.negative == frozenset()


def test_cache_reused_for_default(monkeypatch):
    s1 = load_signals()
    s2 = load_signals()
    assert s1 is s2  # 같은 인스턴스 (캐시)


def test_refresh_bypasses_cache():
    s1 = load_signals()
    s2 = load_signals(refresh=True)
    # refresh 는 새로 만들지만 내용은 같아야 함
    assert s1 == s2


def test_empty_classmethod_returns_empty_frozensets():
    s = MentionSignals.empty()
    assert s.recommendation == frozenset()
    assert s.comparison == frozenset()
    assert s.negative == frozenset()
