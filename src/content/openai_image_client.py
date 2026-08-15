"""Round 150-b (2026-08-15) — OpenAI 이미지 생성 클라이언트 (본문 figure 전용).

배경(사용자 확정): 본문 일러스트가 Pollinations flux 직행이라 저품질 + no-people
프롬프트 무시(리쥬란-409 인물 얼굴 실사고). 본문 figure 는 OpenAI 이미지로 승격.
커버는 nano_banana(Gemini) 유지 — 240장 v2 백필 실증 완료된 경로라 건드리지 않음.

흐름: prompt → OpenAI images API (b64) → Supabase Storage 업로드 → 영구 public URL.

환경:
    OPENAI_API_KEY        (필수)
    OPENAI_IMAGE_MODEL    (기본 gpt-image-1. 접근 불가 시 dall-e-3 자동 폴백)
    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  (Storage 업로드)

비용: gpt-image-1 medium 1536x1024 ≈ $0.04/장.
"""
from __future__ import annotations

import base64
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_API_URL = "https://api.openai.com/v1/images/generations"


def is_openai_image_enabled() -> bool:
    return bool((os.environ.get("OPENAI_API_KEY") or "").strip())


def _request(model: str, prompt: str, size: str, api_key: str) -> Optional[bytes]:
    """모델 1개 호출 → 이미지 bytes (b64). 실패 시 None."""
    payload: dict = {"model": model, "prompt": prompt, "size": size, "n": 1}
    if model.startswith("dall-e"):
        payload["response_format"] = "b64_json"
        payload["quality"] = "standard"
    else:
        # gpt-image-1 은 b64 기본 반환. medium 이면 품질/비용 균형.
        payload["quality"] = "medium"
    try:
        r = httpx.post(
            _API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=120,
        )
        if r.status_code != 200:
            logger.warning("openai_image.http_%s model=%s body=%s", r.status_code, model, r.text[:200])
            return None
        data = r.json().get("data") or []
        b64 = (data[0] or {}).get("b64_json") if data else None
        if not b64:
            return None
        return base64.b64decode(b64)
    except Exception as e:  # noqa: BLE001
        logger.warning("openai_image.request_failed model=%s err=%s", model, e)
        return None


def generate_openai_image(
    prompt: str,
    *,
    name_hint: str,
    subdir: str = "bodyv2",
) -> Optional[str]:
    """프롬프트 → OpenAI 이미지 생성 → Storage 업로드 → public URL. 실패 시 None."""
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None

    primary = (os.environ.get("OPENAI_IMAGE_MODEL") or "gpt-image-1").strip()
    # gpt-image-1: 1536x1024(가로) / dall-e-3: 1792x1024
    chain = [
        (primary, "1536x1024" if not primary.startswith("dall-e") else "1792x1024"),
    ]
    if primary != "dall-e-3":
        chain.append(("dall-e-3", "1792x1024"))

    img_bytes: Optional[bytes] = None
    used_model = ""
    for model, size in chain:
        img_bytes = _request(model, prompt, size, api_key)
        if img_bytes:
            used_model = model
            break
    if not img_bytes:
        return None

    try:
        from src.content.image_uploader import upload_bytes_to_storage

        url = upload_bytes_to_storage(img_bytes, name_hint=name_hint, subdir=subdir)
        if url:
            logger.info("openai_image.ok model=%s url=%s", used_model, url[:100])
            return url
    except Exception as e:  # noqa: BLE001
        logger.warning("openai_image.upload_failed err=%s", e)
    return None
