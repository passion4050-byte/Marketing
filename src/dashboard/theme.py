"""중앙화된 디자인 시스템 — 강남언니 톤 매칭 (Phase 9-06).

레퍼런스: 강남언니 모바일 앱 + 파트너센터 로그인.
- Brand mark: 핫핑크-레드 ``#1B68FF`` 워드마크
- Action accent: 오렌지-레드 ``#1AD2A4`` (검색/CTA)
- Surface: 흰색 + 옅은 그레이
- Card: hairline 1px + 충분한 패딩 + 약한 그림자
- Tab active: 핑크 underline + 굵은 텍스트 (배경색 사용 안 함)
- 한국어 헤딩 매우 굵직 (font-weight 800+)

모든 탭 모듈에서 import해 일관성 유지.
"""

from __future__ import annotations


# ─── 색상 팔레트 (강남언니 톤) ───────────────────────────────────


class Colors:
    # Primary (강남언니 핫핑크-레드 시그니처)
    PRIMARY = "#1B68FF"
    PRIMARY_DARK = "#E63E51"
    PRIMARY_LIGHT = "#EEF4FF"

    # Action accent (검색바/CTA — 오렌지-레드)
    ACCENT = "#1AD2A4"
    ACCENT_DARK = "#E55A28"
    ACCENT_LIGHT = "#E8FBF6"

    # Status
    SUCCESS = "#10B981"
    SUCCESS_LIGHT = "#D1FAE5"
    WARNING = "#F59E0B"
    WARNING_LIGHT = "#FEF3C7"
    ERROR = "#EF4444"
    ERROR_LIGHT = "#FEE2E2"
    INFO = "#3B82F6"
    INFO_LIGHT = "#DBEAFE"

    # Neutral (강남언니 회색 계조)
    GRAY_900 = "#1F2937"
    GRAY_700 = "#4B5563"
    GRAY_500 = "#6B7280"
    GRAY_400 = "#9CA3AF"
    GRAY_300 = "#D1D5DB"
    GRAY_200 = "#E5E7EB"
    GRAY_100 = "#F3F4F6"
    GRAY_50 = "#F9FAFB"
    WHITE = "#FFFFFF"

    # Dark hero card (배너 톤)
    HERO_DARK = "#1F2937"

    # Accent (보조)
    PURPLE = "#7C5CFF"          # 호환용 — 일부 모듈이 참조
    PURPLE_LIGHT = "#F0E7FB"
    GREEN = "#10B981"
    GREEN_LIGHT = "#D1FAE5"
    AMBER = "#F59E0B"
    AMBER_LIGHT = "#FEF3C7"

    # Engine 브랜드 색
    ENGINE_OPENAI = "#10A37F"
    ENGINE_ANTHROPIC = "#D97757"
    ENGINE_GEMINI = "#4285F4"
    ENGINE_PERPLEXITY = "#20808D"


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
    LG = "16px"


# ─── 전역 CSS (모든 페이지 공통) ──────────────────────────────


