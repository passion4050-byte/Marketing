"""OpenAI DALL-E 3 이미지 생성 클라이언트 — Round 83 (2026-06-28).

사용자가 OpenAI 결제 완료. 콘텐츠 cover 이미지 품질을 Pollinations(flux) →
DALL-E 3 로 업그레이드. Pollinations 가 사람 얼굴/손/텍스트를 자주 망가뜨리던
함정 CR 의 근본 해결.

환경:
    OPENAI_API_KEY              필수
    OPENAI_IMAGE_MODEL          dall-e-3 (기본) | gpt-image-1
    OPENAI_IMAGE_SIZE           1792x1024 (16:9 ≈) | 1024x1024 | 1024x1792
    OPENAI_IMAGE_QUALITY        standard ($0.04/장) | hd ($0.08/장)
    SUPABASE_URL                Storage 업로드용
    SUPABASE_SERVICE_ROLE_KEY

비용 (dall-e-3 standard 1792x1024): $0.08/장.
A상품 84글 × cover 1 + 본문 2 = 252장 × $0.08 = $20/월.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "dall-e-3"
_DEFAULT_SIZE = "1792x1024"  # DALL-E 3 16:9 사이즈 (블로그 cover 비율)
_DEFAULT_QUALITY = "standard"


def is_dalle_enabled() -> bool:
    """OPENAI_API_KEY 가 있고 IMAGE_PROVIDER 가 dalle 이거나 미설정이면 활성.

    Round 86 (2026-06-28) — 진단 로그 강화. is_dalle_enabled() 가 False 인 정확한 이유 로깅.
    """
    if not (os.getenv("OPENAI_API_KEY") or "").strip():
        logger.warning("dalle.disabled: OPENAI_API_KEY 미설정 또는 빈 값")
        return False
    provider_raw = os.getenv("IMAGE_PROVIDER", "dalle")
    provider = (provider_raw or "dalle").strip().lower()
    if provider not in ("dalle", "openai", "auto"):
        logger.warning("dalle.disabled: IMAGE_PROVIDER='%s' (dalle|openai|auto 가 아님)", provider_raw)
        return False
    logger.info("dalle.enabled: provider='%s'", provider)
    return True


def _build_dalle_korean_prompt(keyword: str, title: str | None = None, *, is_self_tenant: bool = False) -> str:
    """Round 86 — DALL-E 3 전용 한국 모델 사람 포함 프롬프트.

    Pollinations(flux)는 사람 얼굴 망가뜨려서 'no people' 사용 (Round 81 CR).
    DALL-E 3 는 사람 잘 그림 → 한국인 모델 명시.
    사용자 요구: "퀄리티 높은 감도 높은 한국 모델, 외국인 느낌 지양".
    """
    from src.content.image_picker import keyword_to_english_context

    en_ctx = keyword_to_english_context(keyword)
    title_hint = f", concept: {title}" if title else ""

    if is_self_tenant:
        # 자사 인사이트 — 다큐멘터리/에디토리얼 톤
        return (
            f"Editorial photography for a Korean medical magazine. "
            f"Korean (ethnically East Asian) medical professional and Korean patient "
            f"in a modern Seoul medical clinic, theme: {en_ctx}{title_hint}. "
            f"All subjects are clearly Korean (not Western, not Caucasian). "
            f"Authentic Korean facial features. Natural Korean skin tones. "
            f"Modern bright clinic interior, soft natural daylight, warm and trustworthy mood. "
            f"Professional DSLR photography, shallow depth of field, sharp focus, "
            f"realistic photo (not illustration, not anime). "
            f"8k uhd, magazine editorial quality. "
            f"No text, no logo, no watermark, no overlay."
        )
    # 파트너 클리닉 — 더 부드러운 톤
    return (
        f"Professional photograph of a Korean (ethnically East Asian) medical doctor "
        f"consulting with a Korean patient, theme: {en_ctx}{title_hint}. "
        f"Both subjects clearly Korean (East Asian features, NOT Western/Caucasian). "
        f"Modern bright Korean medical clinic interior in Seoul. "
        f"Warm natural lighting, friendly and trustworthy atmosphere. "
        f"Photorealistic (not illustration), professional camera quality, "
        f"shallow depth of field, sharp detail. "
        f"No text, no logo, no watermark."
    )


def generate_dalle_image(
    keyword: str,
    title: Optional[str] = None,
    *,
    is_self_tenant: bool = False,
) -> Optional[dict]:
    """DALL-E 3 cover 생성 → Supabase Storage 업로드 → public URL.

    Returns:
        {url, alt, prompt, generated_at, source} | None (실패 시 None — 호출측에서 fallback)
    """
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None

    model = os.getenv("OPENAI_IMAGE_MODEL", _DEFAULT_MODEL)
    size = os.getenv("OPENAI_IMAGE_SIZE", _DEFAULT_SIZE)
    quality = os.getenv("OPENAI_IMAGE_QUALITY", _DEFAULT_QUALITY)

    # Round 86 (2026-06-28) — 한국 모델 사람 포함 전용 프롬프트.
    # 이전: image_picker.build_prompt 사용 → 'no people, empty room' (Round 81 Pollinations 정책)
    # → DALL-E 가 사람 없는 빈 클리닉만 생성. 사용자 요구 = "퀄리티 높은 한국 모델, 외국인 지양".
    prompt = _build_dalle_korean_prompt(keyword, title, is_self_tenant=is_self_tenant)
    logger.info("dalle.prompt_built: %s", prompt[:120])

    try:
        from openai import OpenAI
    except ImportError as e:
        logger.warning("openai 패키지 미설치 — DALL-E skip: %s", e)
        return None

    try:
        client = OpenAI(api_key=api_key, timeout=60.0)
        logger.info("dalle.api_call: model=%s size=%s quality=%s", model, size, quality)
        resp = client.images.generate(
            model=model,
            prompt=prompt,
            size=size,
            quality=quality,
            n=1,
            response_format="url",
        )
        if not resp.data or not resp.data[0].url:
            logger.error("dalle.no_url: 응답에 url 없음 (resp=%s)", str(resp)[:200])
            return None
        image_url = resp.data[0].url
        revised_prompt = getattr(resp.data[0], "revised_prompt", None) or prompt
        logger.info("dalle.url_received: %s...", image_url[:80])
    except Exception as e:  # noqa: BLE001
        # Round 86 — silent fail 진단. 에러 타입 + 메시지 명확히.
        logger.error("dalle.api_failed: type=%s msg=%s", type(e).__name__, str(e)[:300])
        return None

    # DALL-E URL 은 일시적 (1시간 만료) → Supabase Storage 업로드 필수
    try:
        import httpx
        with httpx.Client(timeout=60, follow_redirects=True) as h:
            r = h.get(image_url)
            r.raise_for_status()
            img_bytes = r.content
        if not img_bytes or len(img_bytes) < 1024:
            logger.warning("DALL-E 다운로드 결과 너무 작음: %d bytes", len(img_bytes or b""))
            return None
    except Exception as e:  # noqa: BLE001
        logger.warning("DALL-E 다운로드 실패: %s", e)
        return None

    # Supabase Storage 업로드 — image_picker 의 헬퍼 재사용
    try:
        from src.content.image_picker import (
            _slugify_for_filename,
            _slugify_for_storage_path,
        )

        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "blog-images")
        path_prefix = _slugify_for_storage_path(keyword)
        fname = f"cover-{_slugify_for_filename(keyword)}-dalle.png"
        object_path = f"{path_prefix}/{fname}"

        supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
        if supabase_url and service_key:
            import httpx
            upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"
            with httpx.Client(timeout=60) as h:
                up = h.post(
                    upload_url,
                    content=img_bytes,
                    headers={
                        "Authorization": f"Bearer {service_key}",
                        "Content-Type": "image/png",
                        "x-upsert": "true",
                    },
                )
            if up.status_code in (200, 201):
                public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{object_path}"
                return {
                    "url": public_url,
                    "alt": f"{title or keyword}",
                    "prompt": f"dalle3|{revised_prompt[:500]}",
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "dalle3",
                }
            logger.warning("Supabase upload 실패: %s — raw URL fallback", up.text[:200])
    except Exception as e:  # noqa: BLE001
        logger.warning("Supabase upload 에러: %s — raw URL fallback", e)

    # Supabase 업로드 실패 → DALL-E 임시 URL 반환 (1시간 후 만료 위험)
    # → 호출측에서 Pollinations fallback 으로 흘러가도록 None 반환이 더 안전
    logger.warning("DALL-E Storage 업로드 실패 → None (Pollinations fallback 유도)")
    return None
