"""Phase 5-T3.4 — Analytics e2e (시계열 빌더 + 추세 + 이상치 통합)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.analytics import (
    daily_mention_share_series,
    detect_anomalies,
    detect_trend,
)
from src.storage.models import (
    Base,
    Keyword,
    Mention,
    Query,
    Response,
    Tenant,
)


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.commit()
    return SessionLocal


def _seed_day(session, *, day: date, n_total: int, n_target: int):
    """특정 날짜에 n_total responses, 그 중 n_target 에 target Mention."""
    ts = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc).replace(hour=12)
    for i in range(n_total):
        q = Query(
            tenant_id=1, keyword_id=1, engine="stub",
            prompt=f"sample_{day}_{i}", sample_index=i, requested_at=ts,
        )
        session.add(q)
        session.flush()
        r = Response(query_id=q.id, raw_text="text", latency_ms=100, created_at=ts)
        session.add(r)
        session.flush()
        if i < n_target:
            session.add(Mention(
                response_id=r.id, tenant_id=1, brand="메디맵",
                is_target=True, is_competitor=False, position=0,
                weight=1.0, context_snippet="", created_at=ts,
            ))
    session.commit()


def test_series_zero_fills_missing_days(session_factory):
    """데이터 0 인 날도 share=0.0 으로 채워짐."""
    today = date.today()
    with session_factory() as s:
        _seed_day(s, day=today - timedelta(days=2), n_total=10, n_target=5)

    with session_factory() as s:
        series = daily_mention_share_series(s, 1, 1, days=7)

    assert len(series) == 7
    nonzero = [d for d in series if d.n > 0]
    assert len(nonzero) == 1
    assert nonzero[0].share == 0.5


def test_series_mann_kendall_detects_increase(session_factory):
    """7일 안정(0.3) → 7일 증가(0.4..0.85) 시드 → trend=increasing."""
    today = date.today()
    with session_factory() as s:
        # 14일치 — 안정 7 + 증가 7
        for offset in range(14):
            d = today - timedelta(days=13 - offset)
            target_share = 0.3 if offset < 7 else 0.4 + (offset - 7) * 0.07
            n_total = 10
            n_target = round(n_total * target_share)
            _seed_day(s, day=d, n_total=n_total, n_target=n_target)

    with session_factory() as s:
        series = daily_mention_share_series(s, 1, 1, days=14)

    shares = [d.share for d in series]
    trend = detect_trend(shares)
    assert trend["trend"] == "increasing"
    assert trend["is_significant"] is True


def test_series_anomaly_detects_outlier(session_factory):
    """안정 7일 후 spike 1일 → 이상치 1건."""
    today = date.today()
    with session_factory() as s:
        for offset in range(7):
            d = today - timedelta(days=7 - offset)
            _seed_day(s, day=d, n_total=10, n_target=3)
        # 마지막 spike — share=1.0
        _seed_day(s, day=today, n_total=10, n_target=10)

    with session_factory() as s:
        series = daily_mention_share_series(s, 1, 1, days=8)

    shares = [d.share for d in series]
    anomalies = detect_anomalies(shares, window=7, sigma_factor=2.0)
    assert len(anomalies) == 1
    assert anomalies[0].direction == "high"
    assert anomalies[0].value == 1.0


def test_measurement_tab_module_imports():
    """Phase 5 의 _render_timeseries_section 가 import 되고 함수 시그니처가 맞는지 smoke."""
    from src.dashboard.measurement_tab import (
        _anomaly_chip_html,
        _render_timeseries_section,
        _trend_chip_html,
    )

    assert callable(_render_timeseries_section)
    # chip html 헬퍼 — 입력 dict 에 따라 적절한 chip 반환
    inc = {"trend": "increasing", "p_value": 0.04, "tau": 0.5,
           "is_significant": True, "n_points": 14}
    dec = {"trend": "decreasing", "p_value": 0.01, "tau": -0.5,
           "is_significant": True, "n_points": 14}
    none = {"trend": "no trend", "p_value": 0.6, "tau": 0.0,
            "is_significant": False, "n_points": 14}
    short = {"trend": "insufficient_data", "p_value": None, "tau": None,
             "is_significant": False, "n_points": 3}

    assert "↑ 증가" in _trend_chip_html(inc)
    assert "↓ 감소" in _trend_chip_html(dec)
    assert "변화 없음" in _trend_chip_html(none)
    assert "부족" in _trend_chip_html(short)

    assert "이상치 없음" in _anomaly_chip_html(0)
    assert "이상치 3건" in _anomaly_chip_html(3)
