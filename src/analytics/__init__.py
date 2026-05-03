"""Analytics package — Phase 5 (MVP-1).

3가지 통계 모듈:
- visibility — mention_share + Wilson CI (단순 + weighted)
- trend — Mann-Kendall 추세 검정
- anomaly — 이동평균 ± Nσ 이상치 탐지
- series — DB → 일별 시계열 빌더
"""

from src.analytics.anomaly import AnomalyPoint, detect_anomalies
from src.analytics.series import DailyShare, daily_mention_share_series
from src.analytics.trend import detect_trend
from src.analytics.visibility import mention_share, wilson_ci

__all__ = [
    "AnomalyPoint",
    "DailyShare",
    "daily_mention_share_series",
    "detect_anomalies",
    "detect_trend",
    "mention_share",
    "wilson_ci",
]
