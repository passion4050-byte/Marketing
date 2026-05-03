"""Instagram 캡션 템플릿 — Phase 2-T2.2 신규 채널.

스펙:
- 본문 200~300자 (한글 1자=1, 이모지 1자=1)
- hook (첫 1줄, 호기심/질문)
- body (본문 핵심)
- cta (마지막, 행동 유도)
- 해시태그 5~10개

의료법 압축 표현 가이드: 짧은 글이라 효과 약속어가 더 위험. tenants.yaml 의 instagram
channel_rules (Phase 2-T1.4) 가 추가 검사 적용.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class InstagramCaption:
    hook: str            # 첫 1줄 (예: "강남에서 라식 고민 중이라면? 👀")
    body: str            # 본문 (이모지 자유롭게)
    cta: str             # 마지막 행동 유도 (예: "DM 으로 상담 받아보세요 💌")
    hashtags: list[str] = field(default_factory=list)  # # 없이 단어만

    def char_count_body_only(self) -> int:
        """hook + body + cta 의 글자 수 (해시태그 제외)."""
        return len(self.hook) + len(self.body) + len(self.cta)


# ─── 검증 ─────────────────────────────────────────────────


def validate_length(caption: InstagramCaption) -> tuple[bool, int]:
    """본문(해시태그 제외) 글자 수 200~300 OK 여부 + 글자 수.

    Returns:
        (ok: bool, char_count: int)
    """
    n = caption.char_count_body_only()
    return (200 <= n <= 300, n)


def validate_hashtags(caption: InstagramCaption) -> tuple[bool, int]:
    """해시태그 5~10개 OK 여부 + 개수."""
    n = len(caption.hashtags)
    return (5 <= n <= 10, n)


# ─── 렌더 ─────────────────────────────────────────────────


def render_instagram_caption(cap: InstagramCaption, *, include_hashtags: bool = True) -> str:
    """InstagramCaption → 인스타 게시글에 그대로 붙여넣기 가능한 캡션 텍스트.

    줄바꿈 가독성 — hook / 빈줄 / body / 빈줄 / cta / 빈줄 / 해시태그.
    """
    parts: list[str] = []
    if cap.hook:
        parts.append(cap.hook)
        parts.append("")
    if cap.body:
        parts.append(cap.body)
        parts.append("")
    if cap.cta:
        parts.append(cap.cta)
    if include_hashtags and cap.hashtags:
        parts.append("")
        tag_line = " ".join(f"#{t.lstrip('#')}" for t in cap.hashtags)
        parts.append(tag_line)
    return "\n".join(parts).strip() + "\n"


# ─── LLM JSON → dataclass ────────────────────────────────


def post_from_dict(data: dict) -> InstagramCaption:
    """LLM 의 JSON 출력 → InstagramCaption.

    예상 schema:
    {
      "hook": "...",
      "body": "...",
      "cta": "...",
      "hashtags": ["라식", "강남안과", ...]
    }
    """
    return InstagramCaption(
        hook=data.get("hook", ""),
        body=data.get("body", ""),
        cta=data.get("cta", ""),
        hashtags=list(data.get("hashtags") or []),
    )
