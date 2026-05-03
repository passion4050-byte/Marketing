"""Text chunker — Phase 3-T1.1.

긴 문서를 임베딩하기 좋은 크기로 쪼갠다. 청크 사이 약간의 overlap 으로 의미 연속성 보존.

토큰 카운트 정책 (한국어 + 영어 혼합):
- 영어/숫자 어절: 보통 1 token
- 한글 어절: 보통 1.5~3 token (하지만 정확한 값은 OpenAI/Gemini 마다 다름)
- 보수적으로 어절(공백) 수 × 1.5 를 token estimate 로 사용

이 추정은 임베딩 비용 정확 계산용이 아니라 청크 크기 컨트롤용이므로 다소 느슨해도 OK.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    char_start: int
    char_end: int
    token_count: int  # 추정치


_TOKEN_RATIO = 1.5  # 어절당 평균 token


def estimate_token_count(text: str) -> int:
    """공백 split 기반 어절 × 1.5. 한국어 보수적 추정."""
    if not text:
        return 0
    n_words = len(text.split())
    return max(1, int(n_words * _TOKEN_RATIO))


def _split_sentences(text: str) -> list[str]:
    """간이 한국어/영어 문장 분리 — `.!?` 또는 줄바꿈 기준.

    문장 경계 모호하면 단락(double newline) → 줄(single) → 문장 순으로.
    """
    # 단락 우선 분리 (\n\n 기준)
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    sentences: list[str] = []
    for p in paragraphs:
        # 문장 분리 — 한국어 마침표/물음표/느낌표 + 줄바꿈
        parts = re.split(r"(?<=[\.!?])\s+|\n", p)
        for s in parts:
            s = s.strip()
            if s:
                sentences.append(s)
    return sentences


def chunk_text(
    text: str,
    *,
    max_tokens: int = 500,
    overlap_tokens: int = 100,
) -> list[Chunk]:
    """텍스트를 max_tokens 이하 청크로 분할. 인접 청크는 overlap_tokens 만큼 겹침.

    문장 단위로 누적 → max_tokens 초과 시 청크 마감 → 마지막 N 토큰을 다음 청크 prefix.
    """
    if not text or not text.strip():
        return []
    if max_tokens <= 0:
        raise ValueError("max_tokens must be > 0")
    overlap_tokens = max(0, min(overlap_tokens, max_tokens // 2))

    sentences = _split_sentences(text)
    if not sentences:
        return []

    chunks: list[Chunk] = []
    current: list[str] = []
    current_tokens = 0
    cursor = 0  # 원본 text 안에서 문장 위치 추적

    def _flush() -> None:
        nonlocal current, current_tokens, cursor
        if not current:
            return
        joined = " ".join(current)
        # 원본 위치 추정 — 첫 문장의 인덱스부터 마지막 문장 끝까지
        start = text.find(current[0], cursor)
        if start < 0:
            start = cursor
        end_anchor = current[-1]
        end_pos = text.find(end_anchor, start) + len(end_anchor)
        if end_pos <= start:
            end_pos = start + len(joined)
        chunks.append(
            Chunk(
                text=joined,
                char_start=start,
                char_end=end_pos,
                token_count=estimate_token_count(joined),
            )
        )
        cursor = max(cursor, end_pos - 1)

    for s in sentences:
        s_tokens = estimate_token_count(s)
        # 단일 문장이 max_tokens 초과 시 단순 강제 분할
        if s_tokens > max_tokens:
            if current:
                _flush()
                current = []
                current_tokens = 0
            # 단어 단위 슬라이스
            words = s.split()
            buf: list[str] = []
            buf_tok = 0
            for w in words:
                w_tok = estimate_token_count(w)
                if buf_tok + w_tok > max_tokens and buf:
                    current = buf
                    current_tokens = buf_tok
                    _flush()
                    # overlap
                    if overlap_tokens > 0 and buf:
                        keep = max(1, len(buf) // 3)
                        buf = buf[-keep:]
                        buf_tok = estimate_token_count(" ".join(buf))
                    else:
                        buf, buf_tok = [], 0
                buf.append(w)
                buf_tok += w_tok
            if buf:
                current = buf
                current_tokens = buf_tok
                _flush()
                current, current_tokens = [], 0
            continue

        if current_tokens + s_tokens > max_tokens and current:
            _flush()
            # overlap — 마지막 문장(들)의 token 합이 overlap_tokens 근처가 되도록 끌어오기
            if overlap_tokens > 0:
                tail = []
                tail_tok = 0
                for prev in reversed(current):
                    p_tok = estimate_token_count(prev)
                    if tail_tok + p_tok > overlap_tokens:
                        break
                    tail.insert(0, prev)
                    tail_tok += p_tok
                current = tail
                current_tokens = tail_tok
            else:
                current = []
                current_tokens = 0

        current.append(s)
        current_tokens += s_tokens

    if current:
        _flush()

    return chunks
