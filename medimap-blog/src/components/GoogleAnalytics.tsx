import Script from "next/script";

interface Props {
  /** GA4 Measurement ID (G-XXXXXXXXXX) */
  measurementId?: string;
  /** GTM Container ID (GTM-XXXXXXX) — currently unused; kept in the prop shape
   *  in case the project ever switches back to a Tag Manager-driven setup. */
  gtmId?: string;
}

/**
 * GA4 트래킹 부착. 분석 단일 소스 — gtag.js 직접 로드.
 *
 * GTM 은 의도적으로 비활성: 사이트 목적이 "트래픽/전환 분석" 한정이고, GTM 까지
 * 같이 로드하면 critical-path 에 ~280KB 의 스크립트(gtag + gtm + gtag 재진입)가
 * 쌓여 LCP 가 뚜렷이 악화됐다 (2026-05 측정: GTM 제거 시 score 회복).
 *
 * 모든 커스텀 이벤트는 src/lib/analytics.ts 의 track() → window.gtag('event',...).
 *
 * `gtmId` prop 은 호환성 유지를 위해 시그니처에 남기되 무시. 다시 GTM 으로
 * 운영하기로 결정하면 이 컴포넌트와 함께 GoogleTagManager 별도 컴포넌트로
 * 분리 권장.
 */
export function GoogleAnalytics({ measurementId, gtmId: _gtmId }: Props) {
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
