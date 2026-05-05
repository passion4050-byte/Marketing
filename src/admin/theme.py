"""Admin 사이트 디자인 시스템 — Phase 9-05 UI/UX 리프레시.

테넌트 앱(blogkey) 의 ``src.dashboard.theme`` 와 같은 토큰을 공유하되,
어드민용 톤(살짝 더 진한 보라/슬레이트 그라데이션)을 얹어 "백오피스" 라는
정체성을 시각적으로 구분한다.
"""

from __future__ import annotations

from src.dashboard.theme import Colors, Radius


ADMIN_ACCENT = "#7c5cff"          # 어드민 메인 액센트 (보라)
ADMIN_ACCENT_DARK = "#5f3fe0"
ADMIN_INK = "#0f1424"             # 사이드바 배경 (어두운 슬레이트)
ADMIN_INK_2 = "#161b30"


ADMIN_CSS = f"""
<style>
  /* ─ Foundations ─ */
  .stApp {{ background: {Colors.GRAY_50}; }}
  h1, h2, h3, h4 {{ letter-spacing: -0.02em; color: {Colors.GRAY_900}; }}

  /* ─ Top toolbar / hide deploy button ─ */
  div[data-testid="stToolbar"] {{ display: none; }}

  /* ─ Sidebar — 어드민 전용 짙은 슬레이트 + 골드 액센트 ─ */
  section[data-testid="stSidebar"] {{
    background: linear-gradient(180deg, {ADMIN_INK} 0%, {ADMIN_INK_2} 100%) !important;
    border-right: 1px solid rgba(255,255,255,0.06) !important;
  }}
  section[data-testid="stSidebar"] * {{
    color: rgba(255,255,255,0.92) !important;
  }}
  section[data-testid="stSidebar"] hr {{
    border-color: rgba(255,255,255,0.08) !important;
  }}
  section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] code {{
    background: rgba(255,255,255,0.10) !important;
    color: #cfd5ff !important;
    border-radius: 6px;
  }}
  section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] strong {{
    color: #fff !important;
  }}
  section[data-testid="stSidebar"] [data-testid="stCaptionContainer"] {{
    color: rgba(255,255,255,0.62) !important;
  }}
  /* Sidebar 버튼 — 강조 색상 */
  section[data-testid="stSidebar"] div[data-testid="stButton"] > button {{
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,255,255,0.14) !important;
    color: #fff !important;
    font-weight: 600;
    transition: background 0.18s ease, border-color 0.18s ease;
  }}
  section[data-testid="stSidebar"] div[data-testid="stButton"] > button:hover {{
    background: rgba(255,255,255,0.15) !important;
    border-color: rgba(255,255,255,0.26) !important;
  }}

  /* 메인 컨테이너 좌우 여백 */
  section.main > div.block-container {{
    padding-top: 1.5rem !important;
    padding-left: 2.4rem !important;
    padding-right: 2.4rem !important;
    max-width: 1480px !important;
  }}

  /* ─ Admin top header — 어드민용 진한 그라데이션 ─ */
  .admin-app-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    background: linear-gradient(135deg, {ADMIN_INK} 0%, #1d2240 60%, {ADMIN_ACCENT_DARK} 100%);
    border-radius: 16px;
    margin-bottom: 22px;
    color: #fff;
    position: relative;
    overflow: hidden;
    box-shadow: 0 12px 36px -10px rgba(15, 20, 36, 0.42);
  }}
  .admin-app-header::before {{
    content: '';
    position: absolute;
    inset: -40% -10% auto auto;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(124,92,255,0.45) 0%, transparent 70%);
    pointer-events: none;
  }}
  .admin-brand {{
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }}
  .admin-brand-mark {{
    width: 46px;
    height: 46px;
    border-radius: 13px;
    background: linear-gradient(135deg, {ADMIN_ACCENT} 0%, #b29eff 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 6px 18px rgba(124, 92, 255, 0.42),
      inset 0 1px 0 rgba(255,255,255,0.32);
  }}
  .admin-brand-name {{
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    color: #fff;
  }}
  .admin-brand-tag {{
    font-size: 10.5px;
    color: rgba(255,255,255,0.62);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-top: 6px;
    font-weight: 700;
  }}
  .admin-status {{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 999px;
    color: rgba(255,255,255,0.92);
    position: relative;
    z-index: 1;
  }}
  .admin-status .dot {{
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
  }}
  .admin-status .text {{
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }}
  .admin-status .divider {{
    width: 1px; height: 12px;
    background: rgba(255,255,255,0.18);
  }}
  .admin-status .meta {{
    font-size: 11.5px;
    font-weight: 600;
    color: rgba(255,255,255,0.72);
    font-variant-numeric: tabular-nums;
  }}

  /* ─ Sidebar mini card ─ */
  .admin-side-card {{
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }}
  .admin-side-card .label {{
    font-size: 10px;
    color: rgba(255,255,255,0.56) !important;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 4px;
  }}
  .admin-side-card .value {{
    font-size: 15px;
    color: #fff !important;
    font-weight: 700;
    word-break: break-all;
  }}

  /* ─ Tabs (top-level) ─ */
  div[data-baseweb="tab-list"] {{
    gap: 4px;
    border-bottom: 1px solid {Colors.GRAY_200};
    margin-bottom: 18px;
  }}
  button[data-baseweb="tab"] {{
    border-radius: {Radius.SM} {Radius.SM} 0 0 !important;
    padding: 12px 18px !important;
    font-weight: 600 !important;
    font-size: 13.5px !important;
    color: {Colors.GRAY_500} !important;
    background: transparent !important;
    transition: color 0.15s ease, background 0.15s ease !important;
  }}
  button[data-baseweb="tab"]:hover {{
    color: {Colors.GRAY_900} !important;
    background: {Colors.GRAY_100} !important;
  }}
  button[data-baseweb="tab"][aria-selected="true"] {{
    background: rgba(124, 92, 255, 0.10) !important;
    color: {ADMIN_ACCENT_DARK} !important;
  }}
  div[data-baseweb="tab-highlight"] {{
    background-color: {ADMIN_ACCENT} !important;
    height: 3px !important;
  }}

  /* ─ Buttons (primary = 보라) ─ */
  div[data-testid="stButton"] > button[kind="primary"] {{
    background: {ADMIN_ACCENT};
    border-color: {ADMIN_ACCENT};
    color: #fff !important;
  }}
  div[data-testid="stButton"] > button[kind="primary"]:hover {{
    background: {ADMIN_ACCENT_DARK};
    border-color: {ADMIN_ACCENT_DARK};
  }}
  div[data-testid="stButton"] > button {{
    border-radius: {Radius.SM};
    font-weight: 600;
    transition: transform 0.05s ease;
  }}
  div[data-testid="stButton"] > button:hover {{
    transform: translateY(-1px);
  }}

  /* ─ Inputs ─ */
  div[data-baseweb="input"],
  div[data-baseweb="textarea"],
  div[data-baseweb="select"] > div {{
    border-radius: {Radius.SM} !important;
    border: 1.5px solid rgba(124, 92, 255, 0.30) !important;
    background: {Colors.WHITE} !important;
  }}
  div[data-baseweb="input"]:focus-within,
  div[data-baseweb="textarea"]:focus-within,
  div[data-baseweb="select"]:focus-within > div {{
    border-color: {ADMIN_ACCENT} !important;
    box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.16) !important;
  }}

  /* ─ Containers / Expander ─ */
  div[data-testid="stVerticalBlockBorderWrapper"],
  div[data-testid="stExpander"] {{
    border-radius: {Radius.MD} !important;
    border: 1.5px solid rgba(124, 92, 255, 0.20) !important;
    background: {Colors.WHITE} !important;
    box-shadow: 0 1px 3px rgba(124, 92, 255, 0.04);
  }}
  div[data-testid="stExpander"] details summary {{
    background: rgba(124, 92, 255, 0.05) !important;
  }}

  /* ─ Metric cards ─ */
  div[data-testid="stMetric"] {{
    background: linear-gradient(180deg, {Colors.WHITE} 0%, #fbfaff 100%);
    padding: 14px 18px;
    border-radius: {Radius.MD};
    border: 1px solid rgba(124, 92, 255, 0.16);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }}
  div[data-testid="stMetric"]:hover {{
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -10px rgba(124, 92, 255, 0.25);
  }}
  div[data-testid="stMetric"] label {{
    color: {Colors.GRAY_500} !important;
    font-size: 11.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }}
  div[data-testid="stMetric"] div[data-testid="stMetricValue"] {{
    font-size: 26px !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
    color: {Colors.GRAY_900} !important;
  }}

  /* ─ DataFrame ─ */
  div[data-testid="stDataFrame"] {{
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
    overflow: hidden;
  }}

  /* ─ Status chips (공유) ─ */
  .admin-chip {{
    display: inline-block;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-right: 6px;
  }}
  .admin-chip-purple {{ background: rgba(124,92,255,0.12); color: {ADMIN_ACCENT_DARK}; }}
  .admin-chip-green  {{ background: {Colors.SUCCESS_LIGHT}; color: {Colors.SUCCESS}; }}
  .admin-chip-amber  {{ background: {Colors.WARNING_LIGHT}; color: {Colors.WARNING}; }}
  .admin-chip-red    {{ background: {Colors.ERROR_LIGHT};   color: {Colors.ERROR}; }}
  .admin-chip-gray   {{ background: {Colors.GRAY_200};      color: {Colors.GRAY_500}; }}

  /* ─ Section heading inside tab ─ */
  .admin-tab-heading {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 4px 0 16px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid {Colors.GRAY_200};
  }}
  .admin-tab-heading-left h3 {{
    margin: 0 0 2px 0 !important;
    font-size: 18px !important;
    color: {Colors.GRAY_900} !important;
    letter-spacing: -0.02em !important;
  }}
  .admin-tab-heading-left p {{
    margin: 0 !important;
    font-size: 12.5px !important;
    color: {Colors.GRAY_500} !important;
  }}

  /* ─ KPI strip — 어드민 톤 (보라 + 진한 슬레이트 액센트) ─ */
  .admin-kpi-strip {{
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }}
  @media (max-width: 900px) {{
    .admin-kpi-strip {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  }}
  .admin-kpi-tile {{
    position: relative;
    overflow: hidden;
    padding: 18px 20px;
    border-radius: {Radius.LG};
    border: 1px solid rgba(124, 92, 255, 0.20);
    background: linear-gradient(180deg, {Colors.WHITE} 0%, #fbfaff 100%);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }}
  .admin-kpi-tile:hover {{
    transform: translateY(-2px);
    box-shadow: 0 14px 30px -12px rgba(124, 92, 255, 0.32);
    border-color: rgba(124, 92, 255, 0.44);
  }}
  .admin-kpi-tile::before {{
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, {ADMIN_ACCENT} 0%, #5b8ff9 100%);
    opacity: 0.7;
  }}
  .admin-kpi-tile-label {{
    font-size: 11px;
    color: {Colors.GRAY_500};
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }}
  .admin-kpi-tile-value {{
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: {Colors.GRAY_900};
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }}
  .admin-kpi-tile-delta {{
    margin-top: 4px;
    font-size: 11.5px;
    color: {Colors.GRAY_500};
    font-weight: 600;
  }}

  /* ─ Subtle entrance animation ─ */
  @keyframes admin-fade-up {{
    0%   {{ opacity: 0; transform: translateY(6px); }}
    100% {{ opacity: 1; transform: translateY(0); }}
  }}
  section.main > div.block-container {{
    animation: admin-fade-up 0.32s cubic-bezier(.2,.8,.2,1) both;
  }}

  code, kbd {{
    background: rgba(124,92,255,0.10);
    color: {ADMIN_ACCENT_DARK};
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 12.5px;
    font-weight: 600;
  }}
</style>
"""


