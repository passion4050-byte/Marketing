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

# Round 29 (2026-05-30): 자사 인사이트 실사 톤. Pollinations + Unsplash 둘 다 사용.
PROMPT_TEMPLATE_REALISTIC = (
    "professional editorial photography, korean medical clinic environment, "
    "scene depicting {context}, "
    "natural daylight, documentary style, shot on DSLR, high quality, "
    "shallow depth of field, clean composition, modern aesthetic, "
    "no text, no logo, no watermark"
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


def keyword_to_unsplash_query(keyword: str) -> str:
    """Unsplash 검색 전용 query — 영문만 (한글 query 는 매칭 0개).

    Round 30 fix (2026-05-30): keyword_to_english_context 가 fallback 에서
    원본 한글 키워드 `{k}` 를 query 에 포함 → Unsplash 매칭 0개 → Pollinations fallback.
    Unsplash 전용 함수로 카테고리별 영문 query 만 반환.
    """
    k = keyword.strip()
    # 1. KEYWORD_MAP 매칭 — 이미 영문 (단 fallback 의 영문도 한글 mix 가능, 정리 필요)
    if k in KEYWORD_MAP:
        return KEYWORD_MAP[k]
    for ko, en in KEYWORD_MAP.items():
        if ko in k or k in ko:
            return en
    # 2. 카테고리별 generic 영문 query
    if any(kw in k for kw in ["안과", "라식", "라섹", "스마일", "시력", "백내장", "노안"]):
        return "korean ophthalmology clinic"
    if any(kw in k for kw in ["피부", "여드름", "필러", "보톡스", "레이저"]):
        return "korean dermatology clinic"
    if any(kw in k for kw in ["성형", "안면", "양악", "쌍꺼풀"]):
        return "korean plastic surgery clinic"
    if any(kw in k for kw in ["치과", "임플란트", "교정", "충치"]):
        return "korean dental clinic"
    if any(kw in k for kw in ["모발", "탈모", "헤어"]):
        return "hair transplant clinic"
    if any(kw in k for kw in ["GEO", "AEO", "마케팅", "광고", "콘텐츠", "의료법", "병원"]):
        return "medical professional meeting discussion"
    return "korean medical clinic professional"


def build_prompt(keyword: str, title: Optional[str] = None, *, realistic: bool = False) -> str:
    """Pollinations prompt 빌더.

    Round 29 — realistic=True 면 자사 인사이트용 실사 톤. False 면 파트너용 Pixar 톤.
    """
    context = keyword_to_english_context(keyword)
    template = PROMPT_TEMPLATE_REALISTIC if realistic else PROMPT_TEMPLATE
    return template.format(context=context)


def is_enabled() -> bool:
    return os.environ.get("IMAGE_GEN_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def _slugify_for_filename(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9가-힣\-_]", "-", s.lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "image"


def _slugify_for_storage_path(s: str) -> str:
    """Supabase Storage path 용 — 한글 거부 (InvalidKey 400).

    Round 30 fix (2026-05-30): _slugify_for_filename 은 alt/title 용도로 한글 유지.
    Storage path 의 key 에 한글이 들어가면 400 InvalidKey 거부.
    별도 함수로 영문/숫자/하이픈/언더스코어만 허용.
    """
    s = re.sub(r"[^a-zA-Z0-9\-_]", "-", s.lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "img"


def generate_image_for_content(
    keyword: str,
    title: Optional[str] = None,
    *,
    width: int = 1280,
    height: int = 720,
    is_self_tenant: bool = False,
) -> Optional[dict]:
    """Cover 이미지 생성 + Supabase Storage 업로드.

    Round 29 (2026-05-30):
        - is_self_tenant=True 면 자사 인사이트 → Unsplash 우선 (실사 톤) + Pollinations realistic fallback
        - is_self_tenant=False 면 파트너 → Pollinations Pixar 톤 (기존 동작)

    Returns:
        {url, alt, prompt, generated_at, source} | None
    """
    if not is_enabled():
        logger.info("IMAGE_GEN_ENABLED != true — 이미지 생성 skip")
        return None

    # Round 29 자사 인사이트 — Unsplash 우선
    if is_self_tenant:
        try:
            from src.content.unsplash_client import fetch_unsplash_to_storage
            # Round 30 fix (2026-05-30): keyword_to_english_context 의 fallback 이
            # 한글 keyword 를 query 에 포함시킴 → Unsplash 매칭 0개. 전용 함수로 대체.
            unsplash_query = keyword_to_unsplash_query(keyword)
            storage_url = fetch_unsplash_to_storage(
                unsplash_query,
                name_hint=f"cover-{keyword}",
                subdir="cover",
            )
            if storage_url:
                return {
                    "url": storage_url,
                    "alt": f"{title or keyword}",
                    "prompt": f"unsplash:{unsplash_query}",
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "unsplash",
                }
        except Exception as e:  # noqa: BLE001
            logger.warning("Unsplash fallback failed: %s — try Pollinations", e)
        # Unsplash 실패 → Pollinations realistic fallback

    prompt = build_prompt(keyword, title, realistic=is_self_tenant)
    model = os.environ.get("POLLINATIONS_MODEL", "flux")
    # Round 29: 자사는 width 1600 으로 더 큰 사이즈 (품질 개선)
    if is_self_tenant:
        width, height = 1600, 900
    seed = abs(hash(keyword + (title or ""))) % (2**31)
    alt_text = f"{title or keyword}"

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
        "source": "pollinations",
    }


def _upload_to_supabase(img_bytes: bytes, keyword: str, title: Optional[str]) -> Optional[str]:
    supa_url = os.environ.get("SUPABASE_URL")
    supa_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supa_url and supa_key):
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정")
        return None

    bucket = "post-images"
    sha = hashlib.sha1(img_bytes).hexdigest()[:10]
    # Round 30 fix (2026-05-30): Storage path 는 한글 거부 (InvalidKey 400)
    # → _slugify_for_storage_path 로 영문/숫자만. alt/title 용 slug 는 _slugify_for_filename.
    slug = _slugify_for_storage_path(title or keyword)
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


# ============================================================================
# 2026-05-28 Round 22 — Phase 3 body 일러스트 N장 정책
# ============================================================================

BODY_FIGURE_TEMPLATE = (
    '<figure style="margin: 2.5em 0;">\n'
    '  <img src="{url}" alt="{alt}" loading="lazy" '
    'style="width: 100%; height: auto; border-radius: 12px;" />\n'
    '  <figcaption style="text-align: center; color: #64748b; '
    'font-size: 0.9em; margin-top: 0.6em;">{caption}</figcaption>\n'
    '</figure>\n\n'
)


def generate_body_illustration_for_section(
    keyword: str,
    section_heading: str,
    *,
    index: int,
    width: int = 1200,
    height: int = 630,
) -> Optional[dict]:
    """본문 H2 섹션 1개당 일러스트 1장.

    Round 26 (2026-05-29): Pollinations URL 호출 → bytes → Supabase Storage 업로드 →
    영구 public URL 반환. 이전 Round 22~25 는 Pollinations URL 직접 삽입 → lazy gen
    으로 인한 X 박스 빈발. Storage 업로드 후 안정적인 CDN URL 사용.

    seed 는 index 로 분기해 같은 키워드 안에서도 그림이 겹치지 않도록 함.
    Storage 업로드 실패 시 Pollinations URL fallback (graceful — figure 가 사라지지 않게).
    """
    if not is_enabled():
        return None

    # 섹션 제목에서 이모지/특수문자 제거 (Pollinations prompt 정화)
    clean_heading = re.sub(r"[^\w가-힣\s]+", " ", section_heading).strip()
    en_ctx = keyword_to_english_context(keyword)
    prompt = (
        f"Pixar 3D animation, korean medical scene about {en_ctx}, "
        f"context: {clean_heading or 'consultation'}, "
        f"warm pastel lighting, expressive friendly characters, "
        f"modern clinic interior, no text, no logo"
    )
    model = os.environ.get("POLLINATIONS_MODEL", "flux")
    seed = (abs(hash(keyword + clean_heading)) % (2**24)) + index

    encoded = urllib.parse.quote(prompt)
    pollinations_url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&model={model}&seed={seed}&nologo=true&enhance=true"
    )

    # Round 26: Storage 업로드 → 영구 URL. 실패 시 Pollinations URL fallback.
    final_url = pollinations_url
    try:
        from src.content.image_uploader import storage_url_for_section_figure
        final_url = storage_url_for_section_figure(
            pollinations_url,
            keyword=keyword,
            section_heading=clean_heading or keyword,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "image_picker.body.storage_upload_failed err=%s — fallback to pollinations URL",
            e,
        )

    return {
        "url": final_url,
        "alt": (section_heading or keyword)[:120],
        "caption": (section_heading or keyword)[:120],
        "prompt": prompt,
    }


