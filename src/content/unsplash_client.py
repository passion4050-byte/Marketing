"""Unsplash API 클라이언트 — 자사 인사이트 실사 톤 이미지.

Round 29 (2026-05-30) — Pollinations 한도 이슈 영구 해결.

흐름:
    keyword → Unsplash search photos → 1개 선택 → bytes → Supabase Storage 업로드
    → 영구 public URL.

장점:
    - 무료 (월 50 요청/시간, 시간당 5000 다운로드)
    - 안정적 (대형 CDN, lazy gen 없음)
    - 고품질 stock photo
    - 의료·병원 톤 검색 결과 풍부

env:
    UNSPLASH_ACCESS_KEY  Unsplash Developers 에서 발급 (Free tier OK)

API 문서: https://unsplash.com/documentation
"""
from __future__ import annotations

import os
import urllib.parse
from typing import Optional

import httpx


def _clean_env(name: str) -> str:
    return (os.environ.get(name) or "").strip().strip('"').strip("'")


def search_unsplash_photo(
    query: str,
    *,
    orientation: str = "landscape",
    timeout: int = 10,
) -> Optional[dict]:
    """Unsplash 검색 → 가장 적합한 photo 1개 메타 반환.

    Returns:
        {"url": "...", "alt": "...", "author": "...", "unsplash_id": "..."} | None
    """
    access_key = _clean_env("UNSPLASH_ACCESS_KEY")
    if not access_key:
        return None
    if not (query or "").strip():
        return None

    endpoint = "https://api.unsplash.com/search/photos"
    params = {
        "query": query.strip(),
        "per_page": 10,
        "orientation": orientation,
        "content_filter": "high",  # 의료 sensitive 콘텐츠 회피
        "order_by": "relevant",
    }
    headers = {"Authorization": f"Client-ID {access_key}"}

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.get(endpoint, params=params, headers=headers)
            if r.status_code != 200:
                print(f"      unsplash_search_http status={r.status_code} body={r.text[:160]}")
                return None
            data = r.json()
    except Exception as e:  # noqa: BLE001
        print(f"      unsplash_search_exception err={type(e).__name__}:{str(e)[:100]}")
        return None

    results = (data or {}).get("results") or []
    if not results:
        return None

    # Round 104 (2026-06-29) — 썸네일 다양성 + 인물 회피.
    #   기존: results[0] 고정 → 비슷한 쿼리에 같은 인기 사진 반복(중복) + 외국인 인물 노출.
    #   개선: ① alt_description 에 인물 단어 있는 사진은 후순위(없으면 전체)
    #         ② 상위 후보 중 랜덤 선택 → 같은 글 주제라도 매번 다른 컷.
    import random as _random

    _PEOPLE_WORDS = (
        "man", "woman", "men", "women", "people", "person", "girl", "boy",
        "face", "portrait", "doctor", "patient", "smiling", "selfie", "model",
    )

    def _has_people(p: dict) -> bool:
        alt = (p.get("alt_description") or "").lower()
        return any(w in alt for w in _PEOPLE_WORDS)

    no_people = [p for p in results if not _has_people(p)]
    pool = no_people if no_people else results
    photo = _random.choice(pool[:8])
    user = photo.get("user") or {}
    author_link = ((user.get("links") or {}).get("html") or "https://unsplash.com")
    return {
        "url": photo["urls"]["regular"],          # 1080px wide JPEG
        "alt": photo.get("alt_description") or query,
        "author": user.get("name") or "Unsplash",
        # Round 81 — 약관(작가 크레딧) 표기용 프로필 링크 + UTM.
        "author_link": f"{author_link}?utm_source=medimap&utm_medium=referral",
        "unsplash_id": photo.get("id"),
        "download_location": (photo.get("links") or {}).get("download_location"),
    }


def trigger_download_event(download_location: str) -> None:
    """Unsplash API 약관 — download_location 호출로 다운로드 카운트 트래킹.

    실패해도 무시 (fire-and-forget). 약관 준수용.
    """
    if not download_location:
        return
    access_key = _clean_env("UNSPLASH_ACCESS_KEY")
    if not access_key:
        return
    try:
        with httpx.Client(timeout=5) as client:
            client.get(
                download_location,
                headers={"Authorization": f"Client-ID {access_key}"},
            )
    except Exception:  # noqa: BLE001
        pass


def fetch_unsplash_to_storage(
    query: str,
    *,
    name_hint: str,
    subdir: str = "self",
    orientation: str = "landscape",
) -> Optional[dict]:
    """Unsplash 검색 → bytes → Supabase Storage 업로드 → 메타 dict.

    Round 81 — 반환을 dict {url, author, author_link} 로 변경(작가 크레딧 약관 표기용).
    실패 시 None (image_picker 가 다른 fallback 으로).
    """
    meta = search_unsplash_photo(query, orientation=orientation)
    if not meta:
        return None

    # 1) Image bytes
    try:
        from src.content.image_uploader import fetch_image_bytes, upload_bytes_to_storage
    except ImportError:
        return None

    bytes_ = fetch_image_bytes(meta["url"], timeout=20)
    if not bytes_:
        return None

    # 2) Storage 업로드
    storage_url = upload_bytes_to_storage(
        bytes_,
        name_hint=f"unsplash-{name_hint}",
        subdir=subdir,
    )
    if not storage_url:
        return None

    # 3) Unsplash 약관 — 다운로드 카운트 트래킹
    if meta.get("download_location"):
        trigger_download_event(meta["download_location"])

    return {
        "url": storage_url,
        "author": meta.get("author") or "Unsplash",
        "author_link": meta.get("author_link") or "https://unsplash.com",
    }