GLOBAL_CSS = f"""
<style>
  /* ─ Foundations ─ */
  .stApp {{
    background: {Colors.GRAY_50};
    font-feature-settings: "tnum" on;
  }}
  h1, h2, h3, h4 {{ letter-spacing: -0.025em; color: {Colors.GRAY_900}; }}

  /* ─ Hide Streamlit chrome ─ */
  div[data-testid="stToolbar"] {{ display: none; }}
  #MainMenu {{ visibility: hidden; }}
  footer {{ visibility: hidden; }}

  /* ─ Sidebar 완전 숨김 (메타정보는 상단 헤더로) ─ */
  section[data-testid="stSidebar"] {{ display: none !important; }}
  button[data-testid="stSidebarCollapseButton"],
  button[kind="header"][data-testid="baseButton-header"] {{ display: none !important; }}

  /* 메인 컨테이너 */
  section.main > div.block-container {{
    padding-top: 1.5rem !important;
    padding-left: 3rem !important;
    padding-right: 3rem !important;
    max-width: 1400px !important;
  }}

  /* ─ Top App Header — 강남언니 톤 (흰 배경 + 핑크 마크) ─ */
  .gsd-app-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    background: {Colors.WHITE};
    border: 1px solid {Colors.GRAY_200};
    border-radius: 14px;
    margin-bottom: 22px;
    box-shadow: 0 1px 2px rgba(31, 41, 55, 0.03);
  }}
  .gsd-brand {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .gsd-brand-mark {{
    width: 40px; height: 40px;
    border-radius: 11px;
    background: linear-gradient(135deg, {Colors.PRIMARY} 0%, {Colors.ACCENT} 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: -0.02em;
    box-shadow:
      0 4px 10px rgba(27, 104, 255, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.32);
    transition: transform 0.18s cubic-bezier(.2,.8,.2,1),
                box-shadow 0.18s ease;
  }}
  .gsd-app-header:hover .gsd-brand-mark {{
    transform: translateY(-1px) scale(1.04);
    box-shadow: 0 6px 14px rgba(27, 104, 255, 0.40);
  }}
  .gsd-brand-mark svg {{
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.18));
  }}
  .gsd-brand-name {{
    font-size: 19px;
    font-weight: 800;
    letter-spacing: -0.030em;
    color: {Colors.GRAY_900};
    line-height: 1;
  }}
  .gsd-brand-name .brand-accent {{
    color: {Colors.PRIMARY};
  }}
  .gsd-brand-tag {{
    font-size: 10.5px;
    color: {Colors.GRAY_500};
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-top: 5px;
    font-weight: 700;
  }}
  .gsd-header-status {{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 7px 14px 7px 12px;
    background: {Colors.GRAY_50};
    border: 1px solid {Colors.GRAY_200};
    border-radius: 999px;
  }}
  .gsd-live-dot {{
    width: 7px; height: 7px;
    background: {Colors.SUCCESS};
    border-radius: 50%;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
  }}
  .gsd-live-dot::after {{
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.32);
    animation: gsd-live-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }}
  @keyframes gsd-live-pulse {{
    0%   {{ transform: scale(1);   opacity: 0.7; }}
    100% {{ transform: scale(2.3); opacity: 0; }}
  }}
  .gsd-live-text {{
    font-size: 11px;
    font-weight: 800;
    color: {Colors.SUCCESS};
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }}
  .gsd-status-divider {{
    width: 1px;
    height: 12px;
    background: {Colors.GRAY_300};
  }}
  .gsd-status-date {{
    font-size: 12px;
    font-weight: 600;
    color: {Colors.GRAY_500};
    font-variant-numeric: tabular-nums;
  }}

  .gsd-meta-strip {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .gsd-meta-item {{ display: inline-flex; align-items: center; gap: 6px; }}
  .gsd-meta-label {{
    font-size: 11px;
    color: {Colors.GRAY_400};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 700;
  }}
  .gsd-meta-value {{
    font-size: 12px;
    color: {Colors.GRAY_700};
    font-weight: 600;
  }}
  .gsd-meta-divider {{ width: 1px; height: 16px; background: {Colors.GRAY_200}; }}

  .gsd-inline-note {{
    background: {Colors.PRIMARY_LIGHT};
    color: {Colors.PRIMARY_DARK};
    padding: 10px 14px;
    border-radius: {Radius.SM};
    font-size: 12.5px;
    margin-bottom: 14px;
    border: 1px solid rgba(27, 104, 255, 0.18);
    font-weight: 600;
  }}
  .gsd-inline-note code {{
    background: rgba(255,255,255,0.6);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11.5px;
  }}

  /* ─ Page title block ─ */
  .gsd-page-title {{ margin: 4px 0 22px 0; }}
  .gsd-page-title h1 {{
    font-size: 30px !important;
    font-weight: 800 !important;
    letter-spacing: -0.030em !important;
    color: {Colors.GRAY_900} !important;
    margin: 0 !important;
    line-height: 1.15 !important;
  }}
  .gsd-page-title p {{
    font-size: 14px;
    color: {Colors.GRAY_500};
    margin: 8px 0 0 0;
    line-height: 1.55;
  }}

  /* ─ Tabs — 강남언니 underline 스타일 ─ */
  div[data-baseweb="tab-list"] {{
    gap: 0px;
    border-bottom: 1px solid {Colors.GRAY_200};
    margin-bottom: 18px;
    background: transparent !important;
  }}
  button[data-baseweb="tab"] {{
    border-radius: 0 !important;
    padding: 14px 22px !important;
    font-weight: 700 !important;
    font-size: 14px !important;
    color: {Colors.GRAY_500} !important;
    background: transparent !important;
    border: none !important;
    margin-right: 4px !important;
    transition: color 0.15s ease !important;
  }}
  button[data-baseweb="tab"]:hover {{
    color: {Colors.GRAY_900} !important;
    background: transparent !important;
  }}
  button[data-baseweb="tab"][aria-selected="true"] {{
    color: {Colors.PRIMARY} !important;
    background: transparent !important;
  }}
  div[data-baseweb="tab-highlight"] {{
    background-color: {Colors.PRIMARY} !important;
    height: 2.5px !important;
    border-radius: 2px;
  }}

  /* ─ Buttons — primary 핑크 (stButton + stFormSubmitButton 통합) ─ */
  div[data-testid="stButton"] > button[kind="primary"],
  div[data-testid="stFormSubmitButton"] > button[kind="primary"],
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"] {{
    background: {Colors.PRIMARY};
    border: 1px solid {Colors.PRIMARY};
    color: {Colors.WHITE} !important;
    font-weight: 700;
    border-radius: {Radius.SM};
    box-shadow: 0 1px 2px rgba(27, 104, 255, 0.18);
    transition: all 0.15s ease;
  }}
  div[data-testid="stButton"] > button[kind="primary"]:hover,
  div[data-testid="stFormSubmitButton"] > button[kind="primary"]:hover,
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"]:hover {{
    background: {Colors.PRIMARY_DARK};
    border-color: {Colors.PRIMARY_DARK};
    transform: translateY(-1px);
  }}
  div[data-testid="stButton"] > button[kind="primary"]:disabled,
  div[data-testid="stButton"] > button[kind="primary"][disabled],
  div[data-testid="stFormSubmitButton"] > button[kind="primary"]:disabled,
  div[data-testid="stFormSubmitButton"] > button[kind="primary"][disabled],
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"]:disabled,
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"][disabled] {{
    background: {Colors.PRIMARY} !important;
    border-color: {Colors.PRIMARY} !important;
    color: {Colors.WHITE} !important;
    opacity: 0.45 !important;
    cursor: default !important;
  }}
  div[data-testid="stButton"] > button[kind="primary"]:disabled *,
  div[data-testid="stButton"] > button[kind="primary"][disabled] *,
  div[data-testid="stFormSubmitButton"] > button[kind="primary"]:disabled *,
  div[data-testid="stFormSubmitButton"] > button[kind="primary"][disabled] *,
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"]:disabled *,
  div[data-testid="stFormSubmitButton"] > button[kind="primaryFormSubmit"][disabled] * {{
    color: {Colors.WHITE} !important;
  }}
  div[data-testid="stButton"] > button:not([kind="primary"]),
  div[data-testid="stFormSubmitButton"] > button:not([kind="primary"]):not([kind="primaryFormSubmit"]) {{
    background: {Colors.WHITE};
    border: 1px solid {Colors.GRAY_200};
    color: {Colors.GRAY_700};
    border-radius: {Radius.SM};
    font-weight: 600;
    transition: all 0.15s ease;
  }}
  div[data-testid="stButton"] > button:not([kind="primary"]):hover,
  div[data-testid="stFormSubmitButton"] > button:not([kind="primary"]):not([kind="primaryFormSubmit"]):hover {{
    border-color: {Colors.PRIMARY};
    color: {Colors.PRIMARY};
    background: {Colors.PRIMARY_LIGHT};
    transform: translateY(-1px);
  }}

  /* ─ Inputs — 1px hairline + 핑크 focus ring ─ */
  div[data-baseweb="input"],
  div[data-baseweb="textarea"],
  div[data-baseweb="select"] > div {{
    border-radius: {Radius.SM} !important;
    border: 1px solid {Colors.GRAY_200} !important;
    background: {Colors.WHITE} !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }}
  div[data-baseweb="input"]:hover,
  div[data-baseweb="textarea"]:hover,
  div[data-baseweb="select"] > div:hover {{
    border-color: {Colors.GRAY_300} !important;
  }}
  div[data-baseweb="input"]:focus-within,
  div[data-baseweb="textarea"]:focus-within,
  div[data-baseweb="select"]:focus-within > div {{
    border-color: {Colors.PRIMARY} !important;
    box-shadow: 0 0 0 3px rgba(27, 104, 255, 0.14) !important;
  }}
  div[data-baseweb="input"] input,
  div[data-baseweb="textarea"] textarea {{
    border: none !important;
    border-radius: {Radius.SM} !important;
    background: transparent !important;
    color: {Colors.GRAY_900} !important;
  }}

  /* ─ Containers ─ */
  div[data-testid="stVerticalBlockBorderWrapper"],
  div[data-testid="stContainer"] > div[style*="border"],
  div[data-testid="stContainer"] > div[class*="block-container"] {{
    border-radius: {Radius.MD} !important;
    border: 1px solid {Colors.GRAY_200} !important;
    background: {Colors.WHITE} !important;
    box-shadow: 0 1px 2px rgba(31, 41, 55, 0.03);
  }}

  /* ─ Expander ─ */
  div[data-testid="stExpander"] {{
    border-radius: {Radius.MD} !important;
    border: 1px solid {Colors.GRAY_200} !important;
    background: {Colors.WHITE} !important;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(31, 41, 55, 0.02);
  }}
  div[data-testid="stExpander"] details summary {{
    background: {Colors.GRAY_50} !important;
    transition: background 0.15s ease;
    font-weight: 600;
  }}
  div[data-testid="stExpander"] details summary:hover {{
    background: {Colors.PRIMARY_LIGHT} !important;
  }}
  div[data-testid="stExpander"] details[open] summary {{
    border-bottom: 1px solid {Colors.GRAY_200} !important;
  }}

  /* ─ File uploader ─ */
  div[data-testid="stFileUploader"] section,
  div[data-testid="stFileUploaderDropzone"] {{
    border: 1px dashed {Colors.GRAY_300} !important;
    border-radius: {Radius.MD} !important;
    background: {Colors.GRAY_50} !important;
    transition: border-color 0.18s ease, background 0.18s ease;
  }}
  div[data-testid="stFileUploader"] section:hover,
  div[data-testid="stFileUploaderDropzone"]:hover {{
    border-color: {Colors.PRIMARY} !important;
    background: {Colors.PRIMARY_LIGHT} !important;
  }}

  /* ─ Number/Slider/Toggle 컨테이너 ─ */
  div[data-testid="stNumberInput"] > div > div {{ border-radius: {Radius.SM} !important; }}
  div[data-testid="stRadio"] > div,
  div[data-testid="stCheckbox"] > label {{ border-radius: {Radius.SM}; }}
  div[data-testid="stSlider"] [role="slider"] {{
    background: {Colors.PRIMARY} !important;
    box-shadow: 0 0 0 4px rgba(27, 104, 255, 0.18) !important;
  }}
  div[data-testid="stToggle"] [role="switch"][aria-checked="true"] {{
    background: {Colors.PRIMARY} !important;
  }}
  div[data-testid="stCheckbox"] [data-checked="true"] {{
    background: {Colors.PRIMARY} !important;
    border-color: {Colors.PRIMARY} !important;
  }}

  /* ─ Metrics ─ */
  div[data-testid="stMetric"] {{
    background: {Colors.WHITE};
    padding: 16px 20px;
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
    transition: transform 0.15s ease, border-color 0.15s ease;
  }}
  div[data-testid="stMetric"]:hover {{
    transform: translateY(-1px);
    border-color: {Colors.PRIMARY};
  }}
  div[data-testid="stMetric"] label {{
    color: {Colors.GRAY_500} !important;
    font-size: 12px !important;
    font-weight: 700 !important;
  }}
  div[data-testid="stMetric"] div[data-testid="stMetricValue"] {{
    font-size: 26px !important;
    font-weight: 800 !important;
    color: {Colors.GRAY_900} !important;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }}

  /* ─ Status chips ─ */
  .gsd-chip {{
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-right: 6px;
    vertical-align: middle;
    line-height: 1.6;
    border: 1px solid transparent;
  }}
  .gsd-chip-pink {{
    background: {Colors.PRIMARY_LIGHT};
    color: {Colors.PRIMARY_DARK};
    border-color: rgba(27, 104, 255, 0.22);
  }}
  .gsd-chip-orange {{
    background: {Colors.ACCENT_LIGHT};
    color: {Colors.ACCENT_DARK};
    border-color: rgba(26, 210, 164, 0.22);
  }}
  .gsd-chip-green {{
    background: {Colors.SUCCESS_LIGHT};
    color: #047857;
    border-color: rgba(16, 185, 129, 0.20);
  }}
  .gsd-chip-yellow {{
    background: {Colors.WARNING_LIGHT};
    color: #B45309;
    border-color: rgba(245, 158, 11, 0.20);
  }}
  .gsd-chip-red {{
    background: {Colors.ERROR_LIGHT};
    color: #B91C1C;
    border-color: rgba(239, 68, 68, 0.20);
  }}
  .gsd-chip-blue {{
    background: {Colors.INFO_LIGHT};
    color: #1D4ED8;
    border-color: rgba(59, 130, 246, 0.20);
  }}
  .gsd-chip-gray {{
    background: {Colors.GRAY_100};
    color: {Colors.GRAY_500};
    border-color: {Colors.GRAY_200};
  }}
  .gsd-chip-purple {{
    background: {Colors.PRIMARY_LIGHT};
    color: {Colors.PRIMARY_DARK};
    border-color: rgba(27, 104, 255, 0.22);
  }}

  /* ─ Section title ─ */
  .gsd-section-title {{
    font-size: 13px;
    font-weight: 800;
    color: {Colors.GRAY_500};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 8px 0 6px 0;
  }}

  /* ─ KPI Card ─ */
  .gsd-kpi-card {{
    padding: 18px 20px;
    border-radius: {Radius.LG};
    border: 1px solid {Colors.GRAY_200};
    background: {Colors.WHITE};
  }}
  .gsd-kpi-label {{
    font-size: 13px;
    color: {Colors.GRAY_500};
    margin-bottom: 6px;
    font-weight: 600;
  }}
  .gsd-kpi-value {{
    font-size: 28px;
    font-weight: 800;
    color: {Colors.GRAY_900};
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }}
  .gsd-kpi-delta {{
    font-size: 12px;
    margin-top: 4px;
    color: {Colors.SUCCESS};
    font-weight: 600;
  }}

  /* ─ Progress bar ─ */
  div[data-testid="stProgress"] > div > div {{
    background: linear-gradient(90deg, {Colors.PRIMARY} 0%, {Colors.ACCENT} 100%) !important;
  }}

  /* ─ Code block ─ */
  pre {{ border-radius: {Radius.MD} !important; }}
  code, kbd {{
    background: {Colors.PRIMARY_LIGHT};
    color: {Colors.PRIMARY_DARK};
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid rgba(27, 104, 255, 0.16);
  }}

  /* ─ Caption ─ */
  div[data-testid="stCaptionContainer"] {{
    color: {Colors.GRAY_500};
  }}

  /* ─ Divider ─ */
  hr {{
    border: none;
    border-top: 1px solid {Colors.GRAY_200};
    margin: 22px 0;
  }}

  /* ─ Expander summary ─ */
  details summary {{
    border-radius: {Radius.SM} !important;
    padding: 10px 14px !important;
  }}

  /* ─ DataFrame ─ */
  div[data-testid="stDataFrame"] {{
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
    overflow: hidden;
  }}
  div[data-testid="stDataFrame"] [role="row"]:hover {{
    background: {Colors.PRIMARY_LIGHT} !important;
  }}

  /* ─ Bar/Line chart wrapper ─ */
  div[data-testid="stPlotlyChart"], div[data-testid="stArrowVegaLiteChart"], div.stVegaLiteChart {{
    border-radius: {Radius.MD};
    background: {Colors.WHITE};
    padding: 8px;
  }}

  /* ─ Equal-height columns for 3-up cards ─ */
  .gsd-equal-row + div[data-testid="stHorizontalBlock"] {{
    align-items: stretch !important;
  }}
  .gsd-equal-row + div[data-testid="stHorizontalBlock"]
    > div[data-testid="column"] {{
    display: flex !important;
    flex-direction: column !important;
  }}
  .gsd-equal-row + div[data-testid="stHorizontalBlock"]
    > div[data-testid="column"]
    > div[data-testid="stVerticalBlock"] {{
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
  }}
  .gsd-equal-row + div[data-testid="stHorizontalBlock"]
    > div[data-testid="column"]
    div[data-testid="stVerticalBlockBorderWrapper"] {{
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 600px !important;
  }}
  div[data-gsd-equal="1"] {{ align-items: stretch !important; }}
  div[data-gsd-equal="1"] > div[data-testid="column"] {{
    display: flex !important; flex-direction: column !important;
  }}
  div[data-gsd-equal="1"] > div[data-testid="column"]
    div[data-testid="stVerticalBlockBorderWrapper"] {{
    flex: 1 !important; min-height: 600px !important;
    display: flex !important; flex-direction: column !important;
  }}

  /* ─ Sub-tab ─ */
  div[data-baseweb="tab-panel"] div[data-baseweb="tab-list"] {{
    border-bottom: 1px solid {Colors.GRAY_200};
    margin-bottom: 14px;
  }}
  div[data-baseweb="tab-panel"] button[data-baseweb="tab"] {{
    padding: 10px 18px !important;
    font-size: 13px !important;
  }}
  div[data-baseweb="tab-panel"] button[data-baseweb="tab"][aria-selected="true"] {{
    color: {Colors.PRIMARY} !important;
    background: transparent !important;
  }}

  /* ─ Premium section card ─ */
  .gsd-section-card {{
    background: {Colors.WHITE};
    border: 1px solid {Colors.GRAY_200};
    border-radius: {Radius.LG};
    padding: 22px 24px;
    box-shadow: 0 1px 2px rgba(31, 41, 55, 0.03);
    margin-bottom: 18px;
  }}
  .gsd-section-card-title {{
    font-size: 16px;
    font-weight: 800;
    color: {Colors.GRAY_900};
    margin: 0 0 4px 0;
    letter-spacing: -0.02em;
  }}
  .gsd-section-card-desc {{
    font-size: 12px;
    color: {Colors.GRAY_500};
    margin-bottom: 14px;
    line-height: 1.55;
  }}

  /* ─ Empty state ─ */
  .gsd-empty-state {{
    text-align: center;
    padding: 48px 24px;
    background: {Colors.WHITE};
    border: 1.5px dashed {Colors.GRAY_300};
    border-radius: {Radius.LG};
    color: {Colors.GRAY_500};
    transition: border-color 0.18s ease, background 0.18s ease;
  }}
  .gsd-empty-state:hover {{
    border-color: {Colors.PRIMARY};
    background: {Colors.PRIMARY_LIGHT};
  }}
  .gsd-empty-state-icon {{ font-size: 36px; margin-bottom: 12px; }}
  .gsd-empty-state-title {{
    font-size: 15px;
    font-weight: 700;
    color: {Colors.GRAY_700};
    margin-bottom: 6px;
  }}
  .gsd-empty-state-desc {{ font-size: 12px; line-height: 1.6; }}

  /* ─ KPI strip ─ */
  .gsd-kpi-strip {{
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }}
  @media (max-width: 1100px) {{
    .gsd-kpi-strip {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  }}
  .gsd-kpi-tile {{
    position: relative;
    overflow: hidden;
    padding: 18px 20px;
    border-radius: {Radius.MD};
    border: 1px solid {Colors.GRAY_200};
    background: {Colors.WHITE};
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }}
  .gsd-kpi-tile:hover {{
    transform: translateY(-1px);
    box-shadow: 0 8px 22px -10px rgba(27, 104, 255, 0.20);
    border-color: {Colors.PRIMARY};
  }}
  .gsd-kpi-tile-label {{
    font-size: 12px;
    color: {Colors.GRAY_500};
    font-weight: 700;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }}
  .gsd-kpi-tile-value {{
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: {Colors.GRAY_900};
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }}
  .gsd-kpi-tile-delta {{
    margin-top: 6px;
    font-size: 12px;
    color: {Colors.GRAY_500};
    font-weight: 600;
  }}
  /* 첫 번째 KPI tile 만 핑크 강조 */
  .gsd-kpi-tile.is-accent {{
    background: linear-gradient(180deg, {Colors.WHITE} 0%, {Colors.PRIMARY_LIGHT} 100%);
    border-color: rgba(27, 104, 255, 0.20);
  }}
  .gsd-kpi-tile.is-accent::before {{
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(90deg, {Colors.PRIMARY} 0%, {Colors.ACCENT} 100%);
    opacity: 0.85;
  }}

  /* ─ Subtle entrance animation ─ */
  @keyframes gsd-fade-up {{
    0%   {{ opacity: 0; transform: translateY(6px); }}
    100% {{ opacity: 1; transform: translateY(0); }}
  }}
  section.main > div.block-container {{
    animation: gsd-fade-up 0.32s cubic-bezier(.2,.8,.2,1) both;
  }}

  /* ─ Page sub-title (탭 안 헤더용) ─ */
  .gsd-tab-heading {{
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    margin: 4px 0 18px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid {Colors.GRAY_200};
  }}
  .gsd-tab-heading-left h3 {{
    margin: 0 0 4px 0 !important;
    font-size: 22px !important;
    color: {Colors.GRAY_900} !important;
    letter-spacing: -0.025em !important;
    font-weight: 800 !important;
  }}
  .gsd-tab-heading-left p {{
    margin: 0 !important;
    font-size: 13px !important;
    color: {Colors.GRAY_500} !important;
  }}

  /* ─ Toast / inline success banner ─ */
  .gsd-success-banner {{
    background: {Colors.SUCCESS_LIGHT};
    border: 1px solid rgba(16, 185, 129, 0.22);
    color: #047857;
    padding: 10px 14px;
    border-radius: {Radius.SM};
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  /* ─ Login gate (강남언니 파트너센터 톤) ─ */
  .gsd-login-wrap {{
    max-width: 480px;
    margin: 64px auto 0 auto;
    padding: 0 24px;
  }}
  .gsd-login-brand {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 32px;
  }}
  .gsd-login-brand-mark {{
    width: 36px; height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, {Colors.PRIMARY} 0%, {Colors.ACCENT} 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 13px;
    box-shadow: 0 4px 10px rgba(27, 104, 255, 0.28);
  }}
  .gsd-login-brand-name {{
    font-size: 16px;
    font-weight: 800;
    color: {Colors.GRAY_900};
    letter-spacing: -0.02em;
  }}
  .gsd-login-brand-name .brand-accent {{ color: {Colors.PRIMARY}; }}
  .gsd-login-title {{
    text-align: center;
    margin-bottom: 6px;
  }}
  .gsd-login-title h1 {{
    font-size: 26px !important;
    font-weight: 800 !important;
    letter-spacing: -0.025em !important;
    color: {Colors.GRAY_900} !important;
    margin: 0 0 8px 0 !important;
  }}
  .gsd-login-title p {{
    font-size: 14px;
    color: {Colors.GRAY_500};
    margin: 0;
  }}

  /* ─ Active tenant badge (단일 테넌트 모드 — picker 대체) ─ */
  .gsd-active-tenant {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px 6px 10px;
    border-radius: 999px;
    background: {Colors.PRIMARY_LIGHT};
    border: 1px solid rgba(27, 104, 255, 0.20);
    color: {Colors.GRAY_900};
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }}
  .gsd-active-tenant .dot {{
    width: 8px; height: 8px; border-radius: 50%;
    background: linear-gradient(135deg, {Colors.PRIMARY} 0%, {Colors.ACCENT} 100%);
    box-shadow: 0 0 0 3px rgba(27, 104, 255, 0.12);
  }}
  .gsd-active-tenant .meta {{
    color: {Colors.GRAY_500};
    font-weight: 500;
    margin-left: 4px;
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


def kpi_strip(items: list[tuple[str, str, str, str]]) -> str:
    """KPI strip — 첫 항목 핑크 강조 카드.

    items=[(emoji, label, value, delta), ...]
    """
    tiles = []
    for i, (emoji, label, value, delta) in enumerate(items):
        accent_cls = " is-accent" if i == 0 else ""
        delta_html = (
            f'<div class="gsd-kpi-tile-delta">{delta}</div>' if delta else ""
        )
        tiles.append(
            f'<div class="gsd-kpi-tile{accent_cls}">'
            f'<div class="gsd-kpi-tile-label">{emoji} {label}</div>'
            f'<div class="gsd-kpi-tile-value">{value}</div>'
            f"{delta_html}"
            f"</div>"
        )
    return f'<div class="gsd-kpi-strip">{"".join(tiles)}</div>'
