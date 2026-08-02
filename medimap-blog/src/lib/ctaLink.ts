/**
 * Round 144c (2026-08-02) — CTA 추적 링크.
 *
 * 문제였던 것: 발행 콘텐츠의 카카오 상담 CTA 가 오픈카톡 직링크를 그대로 써서
 *   클릭이 서버에 기록되지 않았다. 그 결과 어드민 유입·전환 표의
 *   ShortLink/클릭/CTR 이 상시 0 이었고, "AI 노출 → 실제 문의" 전환을
 *   측정할 방법이 없었다.
 *
 * 인프라는 이미 완성돼 있었다:
 *   `/r/[slug]` → lib/db.lookupShortlink(shortlinks) → recordClick(shortlink_clicks) → 302
 * 빠진 건 (a) shortlinks 행 (b) CTA 가 그 경로를 경유하지 않는다는 것 둘뿐이었다.
 *
 * slug 규칙은 **결정적**이어야 한다 — 코드에서 계산해야 하므로 랜덤 nanoid 금지.
 *   카카오 상담: `k-{partner_slug}`
 * DB 시딩은 tenants.partner_slug 기준으로 생성돼 있다.
 */

/** 추적 링크가 없을 때 되돌아갈 원본 채널 (링크가 죽는 것보다 낫다). */
import { siteConfig } from "@/lib/site";

/**
 * 파트너 카카오 상담 추적 링크.
 * @param partnerSlug tenants.partner_slug — 없으면 원본 카카오 링크로 폴백
 */
export function kakaoTrackHref(partnerSlug?: string | null): string {
  const s = (partnerSlug ?? "").trim();
  if (!s) return siteConfig.contact.kakao;
  return `/r/k-${s}`;
}

/**
 * 자사(위서클) 블로그용 카카오 상담 추적 링크.
 * tenants 의 자사 partner_slug 는 'wecircle-self'.
 */
export function kakaoTrackHrefSelf(): string {
  return "/r/k-wecircle-self";
}

/**
 * 추적 링크는 같은 도메인 경유라 target="_blank" 를 쓰면 중간 탭이 열린다.
 * `/r/*` 가 302 로 카카오로 넘기므로 새 탭 자체는 유지하되 rel 은 유지.
 */
export const TRACK_LINK_REL = "noopener noreferrer";
