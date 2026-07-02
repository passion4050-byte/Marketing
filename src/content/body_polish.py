"""HTML body 후처리 폴리셔 — Round 108-b (2026-07-03).

`render_body()` 결과 HTML 을 스캔해서 id 83 (gangnam-rejuran-healer-effect-protocol)
스타일로 폴리셔:

1. 연속된 `<p>| ... |</p>` 마크다운 표 잔재 → `<table>` 병합
2. HTML entity 이중 인코딩 복구 (`&amp;` → `&`, `&#x27;` → `'`, `&quot;` → `"`)
3. 헤더/문단/표/figure 에 인라인 스타일 자동 삽입
4. H3 chip 스타일 (핑크 배지) 로 강조

사용:
    from src.content.body_polish import polish_body_html
    polished = polish_body_html(raw_body_html)
"""
from __future__ import annotations

import html
import logging
import re

logger = logging.getLogger(__name__)

# ─── 인라인 스타일 (id 83 참조) ──────────────────────────────

_STYLE_H1 = (
    "font-size: 2em; font-weight: 800; color: #0f172a; "
    "margin-top: 0.5em; margin-bottom: 0.8em; line-height: 1.3;"
)
_STYLE_H2 = (
    "font-size: 1.75em; font-weight: 800; color: #0f172a; "
    "margin-top: 2.5em; margin-bottom: 1em; line-height: 1.4;"
)
_STYLE_H3_CHIP = (
    "display: inline-block; background: #FCE7F3; color: #9D174D; "
    "padding: 0.4em 0.9em; border-radius: 8px; "
    "font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;"
)
_STYLE_P = (
    "font-size: 1.05em; line-height: 1.85; color: #1e293b; "
    "margin: 1em 0;"
)
_STYLE_TABLE = "width: 100%; border-collapse: collapse; margin: 1.5em 0;"
_STYLE_TABLE_TR_HEADER = "background: #F1F5F9;"
_STYLE_TABLE_TR_ALT = "background: #F8FAFC;"
_STYLE_TABLE_TH = (
    "padding: 12px; text-align: left; border: 1px solid #E2E8F0; "
    "font-weight: 700; color: #0f172a;"
)
_STYLE_TABLE_TD = "padding: 12px; border: 1px solid #E2E8F0; color: #1e293b;"
_STYLE_FIGURE = "margin: 2.5em 0;"
_STYLE_IMG = "width: 100%; height: auto; border-radius: 12px;"
_STYLE_FIGCAPTION = (
    "text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;"
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
}


def _decode_double_entities(text: str) -> str:
    """Round 61 재발 방지: LLM 응답의 이중 인코딩 (&amp;) 복구."""
    for enc, dec in _ENTITY_MAP.items():
        # 태그 안 속성이 아닌 텍스트 노드에만 적용해야 하지만,
        # blog 본문 HTML 은 대부분 텍스트라 안전. 문제 시 tag-aware 파서 도입.
        text = text.replace(enc, dec)
    return text


# ─── 2. 연속 <p>| ... |</p> → <table> 병합 ─────────────────

_MD_ROW_P_RE = re.compile(
    r"<p[^>]*>\s*\|(.*?)\|\s*</p>",
    re.IGNORECASE | re.DOTALL,
)
_MD_SEP_ROW_RE = re.compile(r"^\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)*\s*$")


def _consolidate_md_table_paragraphs(html_text: str) -> str:
    """<p>| ... |</p> 가 여러 개 연속되면 하나의 <table> 로 병합.

    예:
        <p>| A | B |</p>
        <p>|---|---|</p>
        <p>| 1 | 2 |</p>
        <p>| 3 | 4 |</p>
    → <table>...</table>
    """
    # 모든 <p>|...|</p> 위치 수집
    matches = list(_MD_ROW_P_RE.finditer(html_text))
    if not matches:
        return html_text

    # 연속된 그룹 찾기 (2개 이상, 사이에 non-whitespace 없음)
    groups: list[list[re.Match]] = []
    current: list[re.Match] = []
    for i, m in enumerate(matches):
        if current:
            between = html_text[current[-1].end():m.start()]
            if between.strip():
                # 사이에 다른 태그 있음 → 그룹 종료
                if len(current) >= 2:
                    groups.append(current)
                current = [m]
                continue
        current.append(m)
    if len(current) >= 2:
        groups.append(current)

    if not groups:
        return html_text

    # 뒤에서부터 치환 (offset 유지)
    for group in reversed(groups):
        start = group[0].start()
        end = group[-1].end()
        # 각 행 셀 추출
        rows_cells: list[list[str]] = []
        header: list[str] | None = None
        for m in group:
            row_content = m.group(1).strip()
            # 구분행 (|---|---|) skip
            if _MD_SEP_ROW_RE.match(row_content):
                continue
            cells = [c.strip() for c in row_content.split("|")]
            # 앞뒤 빈 셀 제거
            cells = [c for c in cells if c or True]  # keep empty; 실제로는 |...|.split('|')는 정상
            # 첫 유효 행 = 헤더
            if header is None:
                header = cells
            else:
                rows_cells.append(cells)

        if not header:
            continue

        # HTML 조립
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


# ─── 3. 인라인 스타일 자동 삽입 ─────────────────────────────

_H1_RE = re.compile(r"<h1(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_H2_RE = re.compile(r"<h2(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_H3_RE = re.compile(r"<h3(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_P_RE = re.compile(r"<p(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_TABLE_RE = re.compile(r"<table(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_FIGURE_RE = re.compile(r"<figure(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_IMG_RE = re.compile(r"<img(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE)
_FIGCAPTION_RE = re.compile(
    r"<figcaption(?![^>]*\bstyle=)([^>]*)>", re.IGNORECASE
)


def _inject_inline_styles(text: str) -> str:
    """스타일 없는 태그에 기본 인라인 스타일 자동 삽입 (id 83 스타일)."""
    text = _H1_RE.sub(rf'<h1 style="{_STYLE_H1}"\1>', text)
    text = _H2_RE.sub(rf'<h2 style="{_STYLE_H2}"\1>', text)
    text = _H3_RE.sub(rf'<h3 style="{_STYLE_H3_CHIP}"\1>', text)
    text = _P_RE.sub(rf'<p style="{_STYLE_P}"\1>', text)
    text = _TABLE_RE.sub(rf'<table style="{_STYLE_TABLE}"\1>', text)
    text = _FIGURE_RE.sub(rf'<figure style="{_STYLE_FIGURE}"\1>', text)
    text = _IMG_RE.sub(rf'<img style="{_STYLE_IMG}"\1>', text)
    text = _FIGCAPTION_RE.sub(
        rf'<figcaption style="{_STYLE_FIGCAPTION}"\1>', text
    )
    return text


# ─── 4. 통합 진입점 ────────────────────────────────────────


def polish_body_html(body_html: str) -> str:
    """저장 직전 body HTML 을 폴리셔 — id 83 스타일 재현.

    순서:
      1. entity 이중 인코딩 복구
      2. 연속 <p>|...|</p> → <table> 병합
      3. 태그별 인라인 스타일 삽입
    """
    if not body_html:
        return body_html
    try:
        polished = _decode_double_entities(body_html)
        polished = _consolidate_md_table_paragraphs(polished)
        polished = _inject_inline_styles(polished)
        return polished
    except Exception as e:  # noqa: BLE001
        logger.warning("polish_body_html 예외: %s", e)
        return body_html


__all__ = ["polish_body_html"]
