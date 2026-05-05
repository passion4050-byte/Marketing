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

  /* ─ Sidebar — 완전 숨김 (메타정보는 상단 헤더로 이동) ─ */
  section[data-testid="stSidebar"] {{ display: none !important; }}
  button[data-testid="stSidebarCollapseButton"],
  button[kind="header"][data-testid="baseButton-header"] {{ display: none !important; }}

  /* 메인 컨테이너 좌우 여백 확보 — 사이드바 제거에 따른 조정 */
  section.main > div.block-container {{
    padding-top: 1.5rem !important;
    padding-left: 3rem !important;
    padding-right: 3rem !important;
    max-width: 1400px !important;
  }}

  /* ─ Top App Header — Premium SaaS look (Phase 6.5) ─
     좌: 그라데이션 마크 + ECG-pulse 아이콘 + 워드마크 + tagline
     우: LIVE pulse dot + 오늘 날짜 pill
     상단 2px 그라데이션 액센트 라인 + 미세 그림자. */
  .gsd-app-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    background: linear-gradient(135deg, {Colors.WHITE} 0%, #f5f8ff 100%);
    border: 1px solid rgba(91, 143, 249, 0.16);
    border-radius: 14px;
    margin-bottom: 22px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(91, 143, 249, 0.05),
                0 1px 0 rgba(255, 255, 255, 0.6) inset;
  }}
  .gsd-app-header::before {{
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg,
      {Colors.PRIMARY} 0%,
      {Colors.PURPLE} 45%,
      {Colors.PRIMARY} 90%,
      transparent 100%);
    background-size: 200% 100%;
    animation: gsd-accent-flow 8s linear infinite;
  }}
  @keyframes gsd-accent-flow {{
    0% {{ background-position: 0% 50%; }}
    100% {{ background-position: 200% 50%; }}
  }}
  .gsd-brand {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .gsd-brand-mark {{
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, {Colors.PRIMARY} 0%, {Colors.PURPLE} 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 6px 14px rgba(91, 143, 249, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      inset 0 -1px 0 rgba(0, 0, 0, 0.06);
    transition: transform 0.18s cubic-bezier(.2,.8,.2,1),
                box-shadow 0.18s ease;
  }}
  .gsd-brand-mark svg {{
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.18));
  }}
  .gsd-app-header:hover .gsd-brand-mark {{
    transform: translateY(-1px) scale(1.04);
    box-shadow:
      0 8px 20px rgba(91, 143, 249, 0.44),
      inset 0 1px 0 rgba(255, 255, 255, 0.32);
  }}
  .gsd-brand-name {{
    font-size: 23px;
    font-weight: 800;
    letter-spacing: -0.045em;
    color: {Colors.GRAY_900};
    line-height: 1;
    background: linear-gradient(180deg, {Colors.GRAY_900} 0%, #2a2d3a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }}
  .gsd-brand-tag {{
    font-size: 10.5px;
    color: {Colors.GRAY_400};
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-top: 6px;
    font-weight: 600;
  }}
  .gsd-header-status {{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px 8px 12px;
    background: rgba(91, 143, 249, 0.06);
    border: 1px solid rgba(91, 143, 249, 0.14);
    border-radius: 999px;
  }}
  .gsd-live-dot {{
    width: 7px;
    height: 7px;
    background: {Colors.SUCCESS};
    border-radius: 50%;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(30, 122, 61, 0.18);
  }}
  .gsd-live-dot::after {{
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: rgba(30, 122, 61, 0.32);
    animation: gsd-live-pulse 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }}
  @keyframes gsd-live-pulse {{
    0%   {{ transform: scale(1);   opacity: 0.7; }}
    100% {{ transform: scale(2.3); opacity: 0; }}
  }}
  .gsd-live-text {{
    font-size: 10.5px;
    font-weight: 800;
    color: {Colors.SUCCESS};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }}
  .gsd-status-divider {{
    width: 1px;
    height: 12px;
    background: rgba(91, 143, 249, 0.22);
  }}
  .gsd-status-date {{
    font-size: 11px;
    font-weight: 600;
    color: {Colors.GRAY_500};
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
  }}
  .gsd-meta-strip {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .gsd-meta-item {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }}
  .gsd-meta-label {{
    font-size: 11px;
    color: {Colors.GRAY_400};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 600;
  }}
  .gsd-meta-value {{
    font-size: 12px;
    color: {Colors.GRAY_700};
    font-weight: 600;
  }}
  .gsd-meta-divider {{
    width: 1px;
    height: 16px;
    background: {Colors.GRAY_200};
  }}
  .gsd-inline-note {{
    background: {Colors.INFO_LIGHT};
    color: {Colors.INFO};
    padding: 8px 14px;
    border-radius: {Radius.SM};
    font-size: 12px;
    margin-bottom: 14px;
    border: 1px solid rgba(29, 80, 168, 0.12);
  }}
  .gsd-inline-note code {{
    background: rgba(255,255,255,0.6);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
  }}

  /* ─ Page title block ─ */
  .gsd-page-title {{
    margin: 4px 0 22px 0;
  }}
  .gsd-page-title h1 {{
    font-size: 28px !important;
    font-weight: 800 !important;
    letter-spacing: -0.03em !important;
    color: {Colors.GRAY_900} !important;
    margin: 0 !important;
    line-height: 1.2 !important;
  }}
  .gsd-page-title p {{
    font-size: 13px;
    color: {Colors.GRAY_500};
    margin: 6px 0 0 0;
    line-height: 1.5;
  }}

  /* ─ Tabs — 큰 클릭 영역, 명확한 active ─ */
  div[data-baseweb="tab-list"] {{
    gap: 2px;
    border-bottom: 1px solid {Colors.GRAY_200};
    margin-bottom: 18px;
  }}
  button[data-baseweb="tab"] {{
    border-radius: {Radius.SM} {Radius.SM} 0 0 !important;
    padding: 12px 20px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    color: {Colors.GRAY_500} !important;
    border: none !important;
    background: transparent !important;
    transition: color 0.12s ease, background 0.12s ease !important;
  }}
  button[data-baseweb="tab"]:hover {{
    color: {Colors.GRAY_900} !important;
    background: {Colors.GRAY_100} !important;
  }}
  button[data-baseweb="tab"][aria-selected="true"] {{
    background: {Colors.PRIMARY_LIGHT} !important;
    color: {Colors.PRIMARY_DARK} !important;
  }}
  /* active 탭 하단 인디케이터 두껍게 */
  div[data-baseweb="tab-highlight"] {{
    background-color: {Colors.PRIMARY} !important;
    height: 3px !important;
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
    color: {Colors.WHITE} !important;
  }}
  div[data-testid="stButton"] > button[kind="primary"]:hover {{
    background: {Colors.PRIMARY_DARK};
    border-color: {Colors.PRIMARY_DARK};
  }}
  /* 선택된 (disabled primary) 버튼 — 텍스트 흰색 유지, opacity 살짝만 낮춤 */
  div[data-testid="stButton"] > button[kind="primary"]:disabled,
  div[data-testid="stButton"] > button[kind="primary"][disabled] {{
    background: {Colors.PRIMARY} !important;
    border-color: {Colors.PRIMARY} !important;
    color: {Colors.WHITE} !important;
    opacity: 0.92 !important;
    cursor: default !important;
  }}
  div[data-testid="stButton"] > button[kind="primary"]:disabled *,
  div[data-testid="stButton"] > button[kind="primary"][disabled] * {{
    color: {Colors.WHITE} !important;
  }}

  /* ─ Inputs — 가벼운 hairline + 포커스 시 브랜드 ring ─ */
  div[data-baseweb="input"],
  div[data-baseweb="textarea"],
  div[data-baseweb="select"] > div {{
    border-radius: {Radius.SM} !important;
    border: 1px solid rgba(16, 24, 40, 0.10) !important;
    background: {Colors.WHITE} !important;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }}
  div[data-baseweb="input"]:hover,
  div[data-baseweb="textarea"]:hover,
  div[data-baseweb="select"] > div:hover {{
    border-color: rgba(91, 143, 249, 0.45) !important;
  }}
  div[data-baseweb="input"]:focus-within,
  div[data-baseweb="textarea"]:focus-within,
  div[data-baseweb="select"]:focus-within > div {{
    border-color: {Colors.PRIMARY} !important;
    box-shadow: 0 0 0 3px rgba(91, 143, 249, 0.14) !important;
  }}
  /* 내부 input/textarea 자체의 보더는 제거 (이중 보더 방지) */
  div[data-baseweb="input"] input,
  div[data-baseweb="textarea"] textarea {{
    border: none !important;
    border-radius: {Radius.SM} !important;
    background: transparent !important;
  }}

  /* ─ Containers (st.container(border=True)) — 1px hairline ─ */
  /* Streamlit 신/구 selector 모두 커버 */
  div[data-testid="stVerticalBlockBorderWrapper"],
  div[data-testid="stContainer"] > div[style*="border"],
  div[data-testid="stContainer"] > div[class*="block-container"] {{
    border-radius: {Radius.MD} !important;
    border: 1px solid rgba(16, 24, 40, 0.08) !important;
    background: {Colors.WHITE} !important;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
  }}

  /* ─ Expander — hairline + 부드러운 헤더 톤 ─ */
  div[data-testid="stExpander"] {{
    border-radius: {Radius.MD} !important;
    border: 1px solid rgba(16, 24, 40, 0.08) !important;
    background: {Colors.WHITE} !important;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.02);
  }}
  div[data-testid="stExpander"] details summary {{
    background: rgba(91, 143, 249, 0.03) !important;
    transition: background 0.15s ease;
  }}
  div[data-testid="stExpander"] details summary:hover {{
    background: rgba(91, 143, 249, 0.06) !important;
  }}
  div[data-testid="stExpander"] details[open] summary {{
    border-bottom: 1px solid rgba(16, 24, 40, 0.06) !important;
  }}

  /* ─ File uploader — dashed hairline ─ */
  div[data-testid="stFileUploader"] section,
  div[data-testid="stFileUploaderDropzone"] {{
    border: 1px dashed rgba(91, 143, 249, 0.36) !important;
    border-radius: {Radius.MD} !important;
    background: rgba(91, 143, 249, 0.02) !important;
    transition: border-color 0.18s ease, background 0.18s ease;
  }}
  div[data-testid="stFileUploader"] section:hover,
  div[data-testid="stFileUploaderDropzone"]:hover {{
    border-color: {Colors.PRIMARY} !important;
    background: rgba(91, 143, 249, 0.05) !important;
  }}

  /* ─ Number input / slider 컨테이너도 동일 처리 ─ */
  div[data-testid="stNumberInput"] > div > div {{
    border-radius: {Radius.SM} !important;
  }}

  /* ─ Radio / Checkbox 그룹 컨테이너 ─ */
  div[data-testid="stRadio"] > div,
  div[data-testid="stCheckbox"] > label {{
    border-radius: {Radius.SM};
  }}

  /* ─ Metrics — hairline + tabular nums + 호버 lift ─ */
  div[data-testid="stMetric"] {{
    background: {Colors.WHITE};
    padding: 14px 18px;
    border-radius: {Radius.MD};
    border: 1px solid rgba(16, 24, 40, 0.08);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }}
  div[data-testid="stMetric"]:hover {{
    transform: translateY(-1px);
    box-shadow: 0 8px 22px -10px rgba(91, 143, 249, 0.22);
  }}
  div[data-testid="stMetric"] label {{
    color: {Colors.GRAY_500} !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }}
  div[data-testid="stMetric"] div[data-testid="stMetricValue"] {{
    font-size: 24px !important;
    font-weight: 800 !important;
    color: {Colors.GRAY_900} !important;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }}

  /* ─ Status chips (공용) ─ */
  .gsd-chip {{
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-right: 6px;
    vertical-align: middle;
    line-height: 1.6;
    border: 1px solid transparent;
  }}
  .gsd-chip-green {{ background: {Colors.SUCCESS_LIGHT}; color: {Colors.SUCCESS}; border-color: rgba(30,122,61,0.18); }}
  .gsd-chip-yellow {{ background: {Colors.WARNING_LIGHT}; color: {Colors.WARNING}; border-color: rgba(163,97,0,0.18); }}
  .gsd-chip-red {{ background: {Colors.ERROR_LIGHT}; color: {Colors.ERROR}; border-color: rgba(160,37,32,0.18); }}
  .gsd-chip-blue {{ background: {Colors.INFO_LIGHT}; color: {Colors.INFO}; border-color: rgba(29,80,168,0.18); }}
  .gsd-chip-gray {{ background: {Colors.GRAY_100}; color: {Colors.GRAY_500}; border-color: rgba(16,24,40,0.08); }}
  .gsd-chip-purple {{ background: {Colors.PURPLE_LIGHT}; color: {Colors.PURPLE}; border-color: rgba(124,92,255,0.18); }}

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

  /* ─ Equal-height columns for 3-up cards (Phase 6.5 UX) ─
     Streamlit 의 ``st.markdown('<div class="gsd-equal-row">')`` 는 wrapper 가 안 되고
     빈 div 로 그려지므로, **다음 형제 (sibling)** 인 stHorizontalBlock 을 타겟팅한다.
     (Adjacent sibling combinator ``+``) */
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
  /* 최종 폴백 — markdown wrapper 가 아예 sibling 도 안 잡히는 빌드 환경 대비.
     `gsd-equal-row` 가 들어있는 페이지의 첫 horizontal block 컨테이너를 정렬한다.
     (data-gsd-equal 속성 hook — profile.py 가 직접 부여) */
  div[data-gsd-equal="1"] {{ align-items: stretch !important; }}
  div[data-gsd-equal="1"] > div[data-testid="column"] {{
    display: flex !important; flex-direction: column !important;
  }}
  div[data-gsd-equal="1"] > div[data-testid="column"]
    div[data-testid="stVerticalBlockBorderWrapper"] {{
    flex: 1 !important; min-height: 600px !important;
    display: flex !important; flex-direction: column !important;
  }}

  /* ─ Sub-tab indicator (네스티드 st.tabs) — primary 보다 옅게 ─ */
  div[data-baseweb="tab-panel"] div[data-baseweb="tab-list"] {{
    border-bottom: 1px solid {Colors.GRAY_200};
    margin-bottom: 14px;
  }}
  div[data-baseweb="tab-panel"] button[data-baseweb="tab"] {{
    padding: 8px 16px !important;
    font-size: 13px !important;
  }}

  /* ─ Premium section card — 그라데이션 + 미세 그림자 (Phase 6.5) ─ */
  .gsd-section-card {{
    background: linear-gradient(180deg, {Colors.WHITE} 0%, {Colors.GRAY_50} 100%);
    border: 1px solid rgba(91, 143, 249, 0.18);
    border-radius: {Radius.LG};
    padding: 22px 24px;
    box-shadow: 0 2px 8px rgba(91, 143, 249, 0.06);
    margin-bottom: 18px;
  }}
  .gsd-section-card-title {{
    font-size: 16px;
    font-weight: 700;
    color: {Colors.GRAY_900};
    margin: 0 0 4px 0;
    letter-spacing: -0.01em;
  }}
  .gsd-section-card-desc {{
    font-size: 12px;
    color: {Colors.GRAY_500};
    margin-bottom: 14px;
    line-height: 1.5;
  }}

  /* ─ Empty-state illustration (Phase 6.5) ─ */
  .gsd-empty-state {{
    text-align: center;
    padding: 48px 24px;
    background: {Colors.WHITE};
    border: 1.5px dashed rgba(91, 143, 249, 0.26);
    border-radius: {Radius.LG};
    color: {Colors.GRAY_500};
    transition: border-color 0.2s ease, background 0.2s ease;
  }}
  .gsd-empty-state:hover {{
    border-color: rgba(91, 143, 249, 0.45);
    background: linear-gradient(180deg, {Colors.WHITE} 0%, rgba(91,143,249,0.04) 100%);
  }}
  .gsd-empty-state-icon {{
    font-size: 36px;
    margin-bottom: 12px;
  }}
  .gsd-empty-state-title {{
    font-size: 15px;
    font-weight: 700;
    color: {Colors.GRAY_700};
    margin-bottom: 6px;
  }}
  .gsd-empty-state-desc {{
    font-size: 12px;
    line-height: 1.6;
  }}

  /* ─ KPI Hero strip (Phase 9-05 UI/UX 리프레시) ─
     상단 4개 KPI 카드 — 그라데이션 + 마이크로 인터랙션. */
  .gsd-kpi-strip {{
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }}
  @media (max-width: 900px) {{
    .gsd-kpi-strip {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
  }}
  .gsd-kpi-tile {{
    position: relative;
    overflow: hidden;
    padding: 18px 20px;
    border-radius: {Radius.LG};
    border: 1px solid rgba(16, 24, 40, 0.08);
    background: linear-gradient(180deg, {Colors.WHITE} 0%, #fbfcff 100%);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }}
  .gsd-kpi-tile:hover {{
    transform: translateY(-2px);
    box-shadow: 0 14px 30px -14px rgba(91, 143, 249, 0.30);
    border-color: rgba(91, 143, 249, 0.32);
  }}
  .gsd-kpi-tile::before {{
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 2px;
    background: linear-gradient(90deg, {Colors.PRIMARY} 0%, {Colors.PURPLE} 100%);
    opacity: 0.55;
  }}
  .gsd-kpi-tile-label {{
    font-size: 11px;
    color: {Colors.GRAY_500};
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }}
  .gsd-kpi-tile-value {{
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: {Colors.GRAY_900};
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }}
  .gsd-kpi-tile-delta {{
    margin-top: 4px;
    font-size: 11.5px;
    color: {Colors.GRAY_500};
    font-weight: 600;
  }}

  /* ─ Toast / inline success banner ─ */
  .gsd-success-banner {{
    background: linear-gradient(180deg, rgba(30,122,61,0.08) 0%, rgba(30,122,61,0.04) 100%);
    border: 1px solid rgba(30, 122, 61, 0.22);
    color: {Colors.SUCCESS};
    padding: 10px 14px;
    border-radius: {Radius.SM};
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }}

  /* ─ Selectbox / multiselect 개선 ─ */
  div[data-baseweb="select"] [role="listbox"] {{
    border-radius: {Radius.SM} !important;
    box-shadow: 0 12px 28px -8px rgba(16, 24, 40, 0.18) !important;
    border: 1px solid rgba(91, 143, 249, 0.22) !important;
  }}
  div[data-baseweb="select"] li:hover {{
    background: rgba(91, 143, 249, 0.08) !important;
  }}

  /* ─ Slider 핸들 brand 컬러 ─ */
  div[data-testid="stSlider"] [role="slider"] {{
    background: {Colors.PRIMARY} !important;
    box-shadow: 0 0 0 4px rgba(91, 143, 249, 0.18) !important;
  }}

  /* ─ Toggle (st.toggle) ─ */
  div[data-testid="stToggle"] [role="switch"][aria-checked="true"] {{
    background: {Colors.PRIMARY} !important;
  }}

  /* ─ Tag-like st.code(span) — inline code ─ */
  code, kbd {{
    background: {Colors.PRIMARY_LIGHT};
    color: {Colors.PRIMARY_DARK};
    border-radius: 6px;
    padding: 1px 6px;
    font-size: 12.5px;
    font-weight: 600;
  }}

  /* ─ Sub-tab pill polish ─ */
  div[data-baseweb="tab-panel"] button[data-baseweb="tab"][aria-selected="true"] {{
    background: rgba(91, 143, 249, 0.10) !important;
    color: {Colors.PRIMARY_DARK} !important;
  }}

  /* ─ Subtle entrance animation on main containers (one-shot) ─ */
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
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 6px 0 14px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid {Colors.GRAY_200};
  }}
  .gsd-tab-heading-left h3 {{
    margin: 0 0 2px 0 !important;
    font-size: 18px !important;
    color: {Colors.GRAY_900} !important;
    letter-spacing: -0.02em !important;
  }}
  .gsd-tab-heading-left p {{
    margin: 0 !important;
    font-size: 12.5px !important;
    color: {Colors.GRAY_500} !important;
  }}
</style>
"""


def kpi_strip(items: list[tuple[str, str, str, str]]) -> str:
    """KPI strip — 상단 4개 카드를 한 번에. 각 항목: (emoji, label, value, delta).

    사용 예::

        st.markdown(
            kpi_strip([
                ("🎯", "데이터 건강 점수", "85/100", "등급 A"),
                ("📤", "총 발행 콘텐츠", "12건", ""),
                ("🔍", "예상 노출률", "72%", "데이터 피딩 기반"),
                ("🏷️", "활성 데이터", "9건", "의사 3 + 장비 4 + 이벤트 2"),
            ]),
            unsafe_allow_html=True,
        )
    """
    tiles = []
    for emoji, label, value, delta in items:
        delta_html = (
            f'<div class="gsd-kpi-tile-delta">{delta}</div>' if delta else ""
        )
        tiles.append(
            f'<div class="gsd-kpi-tile">'
            f'<div class="gsd-kpi-tile-label">{emoji} {label}</div>'
            f'<div class="gsd-kpi-tile-value">{value}</div>'
            f"{delta_html}"
            f"</div>"
        )
    return f'<div class="gsd-kpi-strip">{"".join(tiles)}</div>'


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
