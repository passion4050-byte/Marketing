"""Phase 5-T2.6 — 이상치 탐지 pytest."""

from __future__ import annotations

from src.analytics.anomaly import AnomalyPoint, detect_anomalies


def test_anomaly_empty_returns_empty():
    assert detect_anomalies([]) == []


def test_anomaly_short_series_below_window_returns_empty():
    assert detect_anomalies([0.1, 0.2, 0.3], window=7) == []


def test_anomaly_high_spike_detected():
    """안정 7일 후 급등 → 이상치 1건 (direction='high')."""
    series = [0.4] * 7 + [0.95]  # 마지막이 평균(0.4) ± 0σ 의 한참 위
    out = detect_anomalies(series, window=7, sigma_factor=2.0, last_n=14)
    assert len(out) == 1
    assert isinstance(out[0], AnomalyPoint)
    assert out[0].direction == "high"
    assert out[0].index == 7
    assert out[0].value == 0.95


def test_anomaly_low_spike_detected():
    series = [0.5] * 7 + [0.05]
    out = detect_anomalies(series, window=7, sigma_factor=2.0)
    assert len(out) == 1
    assert out[0].direction == "low"


def test_anomaly_within_threshold_no_mark():
    """std 가 충분히 큰 시계열에서 작은 변동은 정상."""
    series = [0.4, 0.5, 0.6, 0.5, 0.4, 0.5, 0.6, 0.55]
    out = detect_anomalies(series, window=7, sigma_factor=2.0)
    assert out == []


def test_anomaly_last_n_limits_window():
    """last_n=2 → 마지막 2개 시점만 검사."""
    series = [0.4] * 7 + [0.95, 0.4, 0.4]  # 7번째에 spike
    out = detect_anomalies(series, window=7, sigma_factor=2.0, last_n=2)
    # spike 가 last_n=2 범위 밖 → 미검출
    assert all(p.index >= len(series) - 2 for p in out)


def test_anomaly_constant_window_with_different_value_marks():
    """직전 window 가 모두 같은 값이면 std=0 — 다른 값이면 이상치."""
    series = [0.5] * 7 + [0.6]
    out = detect_anomalies(series, window=7, sigma_factor=2.0)
    assert len(out) == 1
    assert out[0].std == 0.0
    assert out[0].direction == "high"
