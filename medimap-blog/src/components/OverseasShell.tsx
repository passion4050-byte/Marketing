import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { waHref } from "@/lib/ctaLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
// Round 169 — 해외 모바일 내비게이션(햄버거 드로어). 기존엔 lg 미만에서 nav 가 통째로 사라졌음.
import { OverseasNav } from "@/components/OverseasNav";

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
  lang: "en" | "ja" | "zh" | "tw";
  nav: { href: string; label: string }[];
  ctaLabel: string;
  footerTagline: string;
  children: React.ReactNode;
}) {
  const WA = waHref(lang);
  const LINE = siteConfig.contact.line;
  const home = `/${lang}`;
  /*
   * Round 146 (A4) — JA 헤더 CTA 를 LINE 으로.
   * 페르소나 감사: 일본 시장 지배 채널은 LINE 인데 첫 화면 우상단 유일 CTA
   * 「相談する」가 WhatsApp 이었음. 145c 가 ContactButtons·Floating 은 고쳤지만
   * 헤더는 누락 — 유키가 첫 화면만 보면 "이 사이트엔 LINE 이 없다"고 판단.
   */
  const headerCtaHref = lang === "ja" ? LINE : WA;
  const headerCtaBg = lang === "ja" ? "bg-[#06C755]" : "bg-[#25D366]";

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-[#FAFAF7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 md:py-4">
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            {/* Round 169 — 모바일에선 헤더 CTA 를 숨기지 않되 폭을 줄이고, nav 는 드로어로 */}
            <a
              href={headerCtaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden min-h-[44px] items-center rounded-none ${headerCtaBg} px-4 text-sm font-bold text-white transition hover:brightness-95 sm:flex`}
            >
              {ctaLabel}
            </a>
            <OverseasNav
              nav={nav}
              ctaHref={headerCtaHref}
              ctaLabel={ctaLabel}
              ctaBg={headerCtaBg}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-stone-200/70 py-10 text-sm text-stone-500">
        <div className="mx-auto max-w-6xl px-5">
          {/* Round 169 — 푸터 nav. 모바일 드로어와 별개로, 글 끝까지 읽은 사람이
              스크롤 바닥에서 바로 다음 목적지를 찾을 수 있게 한다(기존엔 링크 0개). */}
          <nav aria-label="Footer menu" className="mb-7 flex flex-wrap gap-x-6 gap-y-1 lg:hidden">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex min-h-[44px] items-center text-[15px] font-semibold text-stone-700 transition active:text-stone-900"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-black text-stone-800">WECIRCLE</span> Global · {footerTagline}
            </div>
            <div className="flex items-center gap-3">
              <a
                href={WA}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-none bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
              >
                WhatsApp
              </a>
              <a
                href={LINE}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-none bg-[#06C755] px-3 py-1.5 text-xs font-bold text-white"
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
