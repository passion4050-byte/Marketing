"""Nano Banana (Gemini 2.5 Flash Image) 클라이언트 — Round 108-a (2026-07-03).

OpenAI tier 2 에서 dall-e-3 / dall-e-2 접근 불가로 이미지 생성 실패.
Gemini paid tier 는 Nano Banana (gemini-2.5-flash-image) 접근 가능.
Vercel API 라우트 `regenerate-image/route.ts` 에서 검증된 로직을 Python 으로 이식.

환경:
    GEMINI_API_KEY (또는 GOOGLE_API_KEY) 필수
    GEMINI_IMAGE_MODEL   (선택, default: gemini-2.5-flash-image)
    SUPABASE_URL              필수 (Storage 업로드)
    SUPABASE_SERVICE_ROLE_KEY 필수
    SUPABASE_STORAGE_BUCKET   (선택, default: post-images)

응답 처리:
    - generateContent → candidates[0].content.parts[].inlineData.data (base64)
    - fallback 체인: gemini-2.5-flash-image → gemini-3-pro-image → imagen-4.0-generate-001 (predict)

비용:
    Gemini 2.5 Flash Image = 무료 tier / paid tier 저렴 (실측 필요, DALL-E $0.08 대비 저렴)
"""
from __future__ import annotations

import base64
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "gemini-2.5-flash-image"

# Round 108-a — ListModels API 로 실제 접근 가능한 모델 확정된 리스트.
# 우선순위: 나노바나나 기본 (안정) → Pro → Imagen 4 (predict endpoint)
_FALLBACK_CHAIN: list[tuple[str, str]] = [
    ("gemini-2.5-flash-image", "generateContent"),        # Nano Banana (기본)
    ("gemini-3-pro-image", "generateContent"),            # Nano Banana Pro
    ("gemini-3.1-flash-image", "generateContent"),        # Nano Banana 2
    ("imagen-4.0-generate-001", "predict"),               # Imagen 4
    ("imagen-4.0-fast-generate-001", "predict"),          # Imagen 4 Fast
]

_ANTI_TEXT_DIRECTIVE = (
    " CRITICAL: Absolutely NO text, NO letters, NO words, NO writing, NO signs, "
    "NO labels, NO captions, NO watermarks, NO logos, NO Korean or English characters "
    "in the image. Pure visual photograph only, no typography of any kind. "
    "이미지에 어떠한 텍스트, 글자, 문자, 로고, 표지판, 자막도 절대 넣지 마세요."
)


def is_nano_banana_enabled() -> bool:
    """GEMINI_API_KEY 가 있고 IMAGE_PROVIDER 가 nano_banana / gemini / auto 이거나 미설정이면 활성."""
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip():
        logger.warning("nano_banana.disabled: GEMINI_API_KEY 미설정")
        return False
    provider_raw = os.getenv("IMAGE_PROVIDER", "nano_banana")
    provider = (provider_raw or "nano_banana").strip().lower()
    if provider not in ("nano_banana", "gemini", "auto", "dalle"):
        # dalle 도 legacy fallback 으로 허용 (Round 105 잔재)
        logger.warning("nano_banana.disabled: IMAGE_PROVIDER='%s'", provider_raw)
        return False
    logger.info("nano_banana.enabled: provider='%s'", provider)
    return True


