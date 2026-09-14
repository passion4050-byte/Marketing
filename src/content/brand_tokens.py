"""Round 204 (2026-09-14) — 브랜드명 질의 판정 (발행 우선순위·어드민 funnel 공용 규칙).

왜 필요한가:
    AI 답변 등장률을 브랜드명 질의("밝은눈안과강남", "위서클")와 비브랜드 질의("잠실 라섹 비용")로
    나누자 결과가 완전히 달랐다 (2026-07~09 실측).
      - 브랜드 질의: 56~91% 등장 — 콘텐츠와 무관하게 원래 높다.
      - 비브랜드 질의: 5.7~9.6% — 3개월째 제자리.
      - 비브랜드 own 키워드 중 **글이 있는 키워드 8.6~14.0% vs 없는 키워드 6.0~7.6%**.
    → 콘텐츠가 영향력을 만드는 곳은 비브랜드 롱테일이고, 그중 아직 글이 없는 키워드가
      가장 큰 미개척 레버다. 발행 우선순위가 이걸 알아야 한다.

규칙은 DB RPC `funnel_tenant_stats` (db/supabase/round203_funnel_tenant_stats.sql) 의
`tok` CTE 와 **동일**하다. 한쪽을 바꾸면 다른 쪽도 바꿀 것 — 테스트가 둘의 합의를 잠근다.

🔴 CLAUDE.md "자동 생성 별칭에 일반명사가 새면 측정이 허수" — Round 195 는 "한방의원" 에서
   접미사를 떼어 원문에 없던 "한방" 을 만들었다. 그래서 여기서는
     ① 3글자 하한, ② 일반명사 단어는 토큰 후보에서 제외(떼기 전에), ③ '…점' 지점표기 제외.
   접미사 제거는 **이미 브랜드인 단어**에만 적용되고 결과도 3글자 하한을 다시 통과해야 한다.
"""
from __future__ import annotations

import re

GENERIC_WORDS = frozenset({
    "피부과", "안과", "의원", "병원", "치과", "한의원", "한방의원", "성형외과", "클리닉", "한방병원",
})
_SUFFIX_RE = re.compile(r"(의원|피부과|안과|병원)$")
_MIN_LEN = 3


def brand_tokens(name: str | None, partner_slug: str | None = None) -> set[str]:
    """tenant 이름·partner_slug 에서 브랜드 토큰(소문자)을 만든다."""
    tokens: set[str] = set()
    for w in (name or "").split():
        # 일반명사·지점표기는 원형도 접미사 제거형도 토큰이 될 수 없다.
        #   ⚠ 제거형에서도 반드시 거를 것: "성형외과"·"클리닉" 은 뗄 접미사가 없어
        #     원형 그대로 3글자 하한을 통과해버린다.
        if w.endswith("점") or w in GENERIC_WORDS:
            continue
        if len(w) >= _MIN_LEN:
            tokens.add(w.lower())
        stem = _SUFFIX_RE.sub("", w)
        if len(stem) >= _MIN_LEN and stem not in GENERIC_WORDS:
            tokens.add(stem.lower())
    ps = (partner_slug or "").strip()
    if len(ps) >= _MIN_LEN and not ps.lower().endswith("-self"):
        tokens.add(ps.lower())
    return tokens


def is_branded(keyword: str | None, tokens: set[str]) -> bool:
    """키워드에 브랜드 토큰이 들어 있으면 True (공백 무시·대소문자 무시)."""
    if not keyword or not tokens:
        return False
    compact = keyword.replace(" ", "").lower()
    return any(t in compact for t in tokens)
