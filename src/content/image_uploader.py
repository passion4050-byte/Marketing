"""image_uploader — Pollinations URL 을 영구 Supabase Storage URL 로 변환.

Round 26 (2026-05-29) — 이미지 X 박스 영구 해결.

Pollinations.AI 한계:
- 새 URL 첫 요청 시 5~30초 lazy generation
- 그 동안 브라우저는 timeout → X 박스
- 30장+ 동시 요청 시 일부 영구 실패

해결: Pollinations 호출 → bytes → Supabase Storage 업로드 → 영구 public URL.
이 URL 은 CDN 캐시되어 즉시 표시. lazy gen 없음.

기존 image_picker._upload_to_supabase() 는 cover 용 단일 함수.
image_uploader.py 는 (1) URL → Storage 변환 (마이그레이션), (2) body figure 도
같은 패턴으로 사용 가능한 재사용 함수 제공.
"""
from __future__ import annotations

import hashlib
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# 기존 image_picker.py 와 동일한 버킷 사용 — Round 26 추가 분리 안 함.
BUCKET = "post-images"


def _slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9가-힣\-_]", "-", (s or "").lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "image"


def _detect_content_type(img_bytes: bytes) -> tuple[str, str]:
    """Magic bytes 로 image content_type + 확장자 추정.

    Returns:
        (content_type, ext)  예: ('image/jpeg', 'jpg') 또는 ('image/png', 'png').
    """
    head = bytes(img_bytes[:12])
    # JPEG
    if head[:3] == b"\xff\xd8\xff":
        return ("image/jpeg", "jpg")
    # PNG
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return ("image/png", "png")
    # WebP
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ("image/webp", "webp")
    # GIF (참고용, 버킷 MIME 에는 미허용)
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return ("image/gif", "gif")
    # 알 수 없으면 jpeg 로 fallback
    return ("image/jpeg", "jpg")


def fetch_image_bytes(url: str, *, timeout: int = 60) -> Optional[bytes]:
    """Pollinations 또는 임의 URL 에서 image bytes 다운로드.

    Pollinations 의 lazy gen 을 고려해 timeout 60s. 실패 시 None.
    상세 진단 로그 — print 로 GitHub Actions stdout 에 표시.
    """
    if not url:
        return None
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            r = client.get(url)
            r.raise_for_status()
            data = r.content
        if not data or len(data) < 1024:
            print(f"      fetch_too_small size={len(data) if data else 0} url={url[-60:]}")
            return None
        return data
    except httpx.HTTPStatusError as e:  # noqa: BLE001
        print(f"      fetch_http_error status={e.response.status_code} url={url[-60:]}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"      fetch_exception err={type(e).__name__}:{str(e)[:100]} url={url[-60:]}")
        return None


def upload_bytes_to_storage(
    img_bytes: bytes,
    *,
    name_hint: str,
    subdir: str = "auto",
) -> Optional[str]:
    """bytes → Supabase Storage 업로드 → public URL 반환.

    Round 26 보정 (2026-05-29):
    - Magic bytes 로 Content-Type + 확장자 자동 감지 (PNG / JPEG / WebP)
    - 잘못된 Content-Type 으로 인한 MIME 거부 방지
    - 상세 진단 로그 (status_code + response body 일부) — GitHub Actions stdout 에 노출

    같은 bytes 면 같은 sha → 같은 path → upsert 로 멱등.
    """
    # Round 26 fix 2 (2026-05-29): GitHub Secret 값에 trailing newline/quote 가 들어가는
    # 케이스 대응. httpx 가 'Bearer "***\n"' 같은 헤더를 LocalProtocolError 로 거부.
    # strip + 따옴표 제거로 안전망.
    supa_url = (os.environ.get("SUPABASE_URL") or "").strip().strip('"').strip("'")
    supa_key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip().strip('"').strip("'")
    if not (supa_url and supa_key):
        print("      upload_no_creds — SUPABASE_URL or SERVICE_ROLE_KEY 미설정")
        return None

    # Magic bytes 로 Content-Type + 확장자 추정
    content_type, ext = _detect_content_type(img_bytes)

    # supa_url 끝의 / 제거 (마이크로한 안전망)
    supa_url = supa_url.rstrip("/")

    sha = hashlib.sha1(img_bytes).hexdigest()[:12]
    slug = _slugify(name_hint)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    path = f"{subdir}/{today}/{slug}-{sha}.{ext}"

    endpoint = f"{supa_url}/storage/v1/object/{BUCKET}/{path}"
    headers = {
        "Authorization": f"Bearer {supa_key}",
        "apikey": supa_key,
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(endpoint, content=img_bytes, headers=headers)
            if r.status_code not in (200, 201):
                print(
                    f"      upload_failed status={r.status_code} "
                    f"ct={content_type} ext={ext} bytes={len(img_bytes)} "
                    f"body={r.text[:200]}"
                )
                return None
    except Exception as e:  # noqa: BLE001
        print(f"      upload_exception err={type(e).__name__}:{str(e)[:100]}")
        return None

    return f"{supa_url}/storage/v1/object/public/{BUCKET}/{path}"


def migrate_url_to_storage(
    src_url: str,
    *,
    name_hint: str,
    subdir: str = "auto",
) -> Optional[str]:
    """Pollinations URL → bytes → Storage → public URL. 한 번에.

    Returns:
        Storage public URL (성공) 또는 None (실패: 원본 URL 그대로 두라는 신호).
    """
    if not src_url:
        return None
    # 이미 Storage URL 이면 skip (멱등)
    if "storage/v1/object/public" in src_url:
        return src_url
    img_bytes = fetch_image_bytes(src_url)
    if not img_bytes:
        return None
    return upload_bytes_to_storage(img_bytes, name_hint=name_hint, subdir=subdir)


# ============================================================================
# scheduler / image_picker 통합용 wrapper — body figure 도 Storage 적용
# ============================================================================

def storage_url_for_section_figure(
    pollinations_url: str,
    *,
    keyword: str,
    section_heading: str,
) -> str:
    """body figure 1장의 Pollinations URL 을 Storage URL 로 변환.

    실패 시 원본 Pollinations URL 그대로 반환 (graceful — figure 가 사라지지 않게).
    """
    name = f"body-{_slugify(keyword)}-{_slugify(section_heading)}"
    storage_url = migrate_url_to_storage(
        pollinations_url, name_hint=name, subdir="body"
    )
    return storage_url or pollinations_url
