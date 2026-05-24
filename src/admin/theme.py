"""Admin 사이트 디자인 시스템 — 강남언니 파트너센터 톤 매칭 (Phase 9-06).

레퍼런스: 강남언니 파트너센터 (gangnamunni.com 파트너 어드민)
- 사이드바: 흰 배경 + 좌측 hairline + 파란 active highlight
- 헤더: 흰 배경 + 핫핑크-레드 워드마크 로고 + 우측 사용자 칩
- 본문: 회색 surface + 흰 카드 + 12px radius + 1px hairline
- Primary 인터랙션: 강한 파랑 (active 탭/체크박스/링크)
- Brand mark: 핫핑크-레드 (로고/강조 포인트)
- 차트 accent: 민트/틸 (보조 라인)
"""

from __future__ import annotations


# ─── 강남언니 파트너센터 토큰 ─────────────────────────────────────


class GnColors:
    # Brand mark (강남언니 워드마크/포인트)
    BRAND = "#1B68FF"
    BRAND_DARK = "#E63E51"
    BRAND_LIGHT = "#DCE9FF"

    # Primary interaction (active 탭/체크박스/CTA)
    PRIMARY = "#4F5DF8"
    PRIMARY_DARK = "#3A48E0"
    PRIMARY_LIGHT = "#EEF0FF"

    # Chart accent (보조 라인)
    MINT = "#15CBA8"
    MINT_LIGHT = "#E1F8F2"

    # Neutral (강남언니 회색 계조)
    INK = "#1F2937"
    INK_MUTED = "#4B5563"
    INK_SUBTLE = "#6B7280"
    INK_DIM = "#9CA3AF"

    LINE = "#E5E7EB"
    LINE_STRONG = "#D1D5DB"

    SURFACE = "#FFFFFF"
    SURFACE_ALT = "#F9FAFB"
    SURFACE_HOVER = "#F3F4F6"

    # Status
    SUCCESS = "#10B981"
    SUCCESS_LIGHT = "#D1FAE5"
    WARNING = "#F59E0B"
    WARNING_LIGHT = "#FEF3C7"
    ERROR = "#EF4444"
    ERROR_LIGHT = "#FEE2E2"
    INFO = "#3B82F6"
    INFO_LIGHT = "#DBEAFE"


# Backwards-compat exports — older code paths may import Colors/Radius from this module.
class Colors:
    """Compatibility shim — same identifiers as src.dashboard.theme.Colors."""

    PRIMARY = GnColors.PRIMARY
    PRIMARY_DARK = GnColors.PRIMARY_DARK
    PRIMARY_LIGHT = GnColors.PRIMARY_LIGHT
    SUCCESS = GnColors.SUCCESS
    SUCCESS_LIGHT = GnColors.SUCCESS_LIGHT
    WARNING = GnColors.WARNING
    WARNING_LIGHT = GnColors.WARNING_LIGHT
    ERROR = GnColors.ERROR
    ERROR_LIGHT = GnColors.ERROR_LIGHT
    INFO = GnColors.INFO
    INFO_LIGHT = GnColors.INFO_LIGHT
    GRAY_900 = GnColors.INK
    GRAY_700 = GnColors.INK_MUTED
    GRAY_500 = GnColors.INK_SUBTLE
    GRAY_400 = GnColors.INK_DIM
    GRAY_300 = GnColors.LINE_STRONG
    GRAY_200 = GnColors.LINE
    GRAY_100 = GnColors.SURFACE_HOVER
    GRAY_50 = GnColors.SURFACE_ALT
    WHITE = GnColors.SURFACE
    PURPLE = GnColors.PRIMARY
    PURPLE_LIGHT = GnColors.PRIMARY_LIGHT


class Radius:
    SM = "8px"
    MD = "12px"
    LG = "16px"


ADMIN_ACCENT = GnColors.PRIMARY
ADMIN_ACCENT_DARK = GnColors.PRIMARY_DARK


