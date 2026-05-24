"""4채널 표준 CTA 블록 템플릿 + 본문 병합 헬퍼.

콘텐츠 생성 단계 마지막에 호출하면 채널 컨벤션에 맞는 CTA 가 본문 끝에 부착된다.
의료법 린터 통과를 가정하므로 *과장/유인 표현 금지* — 단순 안내성 문구만.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class CtaConfig:
    kakao_channel_url: str = "https://pf.kakao.com/_xxxxx"
    naver_place_url: str = "https://map.naver.com/v5/search/메디맵"
    phone: str = "02-0000-0000"
    brand_name: str = "메디맵"
    own_blog_url: str = "https://medimap.kr/blog"


# 표준 안내 문구 — 의료법 린터 통과 보수 버전 (광고 표현 금지)
STANDARD_CTA = {
    "title": "{brand} 안내",
    "body_lead": "본 콘텐츠의 의료 정보는 일반적인 안내이며, 시술 가능 여부와 권장 술식은 정밀검사 후 의료진의 판단에 따릅니다. {brand} 운영자가 인근 안과의 정보를 비교해 안내해드립니다.",
}


def cta_block_for_channel(
    channel: str,
    cfg: Optional[CtaConfig] = None,
    *,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
) -> str:
    """채널별 CTA 블록 텍스트(또는 HTML)를 반환한다.

    channel ∈ {schema_org, blog_html, naver_blog, instagram, own_blog, generic}
    """
    cfg = cfg or CtaConfig()
    src = utm_source or channel
    camp = utm_campaign or "channel_cta"
    kakao = _with_utm(cfg.kakao_channel_url, src, camp)
    naver = _with_utm(cfg.naver_place_url, src, camp)
    body_lead = STANDARD_CTA["body_lead"].format(brand=cfg.brand_name)

    if channel in ("schema_org", "blog_html", "own_blog"):
        return _html_cta(cfg.brand_name, body_lead, kakao, naver, cfg.phone)
    if channel == "naver_blog":
        return _naver_cta(cfg.brand_name, body_lead, kakao, naver, cfg.phone)
    if channel == "instagram":
        return _instagram_cta(cfg.brand_name, kakao, cfg.phone)
    return _plain_cta(cfg.brand_name, body_lead, kakao, naver, cfg.phone)


def append_cta_to_content(
    content: str,
    channel: str,
    cfg: Optional[CtaConfig] = None,
    *,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
) -> str:
    """본문 끝에 채널 CTA 를 한 줄 띄우고 부착. 이미 CTA 마커가 있으면 중복 부착하지 않는다.

    2026-05-24: medimap-blog 자사 블로그 채널 (blog_html / schema_org / own_blog)
    은 페이지 레이아웃 자체에 "메디맵에 상담하기" CTA 가 별도 노출되므로
    본문 끝 CTA 부착은 중복 — no-op 으로 처리. 외부 채널(naver_blog / instagram)
    은 본문이 곧 전부라 그대로 부착 유지.
    """
    if not content:
        return content
    if channel in ("blog_html", "schema_org", "own_blog"):
        return content  # 자사 블로그 — 중복 회피
    if "data-cta-block=" in content or "[CTA-BLOCK]" in content:
        return content
    block = cta_block_for_channel(
        channel, cfg=cfg, utm_source=utm_source, utm_campaign=utm_campaign,
    )
    sep = "\n\n" if channel != "instagram" else "\n.\n.\n"
    marker = "<!-- [CTA-BLOCK] auto-injected by src.marketing -->\n"
    return f"{content.rstrip()}{sep}{marker}{block}"


def _with_utm(url: str, source: str, campaign: str) -> str:
    from src.marketing.funnel import inject_utm, UtmParams
    try:
        return inject_utm(
            url, UtmParams(source=source, medium="ai_cite", campaign=campaign),
        )
    except ValueError:
        return url


def _html_cta(brand: str, body: str, kakao: str, naver: str, phone: str) -> str:
    return (
        '<aside class="cta-block" data-cta-block="standard" '
        'style="margin:32px 0;padding:24px;border-radius:16px;'
        'background:linear-gradient(135deg,#1B68FF,#1AD2A4);color:#fff;">\n'
        f'  <h3 style="margin:0 0 8px;font-size:20px;font-weight:700;">{brand} 안내</h3>\n'
        f'  <p style="margin:0 0 16px;line-height:1.6;color:rgba(255,255,255,0.92);">{body}</p>\n'
        '  <div style="display:flex;flex-wrap:wrap;gap:8px;">\n'
        f'    <a href="{kakao}" target="_blank" rel="noopener" '
        'style="padding:10px 18px;border-radius:999px;background:rgba(255,255,255,0.18);'
        'color:#fff;text-decoration:none;font-weight:600;">카카오톡 상담</a>\n'
        f'    <a href="{naver}" target="_blank" rel="noopener" '
        'style="padding:10px 18px;border-radius:999px;background:rgba(255,255,255,0.18);'
        'color:#fff;text-decoration:none;font-weight:600;">네이버 플레이스</a>\n'
        f'    <a href="tel:{phone}" '
        'style="padding:10px 18px;border-radius:999px;background:#fff;'
        'color:#1B68FF;text-decoration:none;font-weight:700;">전화 ' + phone + '</a>\n'
        '  </div>\n'
        '</aside>'
    )


def _naver_cta(brand: str, body: str, kakao: str, naver: str, phone: str) -> str:
    """네이버 블로그는 HTML 제한 — 평문 + 단순 a 태그만."""
    return (
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📍 {brand} 안내\n\n"
        f"{body}\n\n"
        f"▸ 카카오톡 상담: {kakao}\n"
        f"▸ 네이버 플레이스: {naver}\n"
        f"▸ 전화: {phone}\n"
        f"━━━━━━━━━━━━━━━━━━━━"
    )


def _instagram_cta(brand: str, kakao: str, phone: str) -> str:
    """인스타 캡션 — 짧은 안내 + 프로필 링크 유도."""
    return (
        f"⠀\n"
        f"📍 {brand} 안내\n"
        f"프로필 링크에서 상담 채널을 열 수 있어요.\n"
        f"☎ {phone}\n"
        f"#메디맵 #안과 #병원비교"
    )


def _plain_cta(brand: str, body: str, kakao: str, naver: str, phone: str) -> str:
    return (
        f"📍 {brand} 안내\n\n"
        f"{body}\n\n"
        f"- 카카오톡: {kakao}\n"
        f"- 네이버 플레이스: {naver}\n"
        f"- 전화: {phone}"
    )
