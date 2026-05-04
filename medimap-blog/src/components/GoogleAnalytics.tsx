import Script from "next/script";

interface Props {
  /** GA4 Measurement ID (G-XXXXXXXXXX) — 직접 gtag.js 로드 */
  measurementId?: string;
  /** GTM Container ID (GTM-XXXXXXX) — Tag Manager 통한 통합 관리 (권장) */
  gtmId?: string;
}

/**
 * GA4 트래킹 부착. GTM 또는 직접 gtag.js 둘 다 지원.
 *
 * 우선순위: GTM (gtmId) > 직접 gtag (measurementId).
 * 둘 다 비어있으면 렌더하지 않음 (silent skip).
 *
 * GTM 사용 시 GA4 / Meta Pixel / 네이버 광고 등을 GTM 대시보드에서 통합 관리 가능.
 * 모든 커스텀 이벤트는 src/lib/analytics.ts 의 track() → dataLayer.push() 로 동작
 * (GTM 과 gtag 양쪽 모두 dataLayer 를 사용하므로 호환).
 */
export function GoogleAnalytics({ measurementId, gtmId }: Props) {
  if (gtmId) {
    return (
      <>
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      </>
    );
  }
  if (measurementId) {
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
  return null;
}
