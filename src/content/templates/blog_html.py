"""SEO 친화적 블로그 HTML 템플릿 — Phase 1.5.

LLM이 생성하는 블로그 글 구조화 결과를 받아 워드프레스/티스토리 등에 붙여넣기 가능한 HTML로 변환.

요구사항:
- h1 / h2 / h3 위계 구조
- <meta name="description"> + Open Graph 태그
- 본문 단락 + 출처 링크 + 이미지 placeholder
- 내부 링크 자리(키워드 강조)
- 불필요한 스타일 제거 (CMS 친화)
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from typing import Iterable, Optional


@dataclass
class ImageSlot:
    """본문에 삽입할 이미지 정보."""

    src: str  # 사용자가 자기 사이트에 올린 후 src만 교체할 placeholder OK
    alt: str  # AI가 본문 컨텍스트 보고 자동 생성한 대체 텍스트
    caption: Optional[str] = None
    after_section: int = 1  # 몇 번째 H2 섹션 뒤에 배치할지


@dataclass
class BlogSection:
    heading: str  # H2
    paragraphs: list[str]
    sub_sections: list["BlogSubsection"] = field(default_factory=list)


@dataclass
class BlogSubsection:
    heading: str  # H3
    paragraphs: list[str]


@dataclass
class BlogPost:
    """LLM 출력의 정규화된 형태. JSON으로 받아 dataclass로 매핑."""

    title: str
    meta_description: str  # 검색 결과에 노출되는 150~160자
    keywords: list[str]
    intro_paragraphs: list[str]
    sections: list[BlogSection]
    conclusion_paragraphs: list[str]
    references: list[str] = field(default_factory=list)  # 출처 URL 목록
    images: list[ImageSlot] = field(default_factory=list)
    canonical_keyword: str = ""
    # 영업 정보 — 본문 끝에 자연 노출 (Phase 1.5)
    tenant_name: str = ""
    tenant_address: str = ""
    tenant_naver_place_url: str = ""
    tenant_phone: str = ""
    tenant_homepage: str = ""

    def total_word_count(self) -> int:
        """대략 글자 수 — 네이버 블로그 1500~2500자 가이드 체크용."""
        n = sum(len(p) for p in self.intro_paragraphs)
        n += sum(len(p) for p in self.conclusion_paragraphs)
        for s in self.sections:
            n += len(s.heading) + sum(len(p) for p in s.paragraphs)
            for sub in s.sub_sections:
                n += len(sub.heading) + sum(len(p) for p in sub.paragraphs)
        return n


def _e(s: str) -> str:
    return html.escape(s, quote=True)


_BOLD_RE = re.compile(r"\*\*([^*\n]+?)\*\*")
_ITALIC_RE = re.compile(r"(?<![\*])\*([^*\n]+?)\*(?![\*])")


def _md_to_html_inline(text: str) -> str:
    """**bold** → <strong>, *italic* → <em>. 나머지는 escape.

    안전하게: 모든 텍스트를 escape한 뒤, escape된 마크다운 마커만 다시 태그로.
    """
    escaped = _e(text)
    # ** ... ** → <strong>...</strong>
    escaped = re.sub(r"\*\*([^*\n]+?)\*\*", r"<strong>\1</strong>", escaped)
    # * ... * → <em>...</em>  (단, **를 이미 처리한 뒤이므로 단일 * 만 매치)
    escaped = re.sub(r"(?<![\*])\*([^*\n]+?)\*(?![\*])", r"<em>\1</em>", escaped)
    return escaped


def _para_html(p: str) -> str:
    # 줄바꿈 보존 — 의미 단위마다 빈 줄 있으면 단락 분리
    parts = [seg for seg in p.split("\n\n") if seg.strip()]
    if not parts:
        return ""
    return "\n".join(f"<p>{_md_to_html_inline(seg.strip())}</p>" for seg in parts)


def _image_html(img: ImageSlot) -> str:
    parts = [f'<img src="{_e(img.src)}" alt="{_e(img.alt)}" loading="lazy" />']
    if img.caption:
        parts.append(f"<figcaption>{_e(img.caption)}</figcaption>")
    return f'<figure class="post-image">\n  {chr(10).join(parts)}\n</figure>'


def render_meta_block(post: BlogPost, site_url: Optional[str] = None) -> str:
    """페이지 <head>에 들어갈 SEO 메타 블록."""
    keywords = ", ".join(post.keywords) if post.keywords else post.canonical_keyword
    meta = [
        f"<title>{_e(post.title)}</title>",
        f'<meta name="description" content="{_e(post.meta_description)}" />',
    ]
    if keywords:
        meta.append(f'<meta name="keywords" content="{_e(keywords)}" />')
    # Open Graph
    meta.append(f'<meta property="og:title" content="{_e(post.title)}" />')
    meta.append(f'<meta property="og:description" content="{_e(post.meta_description)}" />')
    meta.append('<meta property="og:type" content="article" />')
    if site_url:
        meta.append(f'<meta property="og:url" content="{_e(site_url)}" />')
    if post.images:
        meta.append(f'<meta property="og:image" content="{_e(post.images[0].src)}" />')
    return "\n".join(meta)


def _location_block_html(post: BlogPost) -> str:
    """병원 위치/연락 안내 블록. 자연 톤 + 네이버 플레이스 링크."""
    if not (post.tenant_name or post.tenant_address or post.tenant_naver_place_url):
        return ""
    lines = ['<aside class="location-info" style="margin:24px 0;padding:16px 20px;border-left:4px solid #ddd;background:#fafafa;">']
    lines.append(f"<p><strong>📍 {_e(post.tenant_name) if post.tenant_name else '위치 안내'}</strong></p>")
    if post.tenant_address:
        lines.append(f"<p>주소: {_e(post.tenant_address)}</p>")
    if post.tenant_naver_place_url:
        lines.append(
            f'<p>네이버 지도: '
            f'<a href="{_e(post.tenant_naver_place_url)}" rel="noopener" target="_blank">'
            f'{_e(post.tenant_naver_place_url)}</a></p>'
        )
    bits = []
    if post.tenant_phone:
        bits.append(f"전화 {_e(post.tenant_phone)}")
    if post.tenant_homepage:
        bits.append(
            f'홈페이지 <a href="{_e(post.tenant_homepage)}" rel="noopener" target="_blank">{_e(post.tenant_homepage)}</a>'
        )
    if bits:
        lines.append("<p>" + " · ".join(bits) + "</p>")
    lines.append("</aside>")
    return "\n".join(lines)


def render_body(post: BlogPost) -> str:
    """페이지 <body> 안에 들어갈 본문 블록."""
    parts: list[str] = []

    # H1
    parts.append(f"<h1>{_md_to_html_inline(post.title)}</h1>")

    # Intro
    for p in post.intro_paragraphs:
        parts.append(_para_html(p))

    # H2 섹션 + 이미지 배치
    images_by_section: dict[int, list[ImageSlot]] = {}
    for img in post.images:
        images_by_section.setdefault(img.after_section, []).append(img)

    for i, sec in enumerate(post.sections, 1):
        parts.append(f"<h2>{_md_to_html_inline(sec.heading)}</h2>")
        for p in sec.paragraphs:
            parts.append(_para_html(p))
        for sub in sec.sub_sections:
            parts.append(f"<h3>{_md_to_html_inline(sub.heading)}</h3>")
            for p in sub.paragraphs:
                parts.append(_para_html(p))
        # 섹션 뒤 이미지
        for img in images_by_section.get(i, []):
            parts.append(_image_html(img))

    # Conclusion
    if post.conclusion_paragraphs:
        parts.append("<h2>마치며</h2>")
        for p in post.conclusion_paragraphs:
            parts.append(_para_html(p))

    # 위치/연락 안내 (자연 톤)
    loc = _location_block_html(post)
    if loc:
        parts.append(loc)

    # References
    if post.references:
        parts.append("<h2>참고 자료</h2>")
        items = "\n".join(
            f'  <li><a href="{_e(u)}" rel="noopener" target="_blank">{_e(u)}</a></li>'
            for u in post.references
        )
        parts.append(f"<ul>\n{items}\n</ul>")

    return "\n\n".join(p for p in parts if p)


def render_full_html(post: BlogPost, site_url: Optional[str] = None) -> str:
    """완전한 HTML 페이지 — 사용자가 그대로 저장해 미리보기 가능."""
    meta = render_meta_block(post, site_url=site_url)
    body = render_body(post)
    return (
        "<!DOCTYPE html>\n"
        '<html lang="ko">\n<head>\n<meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        f"{meta}\n</head>\n<body>\n{body}\n</body>\n</html>"
    )


def render_cms_paste(post: BlogPost) -> str:
    """워드프레스/티스토리에 붙여넣기용 — <head>는 빼고 본문만."""
    return render_body(post)


def _strip_md(text: str) -> str:
    """네이버 평문용: 마크다운 ** 제거 (이모지는 유지)."""
    text = re.sub(r"\*\*([^*\n]+?)\*\*", r"\1", text)
    text = re.sub(r"(?<![\*])\*([^*\n]+?)\*(?![\*])", r"\1", text)
    return text


def render_naver_blog_plain(post: BlogPost) -> str:
    """네이버 블로그 평문 — HTML 미지원. 단락 + 이모지 + 해시태그.

    bold 마크다운 ** 는 제거 (네이버 평문에선 불필요), 이모지는 유지.
    """
    out: list[str] = []
    out.append(f"# {_strip_md(post.title)}\n")
    if post.meta_description:
        out.append(f"💡 {_strip_md(post.meta_description)}\n")
    for p in post.intro_paragraphs:
        out.append(_strip_md(p.strip()))
        out.append("")

    for i, sec in enumerate(post.sections, 1):
        # 섹션 heading에 이미 이모지 있을 수 있음
        head = _strip_md(sec.heading)
        if not any(ch in head for ch in "📌🩺⏱️✅💡📍🏥👀"):
            head = f"📌 {head}"
        out.append(head)
        out.append("")
        for p in sec.paragraphs:
            out.append(_strip_md(p.strip()))
            out.append("")
        for sub in sec.sub_sections:
            out.append(f"   ▸ {_strip_md(sub.heading)}")
            out.append("")
            for p in sub.paragraphs:
                out.append(_strip_md(p.strip()))
                out.append("")
        for img in (i_ for i_ in post.images if i_.after_section == i):
            out.append(f"[이미지: {img.alt}]")
            out.append("")

    if post.conclusion_paragraphs:
        out.append("✅ 마치며")
        out.append("")
        for p in post.conclusion_paragraphs:
            out.append(_strip_md(p.strip()))
            out.append("")

    # 위치 안내 (자연 톤)
    if post.tenant_name or post.tenant_address or post.tenant_naver_place_url:
        out.append("📍 위치 안내")
        if post.tenant_name:
            out.append(post.tenant_name)
        if post.tenant_address:
            out.append(f"주소: {post.tenant_address}")
        if post.tenant_naver_place_url:
            out.append(f"네이버 지도: {post.tenant_naver_place_url}")
        if post.tenant_phone:
            out.append(f"전화: {post.tenant_phone}")
        if post.tenant_homepage:
            out.append(f"홈페이지: {post.tenant_homepage}")
        out.append("")

    if post.keywords:
        out.append("")
        out.append(" ".join(f"#{k.replace(' ', '')}" for k in post.keywords))
    return "\n".join(out).strip()


def post_from_dict(data: dict, images: Iterable[ImageSlot] = ()) -> BlogPost:
    """LLM JSON 출력 → BlogPost. 누락 필드는 안전 기본값."""
    sections_raw = data.get("sections", []) or []
    sections: list[BlogSection] = []
    for s in sections_raw:
        sub = [
            BlogSubsection(heading=ss.get("heading", ""), paragraphs=ss.get("paragraphs", []) or [])
            for ss in (s.get("sub_sections") or [])
        ]
        sections.append(
            BlogSection(
                heading=s.get("heading", ""),
                paragraphs=s.get("paragraphs", []) or [],
                sub_sections=sub,
            )
        )
    return BlogPost(
        title=data.get("title", ""),
        meta_description=data.get("meta_description", ""),
        keywords=data.get("keywords", []) or [],
        intro_paragraphs=data.get("intro_paragraphs", []) or [],
        sections=sections,
        conclusion_paragraphs=data.get("conclusion_paragraphs", []) or [],
        references=data.get("references", []) or [],
        canonical_keyword=data.get("canonical_keyword", ""),
        images=list(images),
    )
