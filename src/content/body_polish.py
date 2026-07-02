"""HTML body 후처리 폴리셔 v2 — Round 108-c (2026-07-03).

id 42 (jamsil-lasik-types-and-screening, llm_provider=manual-claude) 를 벤치마크로
사용자 최초 세팅 콘텐츠 스타일 완전 재현.

폴리셔 로직:
1. HTML entity 이중 인코딩 복구 (&amp; → &)
2. 연속 <p>|...|</p> 마크다운 표 잔재 → 스타일드 <table> 병합
3. 태그별 인라인 스타일 자동 삽입 (id 42 정확한 팔레트)
4. **Pretendard 폰트** wrapper 감쌈 (전체 강제)

id 42 스타일 특징:
- font-size 1.1em, line-height 1.85 (본문)
- <h2> font-size 1.75em, letter-spacing -0.01em
- <mark> 노란 형광펜 (#FEF08A)
- 컬러 chip H3 배지 4종 (블루/그린/인디고/레드/핑크)
- 표 padding 14px 18px + border #cbd5e1 + alternating #fafafa
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# ─── Pretendard 폰트 wrapper (전체 감쌈) ─────────────────────

_PRETENDARD_FONT_STACK = (
    "'Pretendard Variable', Pretendard, "
    "-apple-system, BlinkMacSystemFont, system-ui, "
    "Roboto, 'Helvetica Neue', 'Segoe UI', "
    "'Apple SD Gothic Neo', 'Noto Sans KR', "
    "'Malgun Gothic', sans-serif"
)
_WRAPPER_OPEN = (
    f'<div class="wecircle-body" style="font-family: {_PRETENDARD_FONT_STACK}; '
    f'color: #1e293b; -webkit-font-smoothing: antialiased;">'
)
_WRAPPER_CLOSE = "</div>"

# ─── 인라인 스타일 (id 42 정확 벤치마크) ─────────────────────

# Round 108-c (2026-07-03) — 무신사 매거진 감도 참고.
# 미니멀 · 시네마틱 · 넉넉한 여백 · 강한 typography contrast.
_STYLE_H1 = (
    "font-size: 2.4em; font-weight: 900; color: #0a0a0a; "
    "margin: 0.3em 0 1em 0; line-height: 1.25; "
    "letter-spacing: -0.025em;"
)
_STYLE_H2 = (
    "font-size: 1.85em; font-weight: 800; color: #0a0a0a; "
    "margin-top: 3em; margin-bottom: 1em; line-height: 1.35; "
    "letter-spacing: -0.02em;"
)
# H3 — 무신사 style: 서브 라벨 uppercase small caps, 색상 절제
_H3_ACCENT_COLORS = [
    "#1a1a1a",   # black
    "#3a3a3a",   # dark gray
    "#525252",   # medium gray
]


def _h3_chip_style(idx: int) -> str:
    color = _H3_ACCENT_COLORS[idx % len(_H3_ACCENT_COLORS)]
    return (
        f"font-size: 1.15em; font-weight: 800; color: {color}; "
        f"margin: 2.4em 0 0.8em 0; line-height: 1.4; "
        f"letter-spacing: -0.01em; "
        f"padding-bottom: 0.4em; border-bottom: 2px solid #0a0a0a; "
        f"display: inline-block;"
    )


_STYLE_P = (
    "font-size: 1.08em; line-height: 1.9; color: #1a1a1a; "
    "margin-bottom: 1.6em; font-weight: 400;"
)
_STYLE_TABLE = (
    "width: 100%; border-collapse: collapse; margin-bottom: 2em; "
    "font-size: 0.95em; border: 1px solid #cbd5e1;"
)
_STYLE_TABLE_TR_HEADER = "background-color: #f1f5f9;"
_STYLE_TABLE_TR_ALT = "background-color: #fafafa;"
_STYLE_TABLE_TH = (
    "border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; "
    "font-weight: 700; color: #0f172a;"
)
_STYLE_TABLE_TD = (
    "border: 1px solid #cbd5e1; padding: 14px 18px; color: #1e293b;"
)
_STYLE_UL = "margin-bottom: 1.5em; line-height: 1.9; padding-left: 1.5em;"
_STYLE_OL = _STYLE_UL
_STYLE_LI = "margin-bottom: 0.5em;"
_STYLE_FIGURE = "margin: 2.5em 0;"
_STYLE_IMG = "width: 100%; height: auto; border-radius: 12px;"
_STYLE_FIGCAPTION = (
    "text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;"
)
_STYLE_MARK = (
    "background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; "
    "font-weight: 600;"
)
_STYLE_STRONG = "font-weight: 700; color: #0f172a;"
_STYLE_BLOCKQUOTE = (
    "border-left: 4px solid #cbd5e1; margin: 1.5em 0; "
    "padding: 0.5em 1em; color: #475569; background: #f8fafc;"
)


# ─── 1. HTML entity 이중 인코딩 복구 ─────────────────────────

_ENTITY_MAP = {
    "&amp;": "&",
    "&#x27;": "'",
    "&#39;": "'",
    "&quot;": '"',
    "&#34;": '"',
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
}


def _decode_double_entities(text: str) -> str:
    for enc, dec in _ENTITY_MAP.items():
        text = text.replace(enc, dec)
    return text


# ─── 2. 연속 <p>| ... |</p> → <table> 병합 ─────────────────

_MD_ROW_P_RE = re.compile(
    r"<p[^>]*>\s*\|(.*?)\|\s*</p>",
    re.IGNORECASE | re.DOTALL,
)
_MD_SEP_ROW_RE = re.compile(r"^\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)*\s*$")


def _consolidate_md_table_paragraphs(html_text: str) -> str:
    matches = list(_MD_ROW_P_RE.finditer(html_text))
    if not matches:
        return html_text

    groups: list[list[re.Match]] = []
    current: list[re.Match] = []
    for m in matches:
        if current:
            between = html_text[current[-1].end():m.start()]
            if between.strip():
                if len(current) >= 2:
                    groups.append(current)
                current = [m]
                continue
        current.append(m)
    if len(current) >= 2:
        groups.append(current)

    if not groups:
        return html_text

    for group in reversed(groups):
        start = group[0].start()
        end = group[-1].end()
        header: list[str] | None = None
        rows_cells: list[list[str]] = []
        for m in group:
            row_content = m.group(1).strip()
            if _MD_SEP_ROW_RE.match(row_content):
                continue
            cells = [c.strip() for c in row_content.split("|")]
            if header is None:
                header = cells
            else:
                rows_cells.append(cells)

        if not header:
            continue

        thead_cells = "".join(
            f'<th style="{_STYLE_TABLE_TH}">{c}</th>' for c in header
        )
        tbody_rows: list[str] = []
        for i, r in enumerate(rows_cells):
            tr_style = _STYLE_TABLE_TR_ALT if i % 2 == 1 else ""
            tr_open = f'<tr style="{tr_style}">' if tr_style else "<tr>"
            tds = "".join(f'<td style="{_STYLE_TABLE_TD}">{c}</td>' for c in r)
            tbody_rows.append(f"{tr_open}{tds}</tr>")
        table_html = (
            f'<table style="{_STYLE_TABLE}">'
            f'<thead><tr style="{_STYLE_TABLE_TR_HEADER}">{thead_cells}</tr></thead>'
            f'<tbody>{"".join(tbody_rows)}</tbody>'
            f"</table>"
        )
        html_text = html_text[:start] + table_html + html_text[end:]

    return html_text


# ─── 3. 기존 <table> 스타일 강화 (스타일 없는 것만) ────────

_TABLE_NO_STYLE_RE = re.compile(
    r"<table(?![^>]*\bstyle=)([^>]*)>(.*?)</table>",
    re.IGNORECASE | re.DOTALL,
)


def _style_existing_tables(text: str) -> str:
    def _wrap(m: re.Match) -> str:
        attrs, inner = m.group(1), m.group(2)
        # thead 첫 tr 헤더 스타일
        inner = re.sub(
            r"<thead[^>]*>\s*<tr(?![^>]*\bstyle=)([^>]*)>",
            rf'<thead><tr style="{_STYLE_TABLE_TR_HEADER}"\1>',
            inner, count=1, flags=re.IGNORECASE,
        )
        # th 스타일
        inner = re.sub(
            r"<th(?![^>]*\bstyle=)([^>]*)>",
            rf'<th style="{_STYLE_TABLE_TH}"\1>',
            inner, flags=re.IGNORECASE,
        )
        # td 스타일
        inner = re.sub(
            r"<td(?![^>]*\bstyle=)([^>]*)>",
            rf'<td style="{_STYLE_TABLE_TD}"\1>',
            inner, flags=re.IGNORECASE,
        )
        # tbody 안 tr alternating (홀수만 배경)
        tbody_match = re.search(
            r"(<tbody[^>]*>)(.*?)(</tbody>)", inner, re.IGNORECASE | re.DOTALL
        )
        if tbody_match:
            tbody_open, tbody_inner, tbody_close = tbody_match.groups()
            trs = re.findall(
                r"<tr(?![^>]*\bstyle=)([^>]*)>(.*?)</tr>",
                tbody_inner, flags=re.IGNORECASE | re.DOTALL,
            )
            new_tbody = ""
            for i, (attrs2, content) in enumerate(trs):
                style = f' style="{_STYLE_TABLE_TR_ALT}"' if i % 2 == 1 else ""
                new_tbody += f"<tr{style}{attrs2}>{content}</tr>"
            inner = inner.replace(tbody_match.group(0), tbody_open + new_tbody + tbody_close)
        return f'<table style="{_STYLE_TABLE}"{attrs}>{inner}</table>'

    return _TABLE_NO_STYLE_RE.sub(_wrap, text)


# ─── 4. 헤더/문단/기타 인라인 스타일 자동 삽입 ─────────────

_H1_RE = re.compile(r"<h1(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_H2_RE = re.compile(r"<h2(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_H3_RE = re.compile(r"<h3(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_P_RE = re.compile(r"<p(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_UL_RE = re.compile(r"<ul(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_OL_RE = re.compile(r"<ol(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_LI_RE = re.compile(r"<li(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_FIGURE_RE = re.compile(r"<figure(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_IMG_RE = re.compile(r"<img(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_FIGCAPTION_RE = re.compile(r"<figcaption(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_MARK_RE = re.compile(r"<mark(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_STRONG_RE = re.compile(r"<strong(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_BLOCKQUOTE_RE = re.compile(r"<blockquote(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)


def _cycle_h3_styles(text: str) -> str:
    """<h3> 마다 색상 chip 순환 (5색)."""
    counter = {"i": 0}

    def _sub(m: re.Match) -> str:
        style = _h3_chip_style(counter["i"])
        counter["i"] += 1
        return f'<h3 style="{style}"{m.group(1)}>'

    return re.sub(r"<h3(?![^>]*\bstyle=)([^>]*)>", _sub, text, flags=re.IGNORECASE)


def _inject_inline_styles(text: str) -> str:
    text = _H1_RE.sub(rf'<h1 style="{_STYLE_H1}"\1>', text)
    text = _H2_RE.sub(rf'<h2 style="{_STYLE_H2}"\1>', text)
    text = _cycle_h3_styles(text)
    text = _P_RE.sub(rf'<p style="{_STYLE_P}"\1>', text)
    text = _UL_RE.sub(rf'<ul style="{_STYLE_UL}"\1>', text)
    text = _OL_RE.sub(rf'<ol style="{_STYLE_OL}"\1>', text)
    text = _LI_RE.sub(rf'<li style="{_STYLE_LI}"\1>', text)
    text = _FIGURE_RE.sub(rf'<figure style="{_STYLE_FIGURE}"\1>', text)
    text = _IMG_RE.sub(rf'<img style="{_STYLE_IMG}"\1>', text)
    text = _FIGCAPTION_RE.sub(rf'<figcaption style="{_STYLE_FIGCAPTION}"\1>', text)
    text = _MARK_RE.sub(rf'<mark style="{_STYLE_MARK}"\1>', text)
    text = _STRONG_RE.sub(rf'<strong style="{_STYLE_STRONG}"\1>', text)
    text = _BLOCKQUOTE_RE.sub(rf'<blockquote style="{_STYLE_BLOCKQUOTE}"\1>', text)
    return text


# ─── 5. 통합 진입점 ────────────────────────────────────────


def polish_body_html(body_html: str) -> str:
    """저장 직전 body HTML 을 폴리셔 — id 42 스타일 재현.

    순서:
      1. entity 이중 인코딩 복구
      2. 연속 <p>|...|</p> → <table> 병합
      3. 기존 <table> 스타일 강화 (스타일 없는 것만)
      4. 태그별 인라인 스타일 삽입
      5. Pretendard 폰트 wrapper 감쌈
    """
    if not body_html:
        return body_html
    try:
        # 이미 wrapper 감싸진 경우 skip (재폴리셔 idempotent)
        if 'class="wecircle-body"' in body_html and 'font-family' in body_html[:500]:
            return body_html
        polished = _decode_double_entities(body_html)
        polished = _consolidate_md_table_paragraphs(polished)
        polished = _style_existing_tables(polished)
        polished = _inject_inline_styles(polished)
        return _WRAPPER_OPEN + polished + _WRAPPER_CLOSE
    except Exception as e:  # noqa: BLE001
        logger.warning("polish_body_html 예외: %s", e)
        return body_html


__all__ = ["polish_body_html"]
