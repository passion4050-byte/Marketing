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


@dataclass
class ExtractedMention:
    """Mention 추출 결과 1건. v1 은 weight=1.0 고정."""

    brand: str
    position: int
    context_snippet: str
    is_target: bool = False
    is_competitor: bool = False
    weight: float = 1.0
    is_negative: bool = False  # Phase 5 에서 활용


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


def extract_mentions(
    response_text: str,
    target_brand: str,
    *,
    aliases: list[str] | None = None,
    competitors: list[str] | None = None,
) -> list[ExtractedMention]:
    """본문에서 target/alias/competitor 멘션 모두 추출.

    - target_brand 와 aliases 의 매치 → is_target=True
    - competitors 의 매치 → is_competitor=True
    - target 과 competitor 가 동일 단어면 target 우선 (의미상 맞음)
    - 같은 (brand, position) 페어는 한 번만 (alias 끼리 겹쳐도 중복 X)

    정렬: position 오름차순 (등장 순서 그대로).
    """
    text = response_text or ""
    if not text.strip() or not target_brand:
        return []

    target_terms: list[str] = [target_brand]
    if aliases:
        target_terms.extend(a for a in aliases if a and a.strip())
    competitor_terms: list[str] = list(competitors or [])

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
            found[key] = ExtractedMention(
                brand=term,
                position=pos,
                context_snippet=_snippet(text, pos, len(m.group(0))),
                is_target=is_target,
                is_competitor=is_competitor,
                weight=1.0,
                is_negative=False,
            )

    for term in target_terms:
        _add(term, is_target=True, is_competitor=False)
    for term in competitor_terms:
        # target 과 같은 텍스트라면 target 우선 (이미 저장되어 있으면 skip)
        _add(term, is_target=False, is_competitor=True)

    return sorted(found.values(), key=lambda x: x.position)


__all__ = ["ExtractedMention", "extract_mentions"]
