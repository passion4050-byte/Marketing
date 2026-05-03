"""Sentiment 분류 — Phase 6-T3.1.

룰 기반 v1: 매치 위치 ± window 자에서 추천/부정 시그널을 검사해
"positive" / "negative" / "neutral" 중 하나로 분류.

알고리즘 (보수적):
1. 추천 키워드 + 부정 키워드 둘 다 → "neutral" (충돌 시 중립)
2. 추천 only → "positive"
3. 부정 only → "negative"
4. 둘 다 없음 → "neutral"

LLM 기반 sentiment (SEN-02) 는 Phase 7+ 로 이연.
"""

from __future__ import annotations

from src.parser.signals import MentionSignals


_DEFAULT_WINDOW = 30


def classify_sentiment(
    text: str,
    position: int,
    match_len: int,
    signals: MentionSignals,
    *,
    window: int = _DEFAULT_WINDOW,
) -> str:
    """``text[position:position+match_len]`` 주변 ± window 자에서 sentiment 분류.

    Returns: "positive" | "negative" | "neutral"
    """
    if not text or position < 0 or match_len <= 0:
        return "neutral"

    start = max(0, position - window)
    end = min(len(text), position + match_len + window)
    around = text[start:end]

    has_pos = any(w in around for w in signals.recommendation)
    has_neg = any(w in around for w in signals.negative)

    if has_pos and has_neg:
        return "neutral"
    if has_pos:
        return "positive"
    if has_neg:
        return "negative"
    return "neutral"


__all__ = ["classify_sentiment"]