def inject_body_illustrations(
    body_html: str,
    keyword: str,
    *,
    max_count: int = 4,
) -> str:
    """본문 HTML 의 <h2> 직전에 figure 를 max_count 개까지 삽입.

    Round 17 SQL 패턴과 동일한 결과(<h2> 앞 figure) 를 코드로 생성.
    이미 figure 가 충분히 있는 글은 건드리지 않음 (멱등).
    """
    if not body_html or max_count <= 0:
        return body_html

    # 이미 figure 가 max_count 이상이면 skip — 재실행 시 중복 방지(멱등).
    # cover_image_url 은 별도 컬럼이라 body figure 카운트에 포함하지 않음.
    existing = body_html.count("<figure")
    if existing >= max_count:
        return body_html

    # <h2 ...>제목</h2> 추출 — 본문 H2 만 (제목 h1 제외)
    h2_pattern = re.compile(r'(<h2[^>]*>)(.*?)(</h2>)', re.IGNORECASE | re.DOTALL)
    matches = list(h2_pattern.finditer(body_html))
    if not matches:
        return body_html

    # 첫 H2 는 인사이트 글에서 보통 hook 이므로 두 번째부터 사용
    target_indices = list(range(1, min(len(matches), max_count + 1)))
    if not target_indices:
        target_indices = [0]

    # 뒤에서부터 삽입 — 앞 인덱스 offset 변동 회피
    insertions: list[tuple[int, str]] = []
    for k, idx in enumerate(target_indices):
        m = matches[idx]
        # 텍스트만 추출 (inner HTML 의 이모지/스타일은 보존)
        heading_text = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        img = generate_body_illustration_for_section(
            keyword, heading_text, index=k
        )
        if not img:
            continue
        figure = BODY_FIGURE_TEMPLATE.format(
            url=img["url"], alt=img["alt"], caption=img["caption"]
        )
        insertions.append((m.start(), figure))

    if not insertions:
        return body_html

    # 뒤에서부터 substring insert
    result = body_html
    for pos, figure in sorted(insertions, key=lambda x: -x[0]):
        result = result[:pos] + figure + result[pos:]
    return result
