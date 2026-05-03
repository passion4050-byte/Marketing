"""Phase 5-T2.6 — Mann-Kendall 추세 검정 pytest."""

from __future__ import annotations

from src.analytics.trend import detect_trend


def test_trend_insufficient_data_below_min():
    out = detect_trend([0.1, 0.2, 0.3])
    assert out["trend"] == "insufficient_data"
    assert out["is_significant"] is False
    assert out["n_points"] == 3


def test_trend_increasing_significant():
    """7+ 시점의 명백한 증가 → trend='increasing', p<0.05."""
    series = [0.1, 0.15, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85]
    out = detect_trend(series)
    assert out["trend"] == "increasing"
    assert out["is_significant"] is True
    assert out["p_value"] is not None and out["p_value"] < 0.05
    assert out["tau"] > 0


def test_trend_decreasing_significant():
    series = [0.9, 0.8, 0.7, 0.55, 0.4, 0.3, 0.2, 0.1]
    out = detect_trend(series)
    assert out["trend"] == "decreasing"
    assert out["is_significant"] is True
    assert out["tau"] < 0


def test_trend_flat_no_trend():
    """모두 같은 값 — pymannkendall 안전 처리."""
    series = [0.5] * 10
    out = detect_trend(series)
    assert out["trend"] == "no trend"
    assert out["is_significant"] is False


def test_trend_noisy_no_significant_trend():
    """랜덤한 작은 변동 → no trend (p > 0.05)."""
    series = [0.5, 0.48, 0.52, 0.49, 0.51, 0.50, 0.49, 0.51]
    out = detect_trend(series)
    # 항상 "no trend" 라고 단언하긴 어렵지만 is_significant 가 False 여야
    assert out["is_significant"] is False


def test_trend_min_points_configurable():
    """min_points=10 으로 설정 → 8 시점은 insufficient."""
    out = detect_trend([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], min_points=10)
    assert out["trend"] == "insufficient_data"
