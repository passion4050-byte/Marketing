"""네이버 블로그 평문 템플릿 — Phase 2-T2.1 독립 채널.

기존 `blog_html.py:render_naver_blog_plain()` 은 SEO HTML 의 부산물이었음.
본 모듈은 네이버 검색 SEO + 의료법 가이드에 맞춰 **독립 LLM 호출**로 받은 결과를
그대로 평문으로 렌더한다.

스펙:
- 본문 1500~2500자
- 이모지 헤더 (예: "💡 핵심 정리", "🩺 진료 안내")
- `[이미지N]` placeholder (이미지 자동 배치는 사용자가 SmartEditor에서 처리)
- 마지막에 위치 안내 + 해시태그
- HTML 금지 (네이버 SmartEditor 가 strip)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NaverSection:
    """평문 섹션 — 이모지 헤더 + 단락들."""

    heading: str          # 예: "💡 라식 vs 라섹 차이"
    paragraphs: list[str] = field(default_factory=list)


@dataclass
class NaverBlogPost:
    title: str
    intro: list[str]                                 # 도입부 단락 1~2개
    sections: list[NaverSection]                     # 본문 섹션 3~5개 권장
    conclusion: list[str]                            # 마무리 단락 1~2개
    hashtags: list[str] = field(default_factory=list)  # 5~10개
    image_count: int = 0                             # [이미지N] placeholder 갯수
    # 영업 정보 (위치 안내용)
    tenant_name: str = ""
    tenant_address: str = ""
    tenant_naver_place_url: str = ""
    tenant_phone: str = ""

    def char_count(self) -> int:
        """본문(타이틀 제외) 글자 수."""
        n = sum(len(p) for p in self.intro)
        n += sum(len(p) for p in self.conclusion)
        for s in self.sections:
            n += len(s.heading) + sum(len(p) for p in s.paragraphs)
        return n


# ─── 평문 렌더 ─────────────────────────────────────────────────


_MD_BOLD = re.compile(r"\*\*([^*\n]+?)\*\*")
_MD_ITALIC = re.compile(r"(?<![\*])\*([^*\n]+?)\*(?![\*])")


def _md_strip(text: str) -> str:
    """네이버는 HTML/마크다운 미지원 — bold/italic 마커만 제거."""
    text = _MD_BOLD.sub(r"\1", text)
    text = _MD_ITALIC.sub(r"\1", text)
    return text


def _location_block(post: NaverBlogPost) -> str:
    if not (post.tenant_name or post.tenant_address):
        return ""
    lines = [f"📍 {post.tenant_name}"] if post.tenant_name else []
    if post.tenant_address:
        lines.append(f"   {post.tenant_address}")
    if post.tenant_phone:
        lines.append(f"☎ {post.tenant_phone}")
    if post.tenant_naver_place_url:
        lines.append(f"🗺️ 네이버 플레이스: {post.tenant_naver_place_url}")
    return "\n".join(lines)


def render_naver_plain(post: NaverBlogPost) -> str:
    """NaverBlogPost → 네이버 SmartEditor 에 그대로 붙여넣기 가능한 평문."""
    parts: list[str] = []

    # 타이틀
    parts.append(post.title)
    parts.append("")  # 빈 줄

    # 도입
    for p in post.intro:
        parts.append(_md_strip(p))
    parts.append("")

    # 이미지 placeholder 1
    img_idx = 1
    if post.image_count > 0:
        parts.append(f"[이미지{img_idx}]")
        img_idx += 1
        parts.append("")

    # 본문 섹션들
    for i, section in enumerate(post.sections, 1):
        parts.append(section.heading)  # 이모지 헤더
        parts.append("")
        for p in section.paragraphs:
            parts.append(_md_strip(p))
        parts.append("")
        # 짝수 섹션마다 이미지
        if img_idx <= post.image_count and i % 2 == 0:
            parts.append(f"[이미지{img_idx}]")
            img_idx += 1
            parts.append("")

    # 마무리
    if post.conclusion:
        for p in post.conclusion:
            parts.append(_md_strip(p))
        parts.append("")

    # 위치 안내
    loc = _location_block(post)
    if loc:
        parts.append("─" * 20)
        parts.append(loc)
        parts.append("")

    # 해시태그
    if post.hashtags:
        tag_line = " ".join(f"#{t.lstrip('#')}" for t in post.hashtags)
        parts.append(tag_line)

    return "\n".join(parts).strip() + "\n"


# ─── LLM JSON → dataclass ────────────────────────────────────


def post_from_dict(data: dict, *, tenant_name: str = "", tenant_address: str = "",
                   tenant_naver_place_url: str = "", tenant_phone: str = "") -> NaverBlogPost:
    """LLM 의 JSON 출력 → NaverBlogPost.

    예상 schema:
    {
      "title": "...",
      "intro": ["문단1", "문단2"],
      "sections": [{"heading": "💡 ...", "paragraphs": ["문단1", "문단2"]}, ...],
      "conclusion": ["..."],
      "hashtags": ["라식", "강남안과", ...],
      "image_count": 3
    }
    """
    sections = [
        NaverSection(
            heading=s.get("heading", ""),
            paragraphs=list(s.get("paragraphs") or []),
        )
        for s in (data.get("sections") or [])
    ]
    return NaverBlogPost(
        title=data.get("title", ""),
        intro=list(data.get("intro") or []),
        sections=sections,
        conclusion=list(data.get("conclusion") or []),
        hashtags=list(data.get("hashtags") or []),
        image_count=int(data.get("image_count", 0)),
        tenant_name=tenant_name,
        tenant_address=tenant_address,
        tenant_naver_place_url=tenant_naver_place_url,
        tenant_phone=tenant_phone,
    )
