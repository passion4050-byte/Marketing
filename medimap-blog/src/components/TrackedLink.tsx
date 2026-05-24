"use client";

import { trackCtaClick } from "@/lib/analytics";

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  trackChannel: "kakao" | "naver_place" | "phone" | "medimap_main";
  trackSource: string;
  trackCampaign: string;
}

/**
 * GA4 cta_click 이벤트 발사를 위한 클라이언트 사이드 래퍼.
 *
 * 서버 컴포넌트(CTABlock)에서 이 컴포넌트를 임포트해 사용. onClick 핸들러는
 * 페이지 unload 전에 비동기 발사 — gtag.js 가 send_beacon transport 자동 사용.
 */
export function TrackedLink({
  trackChannel,
  trackSource,
  trackCampaign,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        trackCtaClick(trackChannel, trackSource, trackCampaign);
        if (onClick) onClick(e);
      }}
    >
      {children}
    </a>
  );
}
