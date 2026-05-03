"""Phase 4-T3.4 — Mention extractor v1 pytest.

검증:
- 단일/다중 매치
- 한글 어절 boundary (단어 일부만 일치하면 미매치)
- 대소문자 무시 (영문 브랜드)
- alias 매칭
- competitor 매칭
- target 과 competitor 가 같은 단어 → target 우선
- 빈 입력 / 빈 target → 빈 리스트
- context_snippet 양쪽 ellipsis
"""

from __future__ import annotations

from src.parser.mentions import ExtractedMention, extract_mentions


def test_extract_single_match():
    text = "BGN 안과는 강남에서 추천받습니다."
    out = extract_mentions(text, target_brand="BGN")
    assert len(out) == 1
    m = out[0]
    assert m.brand == "BGN"
    assert m.is_target and not m.is_competitor
    assert m.weight == 1.0
    assert m.position == 0
    assert "BGN" in m.context_snippet


def test_extract_multiple_positions_same_brand():
    text = "BGN 안과 정말 좋아요. 다른 곳보다 BGN 가 더 친절해요."
    out = extract_mentions(text, target_brand="BGN")
    assert len(out) == 2
    assert [m.position for m in out] == sorted(m.position for m in out)


def test_extract_no_partial_match_within_word():
    """'배경(BGNX)' 처럼 단어 일부에 BGN 이 들어가 있으면 매치되면 안 됨."""
    text = "ABGN 안과와 BGNX 의원은 다릅니다."
    out = extract_mentions(text, target_brand="BGN")
    # "ABGN" / "BGNX" 둘 다 다른 영숫자가 인접 → 어절 boundary 위배
    assert out == []


def test_extract_korean_word_boundary():
    text = "메디맵에서 진료받았어요. 메디맵은 친절해요."
    out = extract_mentions(text, target_brand="메디맵")
    # 조사 '에서/은' 는 한글이라 boundary 위배 → 매치 X
    assert out == []


def test_extract_korean_match_with_space_boundary():
    text = "메디맵 안과는 친절합니다. 메디맵 추천해요."
    out = extract_mentions(text, target_brand="메디맵")
    assert len(out) == 2


def test_extract_case_insensitive_for_english_brand():
    text = "bgn 안과와 BGN 안과는 같은 곳입니다."
    out = extract_mentions(text, target_brand="BGN")
    assert len(out) == 2


def test_extract_alias_matched_as_target():
    text = "밝은눈 안과는 좋습니다. 정식 명칭은 BGN 입니다."
    out = extract_mentions(text, target_brand="BGN", aliases=["밝은눈"])
    assert len(out) == 2
    assert all(m.is_target for m in out)


def test_extract_competitor_matched_separately():
    text = "BGN 안과와 누네안과 둘 다 후기가 많습니다."
    out = extract_mentions(text, target_brand="BGN", competitors=["누네안과"])
    targets = [m for m in out if m.is_target]
    competitors = [m for m in out if m.is_competitor]
    assert len(targets) == 1 and len(competitors) == 1
    assert targets[0].brand == "BGN"
    assert competitors[0].brand == "누네안과"


def test_extract_target_overrides_when_same_term_in_competitor():
    """target='메디맵' competitor=['메디맵'] → target 만 등록 (한 번)."""
    text = "메디맵 안과 추천."
    out = extract_mentions(text, target_brand="메디맵", competitors=["메디맵"])
    assert len(out) == 1
    assert out[0].is_target and not out[0].is_competitor


def test_extract_empty_text_returns_empty():
    assert extract_mentions("", target_brand="BGN") == []
    assert extract_mentions("   ", target_brand="BGN") == []


def test_extract_empty_target_returns_empty():
    assert extract_mentions("BGN 안과", target_brand="") == []


def test_extract_context_snippet_has_ellipsis():
    long = "앞쪽 텍스트가 충분히 길어야 합니다. " * 5 + "BGN 안과는 좋습니다. " + "뒤쪽도 충분히 길어요. " * 5
    out = extract_mentions(long, target_brand="BGN")
    assert len(out) == 1
    snip = out[0].context_snippet
    assert snip.startswith("…")
    assert snip.endswith("…")


def test_extract_position_is_in_original_text_index():
    text = "안녕하세요. BGN 안과 추천드려요."
    out = extract_mentions(text, target_brand="BGN")
    assert len(out) == 1
    assert text[out[0].position : out[0].position + 3] == "BGN"


def test_extract_returns_extracted_mention_dataclass():
    text = "BGN 추천."
    out = extract_mentions(text, target_brand="BGN")
    assert isinstance(out[0], ExtractedMention)
    assert out[0].is_negative is False  # v1 default
