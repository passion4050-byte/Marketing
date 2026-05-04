import Script from "next/script";

interface Props {
  measurementId: string;
}

/**
 * GA4 gtag.js 로더 + page_view 자동 발사. NEXT_PUBLIC_GA_ID 가 비어있으면 렌더하지 않음.
 *
 * App Router 에서는 Server Component 가 layout 에 들어가므로 next/script 를 그대로 사용.
 * page_view 는 gtag config 에서 자동, 추가 이벤트는 src/lib/analytics.ts 의 helper 사용.
 */
export function GoogleAnalytics({ measurementId }: Props) {
  if (!measurementId) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: true,
            cookie_flags: 'SameSite=Lax;Secure',
          });
        `}
      </Script>
    </>
  );
}
