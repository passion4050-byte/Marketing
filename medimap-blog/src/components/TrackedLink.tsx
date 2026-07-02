"use client";

import { trackCtaClick } from "@/lib/analytics";

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  trackChannel: "kakao" | "naver_place" | "phone" | "medimap_main";
  trackSource: string;
  trackCampaign: string;
  /**
   * Round 110-C — 카카오톡 유입 세분화 라벨. cta / floating / channel 등.
   * kakao 채널일 때만 /api/track/kakao beacon 을 함께 보낸다.
   */
  kakaoMedium?: "cta" | "floating" | "channel" | "inline";
  tenantId?: number;
}

/**
 * GA4 cta_click 이벤트 발사를 위한 클라이언트 사이드 래퍼.
 *
 * 서버 컴포넌트(CTABlock)에서 이 컴포넌트를 임포트해 사용. onClick 핸들러는
 * 페이지 unload 전에 비동기 발사 — gtag.js 가 send_beacon transport 자동 사용.
 *
 * Round 110-C (2026-07-02): channel=kakao 클릭 시 /api/track/kakao 로도 beacon 발사.
 * navigator.sendBeacon 우선, 미지원 브라우저는 fetch({keepalive:true}) fallback.
 */
export function TrackedLink({
  trackChannel,
  trackSource,
  trackCampaign,
  kakaoMedium,
  tenantId,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackCtaClick(trackChannel, trackSource, trackCampaign);
        if (trackChannel === "kakao" && typeof window !== "undefined") {
          try {
            const payload = JSON.stringify({
              event:
                kakaoMedium === "floating"
                  ? "kakao_floating_click"
                  : kakaoMedium === "channel"
                    ? "kakao_channel_click"
                    : "kakao_cta_click",
              page_path: window.location.pathname,
              cta_label: typeof children === "string" ? children : trackSource,
              utm_medium: kakaoMedium ?? "cta",
              utm_campaign: trackCampaign,
              tenant_id: tenantId ?? null,
            });
            const url = "/api/track/kakao";
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
              const blob = new Blob([payload], { type: "application/json" });
              navigator.sendBeacon(url, blob);
            } else {
              fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
                keepalive: true,
              }).catch(() => { /* swallow */ });
            }
          } catch { /* swallow */ }
        }
        if (onClick) onClick(e);
      }}
    >
      {children}
    </a>
  );
}
