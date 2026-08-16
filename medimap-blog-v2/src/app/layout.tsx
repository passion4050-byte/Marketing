import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { SidebarShell } from '@/components/SidebarShell';
import { siteConfig } from '@/lib/site-config';

/**
 * Round 156 (2026-08-16) — GA4 설치. wecircle.co.kr 에 분석 태그가 전혀 없어
 * AI 엔진 referral(chatgpt.com, perplexity.ai 등) 유입이 완전 미지수였음.
 * NEXT_PUBLIC_GA4_ID (예: G-XXXXXXXXXX) 를 Vercel env 로 주입해야 활성화 —
 * 미설정 시 아무것도 렌더하지 않음 (프리뷰/로컬 오염 방지).
 * 전략은 항상 afterInteractive — lazyOnload 는 TBT/FCP 회귀 실증 (CLAUDE.md).
 */
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} · ${siteConfig.subtitle}`,
    template: `%s · ${siteConfig.name}`
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    type: 'website',
    locale: 'ko_KR',
    siteName: siteConfig.name
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-surface-subtle text-ink antialiased">
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
            </Script>
          </>
        )}
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
