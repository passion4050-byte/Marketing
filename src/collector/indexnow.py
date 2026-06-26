"""IndexNow 자동 핑 — Round 82 (2026-06-26).

발행 시 검색엔진에 즉시 통지. **IndexNow 참여 엔진: 네이버 · Bing · Yandex · Seznam.**
(주의: Google 은 IndexNow 미지원 — Google 색인은 사이트맵/크롤에 의존. 한국 의료 사이트라
 네이버 통지가 핵심 가치.)

IndexNow 키는 비밀이 아님 — 사이트에 공개 파일로 호스팅하는 게 프로토콜 사양.
  키 파일: {SITE}/8f3a2c1b9d7e4056a1c2f3b4e5d60718.txt (내용 = 키 문자열)
  → medimap-blog/public/8f3a2c1b9d7e4056a1c2f3b4e5d60718.txt

호출 실패는 발행을 막지 않음 (graceful). 네트워크 미허용/오류 시 조용히 skip.
"""
from __future__ import annotations

import os

import structlog

logger = structlog.get_logger(__name__)

# 공개 키 (비밀 아님). public/{KEY}.txt 와 반드시 동일해야 함.
INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "8f3a2c1b9d7e4056a1c2f3b4e5d60718")
SITE_URL = (
    os.getenv("NEXT_PUBLIC_SITE_URL") or "https://medimap-blog-phi.vercel.app"
).rstrip("/")

# 단일 엔드포인트가 참여 엔진 전체에 전파(IndexNow 사양). api.indexnow.org 권장.
_ENDPOINT = "https://api.indexnow.org/indexnow"


def submit_urls(urls: list[str]) -> bool:
    """URL 목록을 IndexNow 에 제출. 성공 시 True. 실패/스킵 시 False (graceful).

    호출 측은 반환값 무시해도 됨 — 발행 차단 사유 아님.
    """
    clean = [u.strip() for u in (urls or []) if u and u.strip()]
    if not clean:
        return False

    host = SITE_URL.replace("https://", "").replace("http://", "").rstrip("/")
    payload = {
        "host": host,
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "urlList": clean[:10000],  # 사양 상 1회 최대 10000
    }
    try:
        import httpx

        resp = httpx.post(_ENDPOINT, json=payload, timeout=10.0)
        ok = resp.status_code in (200, 202)
        logger.info(
            "indexnow.submitted", n=len(clean), status=resp.status_code, ok=ok
        )
        return ok
    except Exception as e:  # noqa: BLE001 — 네트워크/라이브러리 실패는 발행 무관
        logger.warning("indexnow.failed", error=str(e), n=len(clean))
        return False


def build_post_url(
    *,
    slug: str,
    partner_category: str | None = None,
    partner_slug: str | None = None,
    is_partner: bool = False,
) -> str:
    """발행 글의 공개 URL 생성. 파트너면 /with-partners/{cat}/{slug}/{post}, 자사면 /blog/{post}."""
    if is_partner and partner_category and partner_slug and partner_slug != "medimap-self":
        return f"{SITE_URL}/with-partners/{partner_category}/{partner_slug}/{slug}"
    return f"{SITE_URL}/blog/{slug}"
