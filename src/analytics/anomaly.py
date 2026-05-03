"""Anomaly detection — Phase 5-T2.3.

이동평균 ± Nσ 윈도우 검사. 마지막 last_n 시점에서 평균 ± sigma_factor × std 벗어나면
이상치로 마크.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass


@dataclass
class AnomalyPoint:
    index: int
    value: float
    mean: float
    std: float
    direction: str  # "high" | "low"


_DEFAULT_WINDOW = int(os.getenv("ANOMALY_WINDOW", "7"))
_DEFAULT_SIGMA = float(os.getenv("ANOMALY_SIGMA", "2.0"))
_DEFAULT_LAST_N = int(os.getenv("ANOMALY_LAST_N", "14"))


def _mean_std(values: list[float]) -> tuple[float, float]:
    n = len(values)
    if n == 0:
        return (0.0, 0.0)
    m = sum(values) / n
    var = sum((v - m) ** 2 for v in values) / n
    return (m, math.sqrt(var))


def detect_anomalies(
    time_series: list[float],
    *,
    window: int = _DEFAULT_WINDOW,
    sigma_factor: float = _DEFAULT_SIGMA,
    last_n: int = _DEFAULT_LAST_N,
) -> list[AnomalyPoint]:
    """이동평균 ± sigma 윈도우 검사.

    각 시점 i (window <= i < n) 에서 직전 ``window`` 개 평균 ± sigma_factor × std 벗어나면
    이상치. ``last_n`` 시점만 검사 (시작 부분은 무시).
    """
    n = len(time_series)
    if n < window + 1:
        return []

    start = max(window, n - last_n)
    out: list[AnomalyPoint] = []
    for i in range(start, n):
        prev = time_series[i - window:i]
        mean, std = _mean_std(prev)
        if std == 0:
            # 직전 window 가 모두 같은 값이면 이상치 판정 어려움 — 다른 값이면 이상치 마크
            if abs(time_series[i] - mean) > 1e-9:
                out.append(AnomalyPoint(
                    index=i, value=time_series[i], mean=mean, std=0.0,
                    direction="high" if time_series[i] > mean else "low",
                ))
            continue
        upper = mean + sigma_factor * std
        lower = mean - sigma_factor * std
        if time_series[i] > upper:
            out.append(AnomalyPoint(
                index=i, value=time_series[i], mean=mean, std=std, direction="high",
            ))
        elif time_series[i] < lower:
            out.append(AnomalyPoint(
                index=i, value=time_series[i], mean=mean, std=std, direction="low",
            ))
    return out