def _generate_context_concept(
    keyword: str,
    title: str | None,
    domain_category: str | None,
    api_key: str,
) -> Optional[str]:
    """Round 126-C — 글 맥락 기반 커버 컨셉 (우선순위 ①).

    Gemini 텍스트 1콜로 글 제목·키워드·진료과에 부합하는 무인물 사진 컨셉을
    영문 1문장으로 생성. 실패/타임아웃 시 None → 진료과 컨셉 풀 fallback (②).
    비용: flash 텍스트 ~80토큰 — 무시 수준 (MAX_DAILY_USD 가드 내).
    """
    ask = (
        "You write photography art direction for a Korean medical blog.\n"
        f"Article title: {title or keyword}\n"
        f"Keyword: {keyword}\n"
        f"Medical field: {domain_category or 'medical'}\n"
        "Task: In ONE short English sentence (max 25 words), describe a cover "
        "image concept that visually matches THIS article's specific topic.\n"
        "Rules: absolutely no people, no faces, no hands, no body parts; "
        "prefer objects, close-up details, tools, abstract concepts or still life; "
        "must be relevant to the medical field above; no text in image; "
        "make it visually striking and premium — cinematic editorial sensibility, "
        "not a generic stock photo.\n"
        "Answer with the sentence only."
    )
    try:
        r = httpx.post(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:generateContent?key={api_key}",
            json={
                "contents": [{"parts": [{"text": ask}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 80},
            },
            timeout=12,
        )
        if r.status_code != 200:
            return None
        txt = (
            r.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        txt = " ".join((txt or "").strip().split())
        # 안전망: 인물 단어가 섞여 나오면 폐기 → 풀 fallback
        if not txt or len(txt) < 12 or re.search(
            # Round 132 — hands/fingers 등 신체 부분 단어 보강 (#186 본문 손 클로즈업 실측)
            r"\b(person|people|face|faces|hand|hands|finger|fingers|palm|wrist|arm|arms"
            r"|doctor|patient|woman|women|man|men|portrait|model|human)\b",
            txt, re.IGNORECASE,
        ):
            return None
        return txt[:220]
    except Exception:  # noqa: BLE001
        return None


def _build_korean_prompt(
    keyword: str,
    title: str | None = None,
    *,
    is_self_tenant: bool = False,
    domain_category: str | None = None,
    concept: str | None = None,
) -> str:
    """Nano Banana 커버 프롬프트 (무신사 매거진 감도 유지 + 맥락 컨셉).

    Round 108-c: "감도 높은 실사, 무신사 매거진 스타일" — 시네마틱·필름톤 유지.
    Round 126-C (2026-07-05): 사용자 지적 "실내+모델만 반복 = AI 티" →
      우선순위 ① 글 맥락 컨셉(LLM 생성, concept 인자) ② 진료과 컨셉 풀
      ③ 키워드 추론. 인물 장면 제거 (사물·디테일·개념 중심).
    """
    if not concept:
        from src.content.image_picker import pick_concept
        concept = pick_concept(keyword, salt=(title or ""), domain_category=domain_category)
    # Round 127 — 한글 title 을 프롬프트에 직접 넣지 않음 (이미지 속 깨진 글자 유발).
    # 글 맥락은 _generate_context_concept(영문 컨셉)가 담당 — title 은 LLM 입력으로만.

    return (
        f"High-end editorial magazine photography, Musinsa magazine aesthetic, "
        f"cinematic tone. Subject: {concept}. "
        f"Cinematic natural window light, warm film-like tone, "
        f"minimalist Korean aesthetic, clean composition. "
        f"Shot on 35mm film camera, shallow depth of field, soft bokeh, "
        f"editorial framing, magazine cover quality, "
        f"8k UHD, sharp fine detail, professional color grading, "
        f"muted sophisticated palette. "
        f"No people, no person, no face, no hands, no body parts. "
        f"If the subject describes an illustration, render it as a clean minimal "
        f"illustration; otherwise photorealistic."
        + _ANTI_TEXT_DIRECTIVE
    )


def _call_one_model(model: str, endpoint: str, prompt: str, api_key: str) -> Optional[bytes]:
    """단일 모델 호출 → 성공 시 이미지 bytes, 실패 시 None."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:{endpoint}?key={api_key}"
    if endpoint == "generateContent":
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["Text", "Image"]},
        }
    else:  # predict (Imagen 4)
        body = {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": "16:9",
                "personGeneration": "allow_adult",
            },
        }
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url, json=body)
        if resp.status_code >= 400:
            logger.error(
                "nano_banana.%s 실패: status=%d body=%s",
                model, resp.status_code, resp.text[:300],
            )
            return None
        j = resp.json()
        b64: str | None = None
        if endpoint == "generateContent":
            parts = j.get("candidates", [{}])[0].get("content", {}).get("parts", [])
            for p in parts:
                inline = p.get("inlineData") or p.get("inline_data")
                if inline and inline.get("data"):
                    b64 = inline["data"]
                    break
        else:  # predict
            preds = j.get("predictions", [])
            if preds:
                b64 = preds[0].get("bytesBase64Encoded")
        if not b64:
            logger.error("nano_banana.%s 응답에 이미지 없음: %s", model, str(j)[:300])
            return None
        return base64.b64decode(b64)
    except Exception as e:  # noqa: BLE001
        logger.error("nano_banana.%s 예외: %s", model, e)
        return None


def _upload_to_storage(img_bytes: bytes, keyword: str, tag: str = "cover") -> Optional[str]:
    """Supabase Storage 업로드 → public URL. ASCII key 강제."""
    supa_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    svc_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not supa_url or not svc_key:
        logger.error("nano_banana.upload: SUPABASE env 미설정")
        return None
    if len(img_bytes) < 1024:
        logger.warning("nano_banana.upload: 이미지 너무 작음 %d bytes", len(img_bytes))
        return None

    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "post-images")
    # ASCII slug 강제 (한글 → InvalidKey 400)
    ascii_slug = re.sub(r"[^a-zA-Z0-9]+", "-", keyword).strip("-")[:60] or "regen"
    ts = int(datetime.now(timezone.utc).timestamp() * 1000)
    object_path = f"{ascii_slug}/{tag}-{ts}.png"

    try:
        upload_url = f"{supa_url}/storage/v1/object/{bucket}/{object_path}"
        with httpx.Client(timeout=60.0) as client:
            up = client.post(
                upload_url,
                content=img_bytes,
                headers={
                    "Authorization": f"Bearer {svc_key}",
                    "Content-Type": "image/png",
                    "x-upsert": "true",
                },
            )
        if up.status_code in (200, 201):
            return f"{supa_url}/storage/v1/object/public/{bucket}/{object_path}"
        logger.error("nano_banana.upload 실패 %d: %s", up.status_code, up.text[:300])
        return None
    except Exception as e:  # noqa: BLE001
        logger.error("nano_banana.upload 예외: %s", e)
        return None


def generate_nano_banana_image(
    keyword: str,
    title: Optional[str] = None,
    *,
    is_self_tenant: bool = False,
    domain_category: Optional[str] = None,
) -> Optional[dict]:
    """Nano Banana 로 cover 이미지 생성 → Supabase Storage 업로드 → public URL 반환.

    Returns:
        {url, alt, prompt, generated_at, source} | None
    """
    api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not api_key:
        return None

    override = (os.getenv("GEMINI_IMAGE_MODEL") or "").strip()
    chain: list[tuple[str, str]]
    if override:
        endpoint = "predict" if "imagen" in override.lower() else "generateContent"
        chain = [(override, endpoint)]
    else:
        chain = _FALLBACK_CHAIN

    # Round 126-C — 우선순위 ① 글 맥락 컨셉 (Gemini 텍스트 1콜) → 실패 시 ② 진료과 풀
    _ctx_concept = _generate_context_concept(keyword, title, domain_category, api_key)
    if _ctx_concept:
        logger.info("nano_banana.context_concept: %s", _ctx_concept[:100])
    prompt = _build_korean_prompt(
        keyword, title, is_self_tenant=is_self_tenant,
        domain_category=domain_category, concept=_ctx_concept,
    )
    logger.info("nano_banana.prompt_built: %s", prompt[:120])

    img_bytes: Optional[bytes] = None
    used_model = ""
    for model, endpoint in chain:
        logger.info("nano_banana.trying: %s (%s)", model, endpoint)
        img_bytes = _call_one_model(model, endpoint, prompt, api_key)
        if img_bytes and len(img_bytes) > 1024:
            used_model = model
            logger.info("nano_banana.success: %s (%d bytes)", model, len(img_bytes))
            break
    if not img_bytes:
        logger.error("nano_banana.all_failed: 모든 모델 실패")
        return None

    public_url = _upload_to_storage(img_bytes, keyword, tag="cover")
    if not public_url:
        return None

    return {
        "url": public_url,
        "alt": f"{title or keyword}",
        "prompt": f"nano_banana|{used_model}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": f"nano_banana:{used_model}",
    }
