import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { PublicChrome } from "@/components/PublicChrome";
import { FloatingInquiryButton } from "@/components/FloatingInquiryButton";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} 테크 블로그`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.publisher.name }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: siteConfig.name,
    title: `${siteConfig.name} 테크 블로그`,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  // Round 118-B (2026-07-03) — RSS autodiscovery (/rss.xml, 네이버 서치어드바이저 제출용)
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/rss.xml" },
  },
  formatDetection: { telephone: false },
  // Round 62 후속 (2026-06-20) — Google Search Console 소유권 확인 meta tag.
  // Round 108 후속 (2026-07-03) — 네이버 서치어드바이저 소유권 확인 추가.
  // 인증 후에도 유지 (제거 시 인증 해제됨).
  verification: {
    google: "PHHfi6PtKyOBdqwbUTsFMYCDt4pUiKZU_hH7sKsThFs",
    other: {
      "naver-site-verification": "de48a01a6a44a45a2540c6b0a658b0b2251ce08f",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#1B68FF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const PRETENDARD_HREF =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css";

// Round 111 v4 (2026-07-02) — Editorial serif for italic accent (h1 span, quotes, numerals).
// Fraunces is variable, italic-capable, and reads warm/magazine. Loaded from Google Fonts.
const FRAUNCES_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400;1,9..144,500&display=swap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Warm up the font CDN before the stylesheet itself starts. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Pre-resolve DNS for analytics so lazy-loaded GA/GTM connects faster. */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {/* Plain stylesheet link in <head> — Next 14 hoists it; loaded in parallel
            with the rest of the document. The Pretendard subset CSS uses
            `font-display: swap` so system Korean fonts render immediately. */}
        <link rel="stylesheet" href={PRETENDARD_HREF} />
        <link rel="stylesheet" href={FRAUNCES_HREF} />
      </head>
      <body className="flex min-h-screen flex-col bg-[#FAFAF7] text-stone-900 antialiased">
        <PublicChrome header={<Header />} footer={<Footer />}>
          {children}
        </PublicChrome>
        <FloatingInquiryButton />
        <GoogleAnalytics measurementId={siteConfig.ga} gtmId={siteConfig.gtm} />
      </body>
    </html>
  );
}
