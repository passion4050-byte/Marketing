import type { Metadata } from 'next';
import './globals.css';
import { SidebarShell } from '@/components/SidebarShell';
import { siteConfig } from '@/lib/site-config';

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
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
