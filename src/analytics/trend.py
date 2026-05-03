"""Trend detection — Phase 5-T2.2.

Mann-Kendall 추세 검정 (pymannkendall.original_test 래핑).
시점 < 7 면 "insufficient_data" + is_significant=False.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)


_MIN_POINTS_DEFAULT = 7
_P_THRESHOLD = 0.05


def detect_trend(time_series: list[float], *, min_points: int = _MIN_POINTS_DEFAULT) -> dict:
    """Mann-Kendall 추세 검정.

    반환:
    - trend: "increasing" | "decreasing" | "no trend" | "insufficient_data"
    - p_value: float (insufficient_data 면 None)
    - tau: float (insufficient_data 면 None)
    - is_significant: bool — p < 0.05 AND n >= min_points
    - n_points: 입력 시점 수
    """
    n = len(time_series)
    base = {"n_points": n, "p_value": None, "tau": None, "is_significant": False}

    if n < min_points:
        return {**base, "trend": "insufficient_data"}

    # 모든 값이 동일하면 pymannkendall 이 ZeroDivisionError 가능 — 사전 차단
    if max(time_series) == min(time_series):
        return {**base, "trend": "no trend", "p_value": 1.0, "tau": 0.0}

    try:
        import pymannkendall as mk

        result = mk.original_test(time_series)
    except Exception as e:  # pragma: no cover
        logger.warning("trend.mk_failed", error=str(e), n=n)
        return {**base, "trend": "no trend"}

    p_value = float(result.p)
    tau = float(result.Tau)
    raw_trend = result.trend  # 'increasing' | 'decreasing' | 'no trend'

    return {
        "trend": raw_trend,
        "p_value": round(p_value, 6),
        "tau": round(tau, 4),
        "is_significant": (p_value < _P_THRESHOLD) and (n >= min_points),
        "n_points": n,
    }
