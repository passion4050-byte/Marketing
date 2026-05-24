"""Pollinations.AI 자동 이미지 생성 — 100% 무료, API 키 불필요.

MVP 단계 무료 이미지. 픽사 일러스트 스타일. URL 호출 → PNG bytes →
Supabase Storage 업로드 → public URL → generated_contents.cover_image_url.

환경:
    IMAGE_GEN_ENABLED       (기본 false → true 로 활성화)
    POLLINATIONS_MODEL      (기본 flux. turbo / sdxl 도 가능)
    SUPABASE_URL            Storage 업로드용
    SUPABASE_SERVICE_ROLE_KEY  Storage 권한

비용: $0. Rate limit 가끔 있지만 1/시간 수준의 cron 호출엔 충분.
"""
from __future__ import annotations

import os
import re
import hashlib
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

KEYWORD_MAP: dict[str, str] = {
    "강남라식": "LASIK eye surgery consultation in modern Gangnam clinic",
    "잠실라식": "eye examination preparation, friendly ophthalmologist",
    "송파라식": "comprehensive eye health check, warm clinic interior",
    "강남라섹": "LASEK laser eye treatment, calm patient",
    "잠실라섹": "LASEK procedure preparation",
    "백내장수술": "cataract surgery consultation with elderly patient, gentle care",
    "백내장": "cataract treatment, warm conversation between ophthalmologist and senior",
    "노안교정": "presbyopia correction consultation, senior eye health",
    "스마일라식": "SMILE laser eye treatment, modern equipment",
    "스마일": "SMILE eye surgery preparation",
    "라식": "LASIK eye surgery, modern ophthalmology clinic",
    "라섹": "LASEK eye treatment, professional clinic",
    "안과": "modern ophthalmology clinic, warm atmosphere",
    "TETE안과": "premium ophthalmology clinic with friendly staff",
    "TETE라식": "premium LASIK clinic consultation",
}

PROMPT_TEMPLATE = (
    "Pixar Disney 3D animation style, warm cinematic lighting, "
    "korean medical scene depicting {context}, "
    "expressive friendly character emotions, soft hospital interior background, "
    "premium quality, 16:9 cinematic aspect ratio, "
    "vibrant blue and white color palette, "
    "no text, no logo, not photorealistic"
)


def keyword_to_english_context(keyword: str) -> str:
    k = keyword.strip()
    if k in KEYWORD_MAP:
        return KEYWORD_MAP[k]
    for ko, en in KEYWORD_MAP.items():
        if ko in k or k in ko:
            return en
    if any(kw in k for kw in ["안과", "라식", "라섹", "스마일", "시력", "백내장", "노안"]):
        return f"korean ophthalmology clinic consultation about {k}"
    return f"korean medical clinic, friendly consultation about {k}"


def build_prompt(keyword: str, title: Optional[str] = None) -> str:
    context = keyword_to_english_context(keyword)
    if title:
        # 한국어 제목은 Pollinations 도 약함. 영문 컨텍스트만 강조.
        pass
    return PROMPT_TEMPLATE.format(context=context)


def is_enabled() -> bool:
    return os.environ.get("IMAGE_GEN_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def _slugify_for_filename(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9가-힣\-_]", "-", s.lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "image"


def generate_image_for_content(
    keyword: str,
    title: Optional[str] = None,
    *,
    width: int = 1280,
    height: int = 720,
) -> Optional[dict]:
    """Pollinations.AI 호출 + Supabase Storage 업로드.

    Returns:
        {url, alt, prompt, generated_at} | None
    """
    if not is_enabled():
        logger.info("IMAGE_GEN_ENABLED != true — 이미지 생성 skip")
        return None

    prompt = build_prompt(keyword, title)
    model = os.environ.get("POLLINATIONS_MODEL", "flux")
    seed = abs(hash(keyword + (title or ""))) % (2**31)  # deterministic
    alt_text = f"{title or keyword} — 픽사 일러스트"

    encoded = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&model={model}&seed={seed}&nologo=true&enhance=true"
    )

    try:
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            r = client.get(url)
            r.raise_for_status()
            img_bytes = r.content
        if not img_bytes or len(img_bytes) < 1024:
            logger.warning("Pollinations 응답 너무 작음: %d bytes", len(img_bytes))
            return None
    except Exception as e:
        logger.exception("Pollinations 호출 실패: %s", e)
        return None

    storage_url = _upload_to_supabase(img_bytes, keyword, title)
    if not storage_url:
        return None

    return {
        "url": storage_url,
        "alt": alt_text,
        "prompt": prompt,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _upload_to_supabase(img_bytes: bytes, keyword: str, title: Optional[str]) -> Optional[str]:
    supa_url = os.environ.get("SUPABASE_URL")
    supa_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supa_url and supa_key):
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정")
        return None

    bucket = "post-images"
    sha = hashlib.sha1(img_bytes).hexdigest()[:10]
    slug = _slugify_for_filename(title or keyword)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    path = f"{today}/{slug}-{sha}.jpg"

    upload_url = f"{supa_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {supa_key}",
        "apikey": supa_key,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }
    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(upload_url, content=img_bytes, headers=headers)
            if r.status_code not in (200, 201):
                logger.warning("Storage 업로드 실패 status=%s body=%s", r.status_code, r.text[:200])
                return None
    except Exception as e:
        logger.exception("Storage 업로드 예외: %s", e)
        return None

    return f"{supa_url}/storage/v1/object/public/{bucket}/{path}"


def attach_image_html(body_html: str, image: dict) -> str:
    """blog_html 본문 맨 위에 <figure> hero 이미지 삽입."""
    figure = (
        f'<figure class="post-hero">'
        f'<img src="{image["url"]}" alt="{image["alt"]}" loading="eager" decoding="async" />'
        f'<figcaption>{image["alt"]}</figcaption>'
        f'</figure>'
    )
    if "</h1>" in body_html:
        return body_html.replace("</h1>", "</h1>" + figure, 1)
    return figure + body_html
