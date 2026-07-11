import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * en/ja/zh 공용 셸 — 헤더(로고·nav·언어 스위처·WhatsApp CTA) + 푸터(WhatsApp·LINE·스위처).
 * 카카오는 국내 전용. 해외는 WhatsApp/LINE (siteConfig.contact.whatsapp/.line, env 주입).
 */
export function OverseasShell({
  lang,
  nav,
  ctaLabel,
  footerTagline,
  children,
}: {
  lang: "en" | "ja" | "zh";
  nav: { href: string; label: string }[];
  ctaLabel: string;
  footerTagline: string;
  children: React.ReactNode;
}) {
  const WA = siteConfig.contact.whatsapp;
  const LINE = siteConfig.contact.line;
  const home = `/${lang}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#FAFAF7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link href={home} className="flex items-baseline gap-2" aria-label="WECIRCLE Global">
            <span className="text-lg font-black tracking-tight">WECIRCLE</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Global
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-stone-600 lg:flex">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="transition hover:text-stone-900">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200/70 py-10 text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-black text-stone-800">WECIRCLE</span> Global · {footerTagline}
            </div>
            <div className="flex items-center gap-3">
              <a
                href={WA}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
              >
                WhatsApp
              </a>
              <a
                href={LINE}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#06C755] px-3 py-1.5 text-xs font-bold text-white"
              >
                LINE
              </a>
              <LanguageSwitcher />
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