def admin_kpi_strip(items: list[tuple[str, str, str, str]]) -> str:
    """KPI strip — 어드민 보라톤. items=[(emoji, label, value, delta), ...]."""
    tiles = []
    for emoji, label, value, delta in items:
        delta_html = (
            f'<div class="admin-kpi-tile-delta">{delta}</div>' if delta else ""
        )
        tiles.append(
            f'<div class="admin-kpi-tile">'
            f'<div class="admin-kpi-tile-label">{emoji} {label}</div>'
            f'<div class="admin-kpi-tile-value">{value}</div>'
            f"{delta_html}"
            f"</div>"
        )
    return f'<div class="admin-kpi-strip">{"".join(tiles)}</div>'


def admin_chip(label: str, variant: str = "purple") -> str:
    """admin-chip-{variant}. variant ∈ purple|green|amber|red|gray."""
    return f'<span class="admin-chip admin-chip-{variant}">{label}</span>'


def render_admin_header(*, db_label: str) -> str:
    """상단 헤더 HTML — 좌: 그라데이션 마크 + 워드마크, 우: LIVE + DB 라벨."""
    from datetime import datetime

    today = datetime.now().strftime("%Y. %m. %d")
    return f"""
    <div class="admin-app-header">
      <div class="admin-brand">
        <div class="admin-brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6 H21 M3 12 H21 M3 18 H15"
                  stroke="white" stroke-width="2.4"
                  stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="19" cy="18" r="2.4" fill="white"/>
          </svg>
        </div>
        <div>
          <div class="admin-brand-name">메디맵 어드민</div>
          <div class="admin-brand-tag">Back Office · Multi-Tenant</div>
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
