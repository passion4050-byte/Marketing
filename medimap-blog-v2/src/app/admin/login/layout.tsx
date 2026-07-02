import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false }
  },
  title: 'AI 검색 시대, 병원 마케팅 게임이 바뀝니다 · WECIRCLE GEO'
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
