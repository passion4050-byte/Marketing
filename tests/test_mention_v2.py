"""Phase 5-T1.5 — Mention extractor v2 pytest.

검증:
- 추천 동사 인접 → strength_score=1.0 → weight ≈ position_score
- 비교 표현 → strength_score=0.3
- 단순 언급 → strength_score=0.7 (기본)
- 부정 컨텍스트 → is_negative=True
- position_score: 앞 1.0 / 뒤 0.5 변화
- v1 호환: enable_v2=False → weight=1.0, is_negative=False
"""

from __future__ import annotations

from src.parser.mentions import extract_mentions
from src.parser.signals import MentionSignals


def _signals():
    return MentionSignals(
        recommendation=frozenset(["추천", "잘하는", "좋은"]),
        comparison=frozenset(["보다", "비해"]),
        negative=frozenset(["피하", "별로"]),
    )


def test_v2_recommendation_strength_full():
    text = "BGN 안과는 강남에서 잘하는 곳으로 추천받습니다."
    out = extract_mentions(text, "BGN", signals=_signals())
    assert len(out) == 1
    m = out[0]
    assert m.recommendation_strength == 1.0
    # position_score 도 1.0 (앞쪽) → weight ≈ 1.0
    assert m.weight == 1.0


def test_v2_comparison_strength_low():
    # 어절 boundary — 'BGN' 뒤에 공백 + '보다' 표현
    text = "BGN 보다 다른 곳을 알아봤지만 괜찮았어요."
    out = extract_mentions(text, "BGN", signals=_signals())
    assert len(out) == 1
    m = out[0]
    assert m.recommendation_strength == 0.3
    # weight = position_score(1.0) × 0.3 = 0.3
    assert m.weight == 0.3


def test_v2_simple_mention_default_strength():
    """추천/비교 키워드가 윈도우 안에 없으면 0.7 기본."""
    text = "메디맵 안과는 강남에 위치한 의료기관입니다."
    out = extract_mentions(text, "메디맵", signals=_signals())
    assert len(out) == 1
    assert out[0].recommendation_strength == 0.7


def test_v2_is_negative_true():
    text = "메디맵 안과는 별로라는 후기가 일부 있습니다."
    out = extract_mentions(text, "메디맵", signals=_signals())
    assert len(out) == 1
    assert out[0].is_negative is True


def test_v2_is_negative_false_outside_window():
    """부정 키워드가 ±30자 윈도우 밖이면 False."""
    distant = "메디맵 안과는 좋습니다. " + "다른 내용 " * 50 + "별로 좋지 않은 곳도 있어요."
    out = extract_mentions(distant, "메디맵", signals=_signals())
    assert len(out) == 1
    assert out[0].is_negative is False


def test_v2_position_score_decreases_for_back_position():
    """앞쪽 매치 weight > 뒤쪽 매치 weight."""
    text = "메디맵 추천드려요. " + ("기타 정보. " * 100) + "메디맵 추천도."
    out = extract_mentions(text, "메디맵", signals=_signals())
    assert len(out) == 2
    front, back = out[0], out[1]
    assert front.weight > back.weight  # 앞쪽이 더 가중


def test_v2_weight_in_zero_one_range():
    text = "메디맵보다 다른 곳을 봤어요."
    out = extract_mentions(text, "메디맵", signals=_signals())
    for m in out:
        assert 0.0 <= m.weight <= 1.0


def test_v1_compatibility_when_enable_v2_false():
    """enable_v2=False 면 weight=1.0, is_negative=False 고정."""
    text = "BGN 보다 다른 곳을 봤어요. 별로네요."
    out = extract_mentions(text, "BGN", signals=_signals(), enable_v2=False)
    assert len(out) == 1
    assert out[0].weight == 1.0
    assert out[0].is_negative is False
    assert out[0].recommendation_strength == 1.0


def test_v2_uses_default_signals_yaml_when_not_provided(monkeypatch):
    """signals=None 이면 기본 yaml 로드 (config/mention_signals.yaml)."""
    from src.parser.signals import reset_cache

    reset_cache()
    text = "BGN 안과를 추천드려요."
    # default yaml 의 '추천' 이 매치되면 strength=1.0
    out = extract_mentions(text, "BGN")
    assert len(out) == 1
    assert out[0].recommendation_strength == 1.0
