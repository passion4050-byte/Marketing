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
    """OPENAI_API_KEY 가 있고 IMAGE_PROVIDER 가 dalle 이거나 미설정이면 활성."""
    if not (os.getenv("OPENAI_API_KEY") or "").strip():
        return False
    provider = (os.getenv("IMAGE_PROVIDER", "dalle") or "dalle").strip().lower()
    return provider in ("dalle", "openai", "auto")


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

    # build prompt — image_picker 와 같은 사람 제거 + 인테리어 정물 톤
    from src.content.image_picker import build_prompt

    prompt = build_prompt(keyword, title, realistic=is_self_tenant)

    try:
        from openai import OpenAI
    except ImportError as e:
        logger.warning("openai 패키지 미설치 — DALL-E skip: %s", e)
        return None

    try:
        client = OpenAI(api_key=api_key, timeout=60.0)
        resp = client.images.generate(
            model=model,
            prompt=prompt,
            size=size,
            quality=quality,
            n=1,
            response_format="url",
        )
        if not resp.data or not resp.data[0].url:
            logger.warning("DALL-E 응답에 url 없음")
            return None
        image_url = resp.data[0].url
        revised_prompt = getattr(resp.data[0], "revised_prompt", None) or prompt
    except Exception as e:  # noqa: BLE001
        logger.warning("DALL-E 호출 실패: %s", e)
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
