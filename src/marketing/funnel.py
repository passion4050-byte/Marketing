"""UTM 파라미터 자동 주입 + Publication URL → 단축도메인 변환.

발행 시 자사 통제 URL이 cite 됐을 때 어디서 유입됐는지 GA4/내부 분석에서 구분 가능하게 만든다.

UTM convention:
- utm_source: 발행 채널 (own_blog, naver_blog, tistory, press_release, ...)
- utm_medium: ai_cite (default — AI cite 트래픽임을 식별)
- utm_campaign: 글 slug 또는 사용자 지정 (예: lasik_guide)
- utm_content: 선택 — 동일 글 안에서 여러 링크를 구분
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


@dataclass(frozen=True)
class UtmParams:
    source: str
    medium: str = "ai_cite"
    campaign: str = ""
    content: Optional[str] = None
    term: Optional[str] = None

    def to_dict(self) -> dict[str, str]:
        d = {
            "utm_source": self.source,
            "utm_medium": self.medium,
        }
        if self.campaign:
            d["utm_campaign"] = self.campaign
        if self.content:
            d["utm_content"] = self.content
        if self.term:
            d["utm_term"] = self.term
        return d


_SLUG_RE = re.compile(r"[^a-z0-9가-힣]+")


def _slugify_campaign(value: str) -> str:
    """공백/특수문자 → _, 소문자화. 한글은 유지."""
    s = (value or "").strip().lower()
    s = _SLUG_RE.sub("_", s)
    s = s.strip("_")
    return s[:80] or "untagged"


def inject_utm(url: str, params: UtmParams) -> str:
    """URL 에 UTM 파라미터를 머지한다.

    이미 동일 키가 존재하면 *덮어쓰지 않고* 유지한다 (사용자가 수동으로 다른 값을
    넣은 경우 존중). 빈 source/medium 은 거부한다.
    """
    if not url:
        return url
    if not params.source or not params.medium:
        raise ValueError("UTM source/medium 은 필수입니다.")

    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return url

    existing = dict(parse_qsl(parsed.query, keep_blank_values=False))
    new_params = params.to_dict()
    for k, v in new_params.items():
        existing.setdefault(k, v)
    new_query = urlencode(existing, doseq=False)
    return urlunparse(parsed._replace(query=new_query))


def apply_publication_funnel(
    url: str,
    channel: str,
    *,
    campaign: Optional[str] = None,
    medium: str = "ai_cite",
) -> str:
    """Publication 등록 시 호출 — channel 을 utm_source 로 매핑하고 UTM 부착.

    campaign 이 None 이면 URL path 의 마지막 segment(슬러그)를 자동 사용.
    """
    if not url:
        return url
    if not campaign:
        try:
            path = urlparse(url).path or ""
            tail = [seg for seg in path.split("/") if seg]
            campaign = _slugify_campaign(tail[-1]) if tail else "untagged"
        except Exception:
            campaign = "untagged"
    params = UtmParams(source=channel or "unknown", medium=medium, campaign=campaign)
    return inject_utm(url, params)


def shortlink_for(slug: str, base: Optional[str] = None) -> str:
    """단축도메인 URL 을 만든다 — wecircle.co.kr/r/{slug} 형식.

    base 미지정 시 환경변수 SHORTLINK_BASE_URL 을 사용 (기본값 https://wecircle.co.kr/r).

    🔴 Round 180d (2026-08-30) — 기본값이 m.medimap.kr 이었다. 우리 도메인이 아니다.
      이 함수는 Streamlit publication_tab 이 운영자에게 "복사해서 쓰세요" 하고
      보여주는 URL 을 만든다. 즉 남의 도메인 링크를 병원 발행물에 넣으라고
      건네고 있었다. 실제 리다이렉트는 medimap-blog/src/lib/site.ts 의
      wecircle.co.kr/r 로 이미 동작 중이고(활성 394건·클릭 216건),
      발행 본문에 medimap.kr 이 박힌 건 0건 — 실피해는 없다.
    """
    base = (base or os.getenv("SHORTLINK_BASE_URL", "https://wecircle.co.kr/r")).rstrip("/")
    safe_slug = _slugify_campaign(slug)
    return f"{base}/{safe_slug}"
