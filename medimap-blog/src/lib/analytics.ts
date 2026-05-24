/**
 * 이벤트 발사 헬퍼 — dataLayer.push() 기반 (GTM + gtag.js 양쪽 호환).
 *
 * GTM: dataLayer 를 직접 listen 하여 GA4 tag 로 forward
 * gtag.js: gtag('event', ...) 가 내부적으로 dataLayer.push() 함
 *
 * window 가 없거나 (SSR) dataLayer 가 init 안 됐으면 silent no-op.
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set" | "consent",
      action: string,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export type GtagEventParams = Record<string, string | number | boolean | undefined>;

export function track(eventName: string, params: GtagEventParams = {}): void {
  if (typeof window === "undefined") return;
  // strip undefined values for cleanliness
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v;
  }
  // dataLayer.push 는 GTM 과 gtag.js 모두 호환되는 표준 인터페이스
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...clean });
}

export function trackCtaClick(
  channel: "kakao" | "naver_place" | "phone" | "medimap_main",
  source: string,
  campaign: string,
): void {
  track("cta_click", {
    event_category: "engagement",
    event_label: channel,
    cta_channel: channel,
    cta_source: source,
    cta_campaign: campaign,
  });
}

export function trackShortlinkRedirect(slug: string): void {
  track("shortlink_redirect", {
    event_category: "navigation",
    event_label: slug,
    shortlink_slug: slug,
  });
}
