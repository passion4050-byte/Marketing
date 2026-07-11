import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — 让AI引用您的韩国诊所",
    template: "%s · WECIRCLE Global",
  },
  description:
    "外国患者通过ChatGPT、Perplexity和Gemini寻找韩国诊所。WECIRCLE发布英语、日语、中文的GEO/AEO内容，让您在Google排名靠前并被AI引用，并对每一次引用进行measurement。",
  openGraph: { type: "website", locale: "zh_CN", siteName: "WECIRCLE Global" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/zh" },
};

const NAV = [
  { href: "/zh#how", label: "运作方式" },
  { href: "/zh#specialties", label: "科室" },
  { href: "/zh/guides/smile-lasik-in-korea", label: "样本" },
];

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#FAFAF7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/zh" className="flex items-baseline gap-2" aria-label="WECIRCLE Global">
            <span className="text-lg font-black tracking-tight">WECIRCLE</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Global
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-stone-600 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="transition hover:text-stone-900">
                {n.label}
              </Link>
            ))}
          </nav>
          <a
            href={siteConfig.contact.kakao}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-stone-700"
          >
            预约咨询 →
          </a>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200/70 py-10 text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-black text-stone-800">WECIRCLE</span> Global · 韩国诊所的AI搜索可见度
            </div>
            <div className="flex gap-5">
              <a href={siteConfig.contact.kakao} target="_blank" rel="noopener noreferrer" className="transition hover:text-stone-900">KakaoTalk</a>
              <Link href="/en" className="transition hover:text-stone-900">English</Link>
              <Link href="/" className="transition hover:text-stone-900">한국어</Link>
            </div>
          </div>
          <div className="mt-4 text-[12px] text-stone-400">© 2026 WECIRCLE (株式会社 위서클) · Seoul, Korea</div>
        </div>
      </footer>
    </div>
  );
}
