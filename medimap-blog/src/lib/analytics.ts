/**
 * GA4 이벤트 발사 헬퍼.
 *
 * `gtag` 가 window 에 없으면 (GA 비활성/차단/SSR) silent no-op.
 * 모든 이벤트는 send_to: GA_ID (config 에서 잡힘) + 표준 파라미터.
 */

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "set" | "consent",
      action: string,
      params?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
  }
}

export type GtagEventParams = Record<string, string | number | boolean | undefined>;

export function track(eventName: string, params: GtagEventParams = {}): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  // strip undefined values for cleanliness
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v;
  }
  window.gtag("event", eventName, clean);
}

export function trackCtaClick(
  channel: "kakao" | "naver_place" | "phone",
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
