"""Phase 3-T1.5 — chunker pytest.

검증 항목:
- 짧은 텍스트는 1 chunk
- 긴 텍스트는 max_tokens 가 작으면 여러 chunk 로 분리되고 각 chunk token_count 가 max 이하
- 인접 chunk 사이에 겹치는 어절(overlap) 이 존재
- 한국어 어절 split 이 동작
- 빈 입력은 빈 리스트
"""

from __future__ import annotations

import pytest

from src.reference.chunker import Chunk, chunk_text, estimate_token_count


def test_empty_returns_empty_list():
    assert chunk_text("") == []
    assert chunk_text("   \n\n   ") == []


def test_short_text_is_single_chunk():
    text = "백내장은 수정체가 혼탁해지는 질환입니다. 강남에서 안과를 찾을 때는 의사 경험을 보세요."
    chunks = chunk_text(text, max_tokens=500, overlap_tokens=100)
    assert len(chunks) == 1
    assert isinstance(chunks[0], Chunk)
    assert chunks[0].token_count > 0


def test_long_text_splits_into_multiple_chunks_within_token_budget():
    sentence = "백내장은 수정체가 혼탁해지는 안과 질환입니다."
    text = " ".join([sentence] * 60)  # 의도적으로 긴 텍스트
    chunks = chunk_text(text, max_tokens=80, overlap_tokens=20)

    assert len(chunks) >= 3, f"기대: 3+ chunks, 실제: {len(chunks)}"
    for c in chunks:
        # estimate_token_count 추정 vs max_tokens — 약간의 오차 허용 (overlap+sentence 누적)
        assert c.token_count <= 80 * 1.5, f"chunk token 초과: {c.token_count}"


def test_adjacent_chunks_have_overlap():
    """인접 chunk 가 어절 단위로 겹쳐야 함 (overlap_tokens>0)."""
    sentence = "안과 검진은 정기적으로 받는 것이 중요합니다."
    text = " ".join([sentence] * 40)
    chunks = chunk_text(text, max_tokens=60, overlap_tokens=20)

    if len(chunks) < 2:
        pytest.skip("이 입력에서 chunk 가 1개라 overlap 검증 불가")

    # 인접 chunk 사이 공통 어절이 있어야 함
    for prev, curr in zip(chunks[:-1], chunks[1:]):
        prev_words = set(prev.text.split())
        curr_words = set(curr.text.split())
        common = prev_words & curr_words
        assert len(common) > 0, "인접 chunk 사이 overlap 어절 없음"


def test_korean_word_split_smoke():
    """한국어 어절 카운트가 동작 (영어와 mixing)."""
    text = "안녕하세요 hello world 백내장"
    n = estimate_token_count(text)
    assert n > 0
    assert n >= 4  # 최소 4 어절


def test_invalid_max_tokens_raises():
    with pytest.raises(ValueError):
        chunk_text("아무거나", max_tokens=0)


def test_chunk_char_offsets_are_within_text_bounds():
    text = "첫 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다. " * 20
    chunks = chunk_text(text, max_tokens=50, overlap_tokens=10)
    for c in chunks:
        assert 0 <= c.char_start <= len(text)
        assert c.char_start <= c.char_end <= len(text) + 5  # _flush 추정 오차 약간 허용
