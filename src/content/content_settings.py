"""content_settings — DB key-value 정책 로더.

2026-05-28 Phase 3 — Round 22
- /admin/content-settings 페이지에서 운영자가 수정한 값을 매 발행 시 읽음.
- generator.py prompt 빌드 + image_picker.py 이미지 생성 정책에 주입.
- DB 미설정/조회 실패 시 안전한 기본값으로 fallback (자동 발행이 중단되지 않도록).

스키마:
    content_settings(setting_key VARCHAR(64) UNIQUE, setting_value TEXT)

기본값은 운영자 결정(2026-05-28)을 그대로 코드에도 박아두는 이중 안전망.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# 운영자 결정(2026-05-28)을 fallback 으로도 그대로 보관 — DB 가 비어도 정책은 동일하게 동작.
DEFAULTS: dict[str, str] = {
    "tone": "friendly_natural",
    "length_min": "3000",
    "length_max": "5000",
    "cta_target": "medimap_kakao",
    "keyword_seed_mode": "auto",
    "disclaimer_style": "amber_box_v3",
    "image_count_total": "3",
    "image_style": "pixar_3d",
    "image_realistic_only_for": "clinic_interior",
    "publish_schedule": "23:00_utc_daily",
    "content_pattern_pool": "staged_guide,comparison,case_study,faq_heavy,checklist,data_driven",
    "lead_pattern_pool": "question,stat,case,doctor_quote",
}

# tone 코드 → LLM prompt 한 줄
TONE_PROMPT: dict[str, str] = {
    "friendly_natural": "친근체로, 자연스럽게 옆에서 설명하듯 부드럽고 따뜻한 톤. 격식은 유지하되 딱딱하지 않게.",
    "formal": "격식체. 의료 전문가가 환자에게 정중하게 안내하는 톤.",
    "casual": "구어체. 친한 친구가 알려주는 듯 가벼운 톤. 단, 의학 사실은 정확하게.",
}

# image_style 코드 → Pollinations.AI prompt prefix
IMAGE_STYLE_PROMPT: dict[str, str] = {
    "pixar_3d": "Pixar Disney 3D animation style, warm cinematic lighting",
    "watercolor": "Soft watercolor illustration, gentle brush strokes, paper texture",
    "editorial": "Editorial illustration style, magazine cover quality, sophisticated",
    "flat_design": "Modern flat design illustration, clean geometric shapes",
}


@dataclass(frozen=True)
class ContentSettings:
    """매 발행 cycle 1회 로드. dict 가 아닌 값에는 attribute access."""

    tone: str
    length_min: int
    length_max: int
    cta_target: str
    keyword_seed_mode: str
    disclaimer_style: str
    image_count_total: int
    image_style: str
    image_realistic_only_for: str
    publish_schedule: str
    content_pattern_pool: list[str]
    lead_pattern_pool: list[str]

    # ── derived prompt helpers ──────────────────────────────────────────────
    def tone_prompt(self) -> str:
        return TONE_PROMPT.get(self.tone, TONE_PROMPT["friendly_natural"])

    def image_style_prompt(self) -> str:
        return IMAGE_STYLE_PROMPT.get(self.image_style, IMAGE_STYLE_PROMPT["pixar_3d"])

    def body_image_count(self) -> int:
        """본문 일러스트 개수 — cover 1장 제외."""
        return max(0, self.image_count_total - 1)


def _coerce_int(value: Optional[str], default: int) -> int:
    """음수·비숫자·None → default 폴백."""
    if value is None:
        return default
    try:
        n = int(str(value).strip())
    except (TypeError, ValueError):
        return default
    return n if n >= 0 else default


def _coerce_pool(value: Optional[str], default: str) -> list[str]:
    """빈 문자열·None·whitespace 모두 default 로 폴백 — 파이프라인 안전망."""
    raw = value if (value and value.strip()) else default
    return [s.strip() for s in (raw or "").split(",") if s.strip()]


def _build(raw: dict[str, str]) -> ContentSettings:
    g = lambda k: raw.get(k, DEFAULTS[k])  # noqa: E731
    return ContentSettings(
        tone=g("tone"),
        length_min=_coerce_int(g("length_min"), int(DEFAULTS["length_min"])),
        length_max=_coerce_int(g("length_max"), int(DEFAULTS["length_max"])),
        cta_target=g("cta_target"),
        keyword_seed_mode=g("keyword_seed_mode"),
        disclaimer_style=g("disclaimer_style"),
        image_count_total=_coerce_int(g("image_count_total"), int(DEFAULTS["image_count_total"])),
        image_style=g("image_style"),
        image_realistic_only_for=g("image_realistic_only_for"),
        publish_schedule=g("publish_schedule"),
        content_pattern_pool=_coerce_pool(g("content_pattern_pool"), DEFAULTS["content_pattern_pool"]),
        lead_pattern_pool=_coerce_pool(g("lead_pattern_pool"), DEFAULTS["lead_pattern_pool"]),
    )


def load_from_supabase_rest() -> ContentSettings:
    """SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 환경변수로 REST 직접 호출.

    DATABASE_URL/SQLAlchemy 가 미연결인 환경(예: GitHub Actions cron 컨테이너)에서도
    HTTP 만으로 안전하게 정책을 가져오기 위해 REST 경로 1개로 통합.
    실패 시 DEFAULTS 로 빌드.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        logger.warning("content_settings: SUPABASE env 미설정 → DEFAULTS 사용")
        return _build({})

    try:
        import httpx  # local import — 미설치 환경에서도 import 만으로 죽지 않게
    except ImportError:
        logger.warning("content_settings: httpx 미설치 → DEFAULTS 사용")
        return _build({})

    endpoint = f"{url}/rest/v1/content_settings"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                endpoint,
                params={"select": "setting_key,setting_value"},
                headers=headers,
            )
            if r.status_code != 200:
                logger.warning(
                    "content_settings: GET status=%s body=%s — DEFAULTS 사용",
                    r.status_code,
                    r.text[:200],
                )
                return _build({})
            rows = r.json() or []
    except Exception as e:  # noqa: BLE001
        logger.exception("content_settings: REST 호출 실패 — DEFAULTS 사용: %s", e)
        return _build({})

    raw: dict[str, str] = {}
    for row in rows:
        k = row.get("setting_key")
        v = row.get("setting_value")
        if isinstance(k, str):
            raw[k] = "" if v is None else str(v)
    logger.info("content_settings: %d keys loaded from Supabase", len(raw))
    return _build(raw)


# 모듈 캐시 — 한 cron run 안에서 다회 호출되어도 1회만 fetch
_cached: Optional[ContentSettings] = None


def get_settings(*, force_reload: bool = False) -> ContentSettings:
    """매 발행 cycle 1회 호출. 캐시된 값을 반환."""
    global _cached
    if _cached is None or force_reload:
        _cached = load_from_supabase_rest()
    return _cached


def reset_cache() -> None:
    """테스트용."""
    global _cached
    _cached = None