ADMIN_CSS = f"""
<style>
  /* ─ Foundations ─ */
  .stApp {{
    background: {GnColors.SURFACE_ALT};
    font-feature-settings: "tnum" on;
  }}
  h1, h2, h3, h4 {{ letter-spacing: -0.02em; color: {GnColors.INK}; }}

  /* ─ Hide Streamlit chrome ─ */
  div[data-testid="stToolbar"] {{ display: none; }}
  #MainMenu {{ visibility: hidden; }}
  footer {{ visibility: hidden; }}

  /* ─ Sidebar — 강남언니 파트너센터 화이트 톤 ─ */
  section[data-testid="stSidebar"] {{
    background: {GnColors.SURFACE} !important;
    border-right: 1px solid {GnColors.LINE} !important;
    box-shadow: 1px 0 2px rgba(16, 24, 40, 0.02);
  }}
  section[data-testid="stSidebar"] * {{ color: {GnColors.INK_MUTED}; }}
  section[data-testid="stSidebar"] h1,
  section[data-testid="stSidebar"] h2,
  section[data-testid="stSidebar"] h3,
  section[data-testid="stSidebar"] h4,
  section[data-testid="stSidebar"] strong {{
    color: {GnColors.INK} !important;
  }}
  section[data-testid="stSidebar"] hr {{
    border-color: {GnColors.LINE} !important;
    margin: 12px 0 !important;
  }}
  section[data-testid="stSidebar"] [data-testid="stCaptionContainer"] {{
    color: {GnColors.INK_DIM} !important;
  }}
  section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] code {{
    background: {GnColors.SURFACE_HOVER} !important;
    color: {GnColors.PRIMARY_DARK} !important;
    border-radius: 6px;
    font-weight: 600;
  }}
  /* Sidebar 버튼 — 흰 배경 + 옅은 파란 보더 */
  section[data-testid="stSidebar"] div[data-testid="stButton"] > button {{
    background: {GnColors.SURFACE} !important;
    border: 1px solid {GnColors.LINE} !important;
    color: {GnColors.INK_MUTED} !important;
    font-weight: 600;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }}
  section[data-testid="stSidebar"] div[data-testid="stButton"] > button:hover {{
    background: {GnColors.PRIMARY_LIGHT} !important;
    border-color: {GnColors.PRIMARY} !important;
    color: {GnColors.PRIMARY_DARK} !important;
  }}

  /* 메인 컨테이너 */
  section.main > div.block-container {{
    padding-top: 1.4rem !important;
    padding-left: 2.4rem !important;
    padding-right: 2.4rem !important;
    max-width: 1480px !important;
  }}

  /* ─ Top header — 강남언니 파트너센터 매칭 ─
     흰 배경 + breadcrumb 스타일 + 우측 사용자 칩 */
  .admin-app-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    background: {GnColors.SURFACE};
    border: 1px solid {GnColors.LINE};
    border-radius: 14px;
    margin-bottom: 18px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
  }}
  .admin-brand {{ display: flex; align-items: center; gap: 12px; }}
  .admin-brand-mark {{
    width: 38px; height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, {GnColors.BRAND} 0%, #5290FF 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: -0.02em;
    box-shadow: 0 4px 10px rgba(27, 104, 255, 0.28);
  }}
  .admin-brand-name {{
    font-size: 18px;
    font-weight: 800;
    color: {GnColors.INK};
    line-height: 1;
    letter-spacing: -0.025em;
  }}
  .admin-brand-name .brand-accent {{
    color: {GnColors.BRAND};
  }}
  .admin-brand-tag {{
    font-size: 11px;
    font-weight: 700;
    color: {GnColors.INK_SUBTLE};
    letter-spacing: 0.02em;
    margin-top: 4px;
  }}
  .admin-status {{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 7px 14px 7px 12px;
    background: {GnColors.SURFACE_ALT};
    border: 1px solid {GnColors.LINE};
    border-radius: 999px;
    color: {GnColors.INK_MUTED};
  }}
  .admin-status .dot {{
    width: 7px; height: 7px;
    border-radius: 50%;
    background: {GnColors.SUCCESS};
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  }}
  .admin-status .text {{
    font-size: 11px;
    font-weight: 800;
    color: {GnColors.SUCCESS};
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }}
  .admin-status .divider {{
    width: 1px; height: 12px;
    background: {GnColors.LINE_STRONG};
  }}
  .admin-status .meta {{
    font-size: 12px;
    font-weight: 600;
    color: {GnColors.INK_MUTED};
    font-variant-numeric: tabular-nums;
  }}

  /* ─ Sidebar mini card ─ */
  .admin-side-card {{
    background: {GnColors.SURFACE_ALT};
    border: 1px solid {GnColors.LINE};
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }}
  .admin-side-card:hover {{
    background: {GnColors.PRIMARY_LIGHT};
    border-color: {GnColors.PRIMARY};
  }}
  .admin-side-card .label {{
    font-size: 10.5px;
    color: {GnColors.INK_DIM} !important;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 4px;
  }}
  .admin-side-card .value {{
    font-size: 16px;
    color: {GnColors.INK} !important;
    font-weight: 800;
    word-break: break-all;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }}

  /* ─ Top tabs — 강남언니 active blue underline ─ */
  div[data-baseweb="tab-list"] {{
    gap: 0px;
    border-bottom: 1px solid {GnColors.LINE};
    margin-bottom: 18px;
    background: transparent !important;
  }}
  button[data-baseweb="tab"] {{
    border-radius: 0 !important;
    padding: 14px 22px !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    color: {GnColors.INK_SUBTLE} !important;
    background: transparent !important;
    transition: color 0.15s ease !important;
    border: none !important;
    margin-right: 4px !important;
  }}
  button[data-baseweb="tab"]:hover {{
    color: {GnColors.INK} !important;
    background: transparent !important;
  }}
  button[data-baseweb="tab"][aria-selected="true"] {{
    color: {GnColors.PRIMARY} !important;
    background: transparent !important;
  }}
  div[data-baseweb="tab-highlight"] {{
    background-color: {GnColors.PRIMARY} !important;
    height: 2.5px !important;
    border-radius: 2px;
  }}

  /* ─ Buttons — primary 파란 ─ */
  div[data-testid="stButton"] > button[kind="primary"] {{
    background: {GnColors.PRIMARY};
    border: 1px solid {GnColors.PRIMARY};
    color: {GnColors.SURFACE} !important;
    font-weight: 700;
    border-radius: {Radius.SM};
    box-shadow: 0 1px 2px rgba(79, 93, 248, 0.12);
  }}
  div[data-testid="stButton"] > button[kind="primary"]:hover {{
    background: {GnColors.PRIMARY_DARK};
    border-color: {GnColors.PRIMARY_DARK};
  }}
  div[data-testid="stButton"] > button[kind="primary"]:disabled,
  div[data-testid="stButton"] > button[kind="primary"][disabled] {{
    background: {GnColors.PRIMARY} !important;
    border-color: {GnColors.PRIMARY} !important;
    color: {GnColors.SURFACE} !important;
    opacity: 0.45 !important;
    cursor: default !important;
  }}
  div[data-testid="stButton"] > button[kind="secondary"],
  div[data-testid="stButton"] > button:not([kind="primary"]) {{
    background: {GnColors.SURFACE};
    border: 1px solid {GnColors.LINE};
    color: {GnColors.INK_MUTED};
    border-radius: {Radius.SM};
    font-weight: 600;
    transition: all 0.15s ease;
  }}
  div[data-testid="stButton"] > button:not([kind="primary"]):hover {{
    border-color: {GnColors.PRIMARY};
    color: {GnColors.PRIMARY};
    background: {GnColors.PRIMARY_LIGHT};
  }}

  /* ─ Inputs — hairline + 파란 focus ring ─ */
  div[data-baseweb="input"],
  div[data-baseweb="textarea"],
  div[data-baseweb="select"] > div {{
    border-radius: {Radius.SM} !important;
    border: 1px solid {GnColors.LINE} !important;
    background: {GnColors.SURFACE} !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }}
  div[data-baseweb="input"]:hover,
  div[data-baseweb="textarea"]:hover,
  div[data-baseweb="select"] > div:hover {{
    border-color: {GnColors.LINE_STRONG} !important;
  }}
  div[data-baseweb="input"]:focus-within,
  div[data-baseweb="textarea"]:focus-within,
  div[data-baseweb="select"]:focus-within > div {{
    border-color: {GnColors.PRIMARY} !important;
    box-shadow: 0 0 0 3px rgba(79, 93, 248, 0.16) !important;
  }}
  div[data-baseweb="input"] input,
  div[data-baseweb="textarea"] textarea {{
    border: none !important;
    background: transparent !important;
    color: {GnColors.INK} !important;
  }}

  /* ─ Containers / Expander ─ */
  div[data-testid="stVerticalBlockBorderWrapper"],
  div[data-testid="stExpander"] {{
    border-radius: {Radius.MD} !important;
    border: 1px solid {GnColors.LINE} !important;
    background: {GnColors.SURFACE} !important;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
  }}
  div[data-testid="stExpander"] details summary {{
    background: {GnColors.SURFACE_ALT} !important;
    transition: background 0.15s ease;
    font-weight: 600;
  }}
  div[data-testid="stExpander"] details summary:hover {{
    background: {GnColors.PRIMARY_LIGHT} !important;
  }}
  div[data-testid="stExpander"] details[open] summary {{
    border-bottom: 1px solid {GnColors.LINE} !important;
  }}

  /* ─ Metric cards — tabular nums + hover lift ─ */
  div[data-testid="stMetric"] {{
    background: {GnColors.SURFACE};
    padding: 16px 20px;
    border-radius: {Radius.MD};
    border: 1px solid {GnColors.LINE};
    transition: border-color 0.15s ease, transform 0.15s ease;
  }}
  div[data-testid="stMetric"]:hover {{
    border-color: {GnColors.PRIMARY};
    transform: translateY(-1px);
  }}
  div[data-testid="stMetric"] label {{
    color: {GnColors.INK_SUBTLE} !important;
    font-size: 12px !important;
    font-weight: 700 !important;
  }}
  div[data-testid="stMetric"] div[data-testid="stMetricValue"] {{
    font-size: 26px !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
    color: {GnColors.INK} !important;
    font-variant-numeric: tabular-nums;
  }}

  /* ─ DataFrame ─ */
  div[data-testid="stDataFrame"] {{
    border-radius: {Radius.MD};
    border: 1px solid {GnColors.LINE};
    overflow: hidden;
  }}

  /* ─ Status chips — 강남언니 파트너센터 톤 ─ */
  .admin-chip {{
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-right: 6px;
    line-height: 1.6;
    border: 1px solid transparent;
  }}
  .admin-chip-purple {{
    background: {GnColors.PRIMARY_LIGHT};
    color: {GnColors.PRIMARY_DARK};
    border-color: rgba(79, 93, 248, 0.22);
  }}
  .admin-chip-blue {{
    background: {GnColors.PRIMARY_LIGHT};
    color: {GnColors.PRIMARY_DARK};
    border-color: rgba(79, 93, 248, 0.22);
  }}
  .admin-chip-pink {{
    background: {GnColors.BRAND_LIGHT};
    color: {GnColors.BRAND_DARK};
    border-color: rgba(27, 104, 255, 0.22);
  }}
  .admin-chip-mint {{
    background: {GnColors.MINT_LIGHT};
    color: #0F8C72;
    border-color: rgba(21, 203, 168, 0.26);
  }}
  .admin-chip-green {{
    background: {GnColors.SUCCESS_LIGHT};
    color: #047857;
    border-color: rgba(16, 185, 129, 0.22);
  }}
  .admin-chip-amber {{
    background: {GnColors.WARNING_LIGHT};
    color: #B45309;
    border-color: rgba(245, 158, 11, 0.22);
  }}
  .admin-chip-red {{
    background: {GnColors.ERROR_LIGHT};
    color: #B91C1C;
    border-color: rgba(239, 68, 68, 0.22);
  }}
  .admin-chip-gray {{
    background: {GnColors.SURFACE_HOVER};
    color: {GnColors.INK_SUBTLE};
    border-color: {GnColors.LINE};
  }}

  /* ─ Section heading inside tab ─ */
  .admin-tab-heading {{
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    margin: 4px 0 18px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid {GnColors.LINE};
  }}
  .admin-tab-heading-left h3 {{
    margin: 0 0 4px 0 !important;
    font-size: 22px !important;
    color: {GnColors.INK} !important;
    letter-spacing: -0.025em !important;
    font-weight: 800 !important;
  }}
  .admin-tab-heading-left p {{
    margin: 0 !important;
    font-size: 13px !important;
    color: {GnColors.INK_SUBTLE} !important;
  }}

  /* ─ KPI strip — 강남언니 파트너센터 4-card 스타일 ─ */
  .admin-kpi-strip {{
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }}
  @media (max-width: 1100px) {{
    .admin-kpi-strip {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  }}
  .admin-kpi-tile {{
    position: relative;
    overflow: hidden;
    padding: 18px 20px;
    border-radius: {Radius.MD};
    border: 1px solid {GnColors.LINE};
    background: {GnColors.SURFACE};
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }}
  .admin-kpi-tile:hover {{
    transform: translateY(-1px);
    box-shadow: 0 8px 22px -10px rgba(79, 93, 248, 0.20);
    border-color: {GnColors.PRIMARY};
  }}
  .admin-kpi-tile-label {{
    font-size: 12px;
    color: {GnColors.INK_SUBTLE};
    font-weight: 700;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .admin-kpi-tile-value {{
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: {GnColors.INK};
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }}
  .admin-kpi-tile-delta {{
    margin-top: 6px;
    font-size: 12px;
    color: {GnColors.INK_SUBTLE};
    font-weight: 600;
  }}
  /* 첫 번째 KPI tile 만 핑크 강조 (강남언니 파트너센터의 포인트 카드 톤) */
  .admin-kpi-tile.is-accent {{
    background: linear-gradient(180deg, {GnColors.SURFACE} 0%, #EEF4FF 100%);
    border-color: rgba(27, 104, 255, 0.20);
  }}
  .admin-kpi-tile.is-accent::before {{
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(90deg, {GnColors.BRAND} 0%, {GnColors.PRIMARY} 100%);
    opacity: 0.85;
  }}
  .admin-kpi-tile.is-accent .admin-kpi-tile-value {{
    color: {GnColors.INK};
  }}

  /* ─ Subtle entrance animation ─ */
  @keyframes admin-fade-up {{
    0%   {{ opacity: 0; transform: translateY(6px); }}
    100% {{ opacity: 1; transform: translateY(0); }}
  }}
  section.main > div.block-container {{
    animation: admin-fade-up 0.32s cubic-bezier(.2,.8,.2,1) both;
  }}

  /* ─ Inline code ─ */
  code, kbd {{
    background: {GnColors.PRIMARY_LIGHT};
    color: {GnColors.PRIMARY_DARK};
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid rgba(79, 93, 248, 0.16);
  }}

  /* ─ Slider 핸들 ─ */
  div[data-testid="stSlider"] [role="slider"] {{
    background: {GnColors.PRIMARY} !important;
    box-shadow: 0 0 0 4px rgba(79, 93, 248, 0.18) !important;
  }}

  /* ─ Toggle ─ */
  div[data-testid="stToggle"] [role="switch"][aria-checked="true"] {{
    background: {GnColors.PRIMARY} !important;
  }}

  /* ─ Checkbox ─ */
  div[data-testid="stCheckbox"] [data-checked="true"] {{
    background: {GnColors.PRIMARY} !important;
    border-color: {GnColors.PRIMARY} !important;
  }}

  /* ─ Progress bar ─ */
  div[data-testid="stProgress"] > div > div {{
    background: linear-gradient(90deg, {GnColors.PRIMARY} 0%, {GnColors.BRAND} 100%) !important;
  }}

  /* ─ Caption / note ─ */
  div[data-testid="stCaptionContainer"] {{
    color: {GnColors.INK_DIM};
  }}

  /* ─ Empty state ─ */
  .gsd-empty-state {{
    text-align: center;
    padding: 48px 24px;
    background: {GnColors.SURFACE};
    border: 1.5px dashed {GnColors.LINE_STRONG};
    border-radius: {Radius.MD};
    color: {GnColors.INK_SUBTLE};
    transition: border-color 0.18s ease, background 0.18s ease;
  }}
  .gsd-empty-state:hover {{
    border-color: {GnColors.PRIMARY};
    background: {GnColors.PRIMARY_LIGHT};
  }}
  .gsd-empty-state-icon {{ font-size: 36px; margin-bottom: 12px; }}
  .gsd-empty-state-title {{
    font-size: 15px; font-weight: 700;
    color: {GnColors.INK_MUTED}; margin-bottom: 6px;
  }}
  .gsd-empty-state-desc {{ font-size: 12px; line-height: 1.6; }}

  /* ─ Divider ─ */
  hr {{
    border: none;
    border-top: 1px solid {GnColors.LINE};
    margin: 22px 0;
  }}

  /* ─ Dataframe / table polish ─ */
  div[data-testid="stDataFrame"] [role="row"]:hover {{
    background: {GnColors.PRIMARY_LIGHT} !important;
  }}

  /* ─ Filter row chip — 날짜 범위/셀렉트가 한 행에 들어가는 회색 카드 ─ */
  .admin-filter-row {{
    background: {GnColors.SURFACE_ALT};
    border: 1px solid {GnColors.LINE};
    border-radius: {Radius.MD};
    padding: 14px 18px;
    margin-bottom: 18px;
  }}

  /* ─ Two-column card (경로별 차감 + 경로별 건수 같은 패턴) ─ */
  .admin-card {{
    background: {GnColors.SURFACE};
    border: 1px solid {GnColors.LINE};
    border-radius: {Radius.MD};
    padding: 18px 20px;
    transition: border-color 0.15s ease;
  }}
  .admin-card:hover {{
    border-color: {GnColors.LINE_STRONG};
  }}
  .admin-card-title {{
    font-size: 14px;
    font-weight: 700;
    color: {GnColors.INK};
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
</style>
"""


