import type { Metadata } from "next";
import { OverseasShell } from "@/components/OverseasShell";
import { FloatingConsult } from "@/components/FloatingConsult";

// Round 159b (2026-08-16) — 대만(번체) 로케일. 콘텐츠 lang = zh-Hant.
export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — 讓AI引用您的韓國診所",
    template: "%s · WECIRCLE Global",
  },
  description:
    "外國患者透過ChatGPT、Perplexity和Gemini尋找韓國診所。WECIRCLE發布英語、日語、中文的GEO/AEO內容，讓您在Google排名靠前並被AI引用。",
  openGraph: { type: "website", locale: "zh_TW", siteName: "WECIRCLE Global" },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/tw",
    languages: { en: "/en", ja: "/ja", "zh-Hans": "/zh", "zh-Hant": "/tw", ko: "/" },
  },
};

const NAV = [
  { href: "/tw#how", label: "運作方式" },
  { href: "/tw#specialties", label: "科別" },
  { href: "/tw/clinics", label: "診所" },
  { href: "/tw/blog", label: "部落格" },
  { href: "/tw/about", label: "關於我們" },
  { href: "/tw/contact", label: "聯絡我們" },
];

export default function TwLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverseasShell
      lang="tw"
      nav={NAV}
      ctaLabel="預約諮詢"
      footerTagline="韓國診所的國際患者服務窗口"
    >
      {children}
      <FloatingConsult lang="tw" />
    </OverseasShell>
  );
}
