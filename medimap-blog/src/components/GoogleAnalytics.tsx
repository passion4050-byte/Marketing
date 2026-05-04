import Script from "next/script";

interface Props {
  /** GA4 Measurement ID (G-XXXXXXXXXX) — 직접 gtag.js 로드 */
  measurementId?: string;
  /** GTM Container ID (GTM-XXXXXXX) — Tag Manager 통한 통합 관리 (권장) */
  gtmId?: string;
}

/**
 * GA4 트래킹 부착. GTM 컨테이너와 직접 gtag.js 를 *독립적으로* 렌더한다.
 *
 * 둘 다 설정하면 둘 다 로드 — Tag Manager 미설정/대시보드 미게시 상태에서도
 * 직접 gtag 가 page_view 를 즉시 수집하도록. 양쪽 모두 같은 dataLayer 를 공유.
 *
 * ⚠ 주의: GTM 안에서 동일 Measurement ID 의 GA4 Configuration 태그를 *추가로*
 * 게시하면 page_view 가 *2번* 발사될 수 있음. GTM 으로 GA4 를 운영하기로
 * 결정하면 NEXT_PUBLIC_GA_ID 환경변수를 제거할 것.
 *
 * 모든 커스텀 이벤트는 src/lib/analytics.ts 의 track() → dataLayer.push() —
 * GTM 트리거와 gtag 양쪽 모두 동일 dataLayer 를 listen 하므로 호환.
 */
export function GoogleAnalytics({ measurementId, gtmId }: Props) {
  if (!gtmId && !measurementId) return null;
  return (
    <>
      {gtmId && (
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
      )}
      {measurementId && (
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
      )}
    </>
  );
}