def admin_kpi_strip(items: list[tuple[str, str, str, str]]) -> str:
    """KPI strip — 강남언니 파트너센터 톤. 첫 항목은 핑크 강조 카드.

    items=[(emoji, label, value, delta), ...]
    """
    tiles = []
    for i, (emoji, label, value, delta) in enumerate(items):
        accent_cls = " is-accent" if i == 0 else ""
        delta_html = (
            f'<div class="admin-kpi-tile-delta">{delta}</div>' if delta else ""
        )
        tiles.append(
            f'<div class="admin-kpi-tile{accent_cls}">'
            f'<div class="admin-kpi-tile-label">{emoji} {label}</div>'
            f'<div class="admin-kpi-tile-value">{value}</div>'
            f"{delta_html}"
            f"</div>"
        )
    return f'<div class="admin-kpi-strip">{"".join(tiles)}</div>'


def admin_chip(label: str, variant: str = "blue") -> str:
    """admin-chip-{variant}. variant ∈ blue|pink|mint|green|amber|red|gray|purple."""
    return f'<span class="admin-chip admin-chip-{variant}">{label}</span>'


def render_admin_header(*, db_label: str) -> str:
    """상단 헤더 — 강남언니 파트너센터 매칭.

    좌: 핑크 라운드 사각형 마크 + "메디맵" + "ADMIN" 부제.
    우: CONNECTED chip + DB 라벨 + 오늘 날짜.
    """
    from datetime import datetime

    today = datetime.now().strftime("%Y. %m. %d")
    return f"""
    <div class="admin-app-header">
      <div class="admin-brand">
        <div class="admin-brand-mark" aria-hidden="true">M</div>
        <div>
          <div class="admin-brand-name">메디맵 <span class="brand-accent">파트너센터</span></div>
          <div class="admin-brand-tag">ADMIN · MULTI-TENANT</div>
        </div>
      </div>
      <div class="admin-status">
        <span class="dot"></span>
        <span class="text">CONNECTED</span>
        <span class="divider"></span>
        <span class="meta">{db_label}</span>
        <span class="divider"></span>
        <span class="meta">{today}</span>
      </div>
    </div>
    """


def render_side_card(label: str, value: str) -> str:
    return (
        f'<div class="admin-side-card">'
        f'<div class="label">{label}</div>'
        f'<div class="value">{value}</div>'
        f"</div>"
    )
