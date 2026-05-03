"""Mention extractor v1 — Phase 4-T3.1 (정의서 §4.3 v1).

목표:
- AI 검색 응답 본문에서 target_brand + alias + competitor 의 멘션을 찾는다
- 매치는 한글 어절 boundary 기준 (단어 일부만 일치하는 경우 제외)
- 위치(position) + 30자 context_snippet 을 함께 기록

Phase 5 의 v2 에서는 이 모듈에 weight, sentiment, recommendation strength 가 추가됨.
v1 은 weight=1.0, is_negative=False 고정.

정규화 정책:
- NFKC + 소문자 변환은 매칭 시 임시로만 사용 (저장은 raw 위치 그대로)
- 양쪽 어절 boundary: ``(?<![가-힣A-Za-z0-9])PATTERN(?![가-힣A-Za-z0-9])``
  · 한글/영문/숫자가 인접하면 매치 무효 → "BGN밝은눈안과" 같은 붙은 표기는 매치 X
  · "BGN 안과" / " (BGN)" / "BGN.은" 처럼 어절 구분되면 매치 O
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from src.parser.sentiment import classify_sentiment
from src.parser.signals import MentionSignals, load_signals


@dataclass
class ExtractedMention:
    """Mention 추출 결과 1건.

    v1: weight=1.0, is_negative=False, recommendation_strength=1.0, sentiment="neutral"
    v2: weight = position_score × strength_score (0~1), sentiment ∈ {positive,negative,neutral}
    """

    brand: str
    position: int
    context_snippet: str
    is_target: bool = False
    is_competitor: bool = False
    weight: float = 1.0
    is_negative: bool = False
    recommendation_strength: float = 1.0  # v2: 1.0 / 0.7 / 0.3
    sentiment: str = "neutral"  # Phase 6: positive | negative | neutral


_BOUNDARY_LEFT = r"(?<![가-힣A-Za-z0-9])"
_BOUNDARY_RIGHT = r"(?![가-힣A-Za-z0-9])"


def _normalize(text: str) -> str:
    """NFKC 정규화 + 양쪽 공백 trim + 연속 공백 1개로 압축.

    매치 위치는 정규화 *전* 원본에서 잡으므로 저장된 position 은 raw text 기준.
    """
    if not text:
        return ""
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def _build_pattern(brand: str) -> re.Pattern[str] | None:
    """단일 브랜드명을 어절 boundary 정규식으로 변환. 빈 문자열은 None."""
    if not brand or not brand.strip():
        return None
    escaped = re.escape(brand.strip())
    return re.compile(_BOUNDARY_LEFT + escaped + _BOUNDARY_RIGHT, flags=re.IGNORECASE)


def _snippet(text: str, position: int, length: int, *, window: int = 30) -> str:
    """매치 위치 ± window 글자의 context. 양쪽 ellipsis."""
    start = max(0, position - window)
    end = min(len(text), position + length + window)
    out = text[start:end]
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return prefix + out.replace("\n", " ").strip() + suffix


_DEFAULT_WINDOW = 30


def _position_score(position: int, total_length: int) -> float:
    """앞쪽일수록 1.0, 끝쪽일수록 0.5. 정의서 §4.3 공식."""
    if total_length <= 0:
        return 1.0
    ratio = max(0.0, min(1.0, position / total_length))
    return 1.0 - ratio * 0.5


def _strength_score(text: str, position: int, match_len: int, signals: MentionSignals,
                    *, window: int = _DEFAULT_WINDOW) -> float:
    """매치 위치 ± window 자에서 추천/비교 키워드 검사 → 1.0 / 0.3 / 0.7."""
    start = max(0, position - window)
    end = min(len(text), position + match_len + window)
    around = text[start:end]
    if any(w in around for w in signals.recommendation):
        return 1.0
    if any(w in around for w in signals.comparison):
        return 0.3
    return 0.7


def _is_negative(text: str, position: int, match_len: int, signals: MentionSignals,
                 *, window: int = _DEFAULT_WINDOW) -> bool:
    start = max(0, position - window)
    end = min(len(text), position + match_len + window)
    around = text[start:end]
    return any(w in around for w in signals.negative)


def extract_mentions(
    response_text: str,
    target_brand: str,
    *,
    aliases: list[str] | None = None,
    competitors: list[str] | None = None,
    enable_v2: bool = True,
    signals: MentionSignals | None = None,
) -> list[ExtractedMention]:
    """본문에서 target/alias/competitor 멘션 모두 추출.

    - target_brand 와 aliases 의 매치 → is_target=True
    - competitors 의 매치 → is_competitor=True
    - target 과 competitor 가 동일 단어면 target 우선 (의미상 맞음)
    - 같은 (brand, position) 페어는 한 번만 (alias 끼리 겹쳐도 중복 X)

    v2 (기본 enable_v2=True):
    - weight = position_score × strength_score (소수 둘째자리 round, 0~1)
    - is_negative: 매치 ± 30자 내에 부정 시그널 등장 시 True

    v1 (enable_v2=False):
    - weight=1.0, is_negative=False, recommendation_strength=1.0 고정 (Phase 4 호환)

    정렬: position 오름차순 (등장 순서 그대로).
    """
    text = response_text or ""
    if not text.strip() or not target_brand:
        return []

    target_terms: list[str] = [target_brand]
    if aliases:
        target_terms.extend(a for a in aliases if a and a.strip())
    competitor_terms: list[str] = list(competitors or [])

    sigs = signals if signals is not None else (load_signals() if enable_v2 else MentionSignals.empty())
    text_len = len(text)

    found: dict[tuple[str, int], ExtractedMention] = {}

    def _add(term: str, *, is_target: bool, is_competitor: bool) -> None:
        pat = _build_pattern(term)
        if pat is None:
            return
        for m in pat.finditer(text):
            pos = m.start()
            key = (term, pos)
            if key in found:
                continue
            mlen = len(m.group(0))

            if enable_v2:
                pos_s = _position_score(pos, text_len)
                str_s = _strength_score(text, pos, mlen, sigs)
                weight = round(pos_s * str_s, 2)
                is_neg = _is_negative(text, pos, mlen, sigs)
                sentiment = classify_sentiment(text, pos, mlen, sigs)
            else:
                pos_s = 1.0
                str_s = 1.0
                weight = 1.0
                is_neg = False
                sentiment = "neutral"

            found[key] = ExtractedMention(
                brand=term,
                position=pos,
                context_snippet=_snippet(text, pos, mlen),
                is_target=is_target,
                is_competitor=is_competitor,
                weight=weight,
                is_negative=is_neg,
                recommendation_strength=str_s,
                sentiment=sentiment,
            )

    for term in target_terms:
        _add(term, is_target=True, is_competitor=False)
    for term in competitor_terms:
        # target 과 같은 텍스트라면 target 우선 (이미 저장되어 있으면 skip)
        _add(term, is_target=False, is_competitor=True)

    return sorted(found.values(), key=lambda x: x.position)


__all__ = ["ExtractedMention", "extract_mentions"]
