"""중앙화된 디자인 시스템 — 색상/간격/타이포 토큰 + 전역 CSS.

모든 탭 모듈에서 import해 일관성 유지.
"""

from __future__ import annotations

# ─── 색상 팔레트 (Tone & Manner) ─────────────────────────────────


class Colors:
    # Primary (의료/SaaS 신뢰감)
    PRIMARY = "#5b8ff9"          # 메인 파랑
    PRIMARY_DARK = "#3a6cd8"
    PRIMARY_LIGHT = "#e7eefb"

    # Status
    SUCCESS = "#1e7a3d"          # 통과/완료/긍정
    SUCCESS_LIGHT = "#e6f6ea"
    WARNING = "#a36100"          # 검수 권장/주의
    WARNING_LIGHT = "#fff4d6"
    ERROR = "#a02520"            # 위반/실패
    ERROR_LIGHT = "#fbe5e3"
    INFO = "#1d50a8"
    INFO_LIGHT = "#e7eefb"

    # Neutral
    GRAY_900 = "#1a1a1a"
    GRAY_700 = "#444"
    GRAY_500 = "#666"
    GRAY_400 = "#888"
    GRAY_300 = "#bbb"
    GRAY_200 = "#eee"
    GRAY_100 = "#fafafa"
    GRAY_50 = "#fbfbfd"
    WHITE = "#ffffff"

    # Accent (보조)
    PURPLE = "#7c5cff"
    PURPLE_LIGHT = "#f0e7fb"
    GREEN = "#1e7a3d"
    GREEN_LIGHT = "#e6f6ea"
    AMBER = "#f5a623"
    AMBER_LIGHT = "#fff4d6"

    # Engine 브랜드 색
    ENGINE_OPENAI = "#10a37f"
    ENGINE_ANTHROPIC = "#d97757"
    ENGINE_GEMINI = "#4285f4"
    ENGINE_PERPLEXITY = "#20808d"


# ─── 간격/Border ──────────────────────────────────────────────


class Spacing:
    XS = "4px"
    SM = "8px"
    MD = "12px"
    LG = "16px"
    XL = "24px"
    XXL = "32px"


class Radius:
    SM = "8px"
    MD = "12px"
    LG = "14px"


# ─── 전역 CSS (모든 페이지 공통) ──────────────────────────────


