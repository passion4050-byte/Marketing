import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — Get Your Korean Clinic Cited by AI",
    template: "%s · WECIRCLE Global",
  },
  description:
    "We publish English, Japanese & Chinese GEO/AEO content so ChatGPT, Perplexity & Gemini recommend your Korean clinic to foreign patients — and we measure every AI citation.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "WECIRCLE Global",
    title: "WECIRCLE Global — Get Your Korean Clinic Cited by AI",
    description:
      "GEO/AEO content in EN/JA/ZH so AI search recommends your clinic to foreign patients.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/en" },
};

const NAV = [
  { href: "/en#how", label: "How it works" },
  { href: "/en#specialties", label: "Specialties" },
  { href: "/en#proof", label: "Proof" },
  { href: "/en/guides/best-skin-clinics-in-gangnam", label: "Sample" },
];

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#FAFAF7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/en" className="flex items-baseline gap-2" aria-label="WECIRCLE Global">
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
            Book a call →
          </a>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200/70 py-10 text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-black text-stone-800">WECIRCLE</span> Global · AI search
              visibility for Korean clinics
            </div>
            <div className="flex gap-5">
              <a
                href={siteConfig.contact.kakao}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-stone-900"
              >
                KakaoTalk
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="transition hover:text-stone-900"
              >
                Email
              </a>
              <Link href="/" className="transition hover:text-stone-900">
                한국어
              </Link>
            </div>
          </div>
          <div className="mt-4 text-[12px] text-stone-400">
            © 2026 WECIRCLE (주식회사 위서클) · Seoul, Korea · Business No. 798-67-00527
          </div>
        </div>
      </footer>
    </div>
  );
}