GLOBAL_CSS = f"""
<style>
  /* ─ Foundations ─ */
  .stApp {{ background: {Colors.GRAY_50}; }}
  h1, h2, h3, h4 {{ letter-spacing: -0.02em; color: {Colors.GRAY_900}; }}

  /* ─ Top toolbar / hide deploy button (clean look) ─ */
  div[data-testid="stToolbar"] {{ display: none; }}

  /* ─ Tabs ─ */
  div[data-baseweb="tab-list"] {{ gap: 4px; }}
  button[data-baseweb="tab"] {{
    border-radius: {Radius.SM} {Radius.SM} 0 0 !important;
    padding: 10px 18px !important;
    font-weight: 600 !important;
  }}
  button[data-baseweb="tab"][aria-selected="true"] {{
    background: {Colors.PRIMARY_LIGHT} !important;
    color: {Colors.PRIMARY_DARK} !important;
  }}

  /* ─ Sidebar polish ─ */
  section[data-testid="stSidebar"] {{
    background: {Colors.WHITE};
    border-right: 1px solid {Colors.GRAY_200};
  }}

  /* ─ Buttons ─ */
  div[data-testid="stButton"] > button {{
    border-radius: {Radius.SM};
    font-weight: 600;
    transition: transform 0.05s ease;
  }}
  div[data-testid="stButton"] > button:hover {{
    transform: translateY(-1px);
  }}
  div[data-testid="stButton"] > button[kind="primary"] {{
    background: {Colors.PRIMARY};
    border-color: {Colors.PRIMARY};
  }}
  div[data-testid="stButton"] > button[kind="primary"]:hover {{
    background: {Colors.PRIMARY_DARK};
    border-color: {Colors.PRIMARY_DARK};
  }}

  /* ─ Inputs ─ */
  div[data-baseweb="input"] input,
  div[data-baseweb="textarea"] textarea,
  div[data-baseweb="select"] {{
    border-radius: {Radius.SM} !important;
  }}

  /* ─ Containers (border=True) ─ */
  div[data-testid="stContainer"] > div[style*="border: 1px solid"] {{
    border-radius: {Radius.MD} !important;
    border-color: {Colors.GRAY_200} !important;
  }}

  /* ─ Metrics ─ */
  div[data-testid="stMetric"] {{
    background: {Colors.WHITE};
    padding: 14px 18px;
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
  }}
  div[data-testid="stMetric"] label {{
    color: {Colors.GRAY_500} !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }}
  div[data-testid="stMetric"] div[data-testid="stMetricValue"] {{
    font-size: 24px !important;
    font-weight: 700 !important;
    color: {Colors.GRAY_900} !important;
  }}

  /* ─ Status chips (공용) ─ */
  .gsd-chip {{
    display: inline-block;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-right: 6px;
    vertical-align: middle;
  }}
  .gsd-chip-green {{ background: {Colors.SUCCESS_LIGHT}; color: {Colors.SUCCESS}; }}
  .gsd-chip-yellow {{ background: {Colors.WARNING_LIGHT}; color: {Colors.WARNING}; }}
  .gsd-chip-red {{ background: {Colors.ERROR_LIGHT}; color: {Colors.ERROR}; }}
  .gsd-chip-blue {{ background: {Colors.INFO_LIGHT}; color: {Colors.INFO}; }}
  .gsd-chip-gray {{ background: {Colors.GRAY_200}; color: {Colors.GRAY_500}; }}
  .gsd-chip-purple {{ background: {Colors.PURPLE_LIGHT}; color: {Colors.PURPLE}; }}

  /* ─ Section title (carded sections) ─ */
  .gsd-section-title {{
    font-size: 13px;
    font-weight: 700;
    color: {Colors.GRAY_500};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 8px 0 6px 0;
  }}

  /* ─ KPI Card ─ */
  .gsd-kpi-card {{
    padding: 18px 20px;
    border-radius: {Radius.LG};
    border: 1px solid rgba(0, 0, 0, 0.04);
    background: {Colors.WHITE};
  }}
  .gsd-kpi-label {{
    font-size: 13px;
    color: {Colors.GRAY_500};
    margin-bottom: 6px;
  }}
  .gsd-kpi-value {{
    font-size: 28px;
    font-weight: 700;
    color: {Colors.GRAY_900};
  }}
  .gsd-kpi-delta {{
    font-size: 12px;
    margin-top: 4px;
    color: {Colors.SUCCESS};
  }}

  /* ─ Progress bar polish ─ */
  div[data-testid="stProgress"] > div > div {{
    background: {Colors.PRIMARY} !important;
  }}

  /* ─ Code block (복사 버튼 강조) ─ */
  pre {{ border-radius: {Radius.MD} !important; }}

  /* ─ Caption ─ */
  div[data-testid="stCaptionContainer"] {{
    color: {Colors.GRAY_500};
  }}

  /* ─ Divider ─ */
  hr {{
    border: none;
    border-top: 1px solid {Colors.GRAY_200};
    margin: 24px 0;
  }}

  /* ─ Expander ─ */
  details summary {{
    border-radius: {Radius.SM} !important;
    padding: 8px 12px !important;
  }}

  /* ─ DataFrame ─ */
  div[data-testid="stDataFrame"] {{
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
    overflow: hidden;
  }}

  /* ─ Bar/Line chart wrapper polish ─ */
  div[data-testid="stPlotlyChart"], div[data-testid="stArrowVegaLiteChart"], div.stVegaLiteChart {{
    border-radius: {Radius.MD};
    background: {Colors.WHITE};
    padding: 8px;
  }}
</style>
"""


def chip(label: str, variant: str = "gray") -> str:
    """일관된 chip HTML 생성 헬퍼."""
    return f'<span class="gsd-chip gsd-chip-{variant}">{label}</span>'


def kpi_card(emoji: str, label: str, value: str, delta: str = "", bg: str | None = None) -> str:
    """일관된 KPI 카드 HTML."""
    bg_style = f"background:{bg};" if bg else ""
    delta_html = (
        f'<div class="gsd-kpi-delta">{delta}</div>' if delta else ""
    )
    return f"""
    <div class="gsd-kpi-card" style="{bg_style}">
      <div class="gsd-kpi-label">{emoji} {label}</div>
      <div class="gsd-kpi-value">{value}</div>
      {delta_html}
    </div>
    """


def status_chip(status: str) -> str:
    """compliance status → chip HTML."""
    if status == "pass":
        return chip("✅ 통과", "green")
    if status == "warn":
        return chip("⚠️ 검수 권장", "yellow")
    if status == "fail":
        return chip("❌ 위반", "red")
    return chip(status, "gray")
