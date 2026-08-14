import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { kakaoTrackHrefSelf } from "@/lib/ctaLink";

/**
 * Round 111 v3 (2026-07-02) — Editorial masthead-style footer.
 * Off-white bg, ink typography, hairline dividers, tabular nums, no gradients.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-stone-200/70 bg-[#F5F4EF] text-stone-900">
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-8 lg:px-10">
        {/* Masthead row */}
        <div className="grid gap-12 border-b border-stone-300 pb-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              <span className="inline-block h-px w-6 bg-stone-400" />
              Colophon
            </div>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-[32px] font-black tracking-[-0.02em] text-stone-950">WECIRCLE</span>
              <span className="font-serif text-sm italic text-stone-500">Insights</span>
            </div>
            <p className="mt-4 max-w-md text-[13px] leading-[1.75] text-stone-600">
              {siteConfig.description}
            </p>
          </div>

          {/* Directory columns */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            <FooterColumn
              overline="Sections"
              items={[
                { label: "회사소개", href: "/about" },
                { label: "병원 입점 가이드", href: "/guide" },
                { label: "블로그", href: "/blog" },
                { label: "파트너 콘텐츠", href: "/with-partners" },
              ]}
            />
            <FooterColumn
              overline="Contact"
              items={[
                { label: "카카오톡 무료 상담", href: kakaoTrackHrefSelf(), external: true },
                { label: "제휴 문의", href: "/contact" },
                { label: "passion4050@gmail.com", href: "mailto:passion4050@gmail.com" },
              ]}
            />
            <FooterColumn
              overline="Legal"
              items={[
                { label: "개인정보처리방침", href: "/privacy" },
                { label: "이용약관", href: "/terms" },
              ]}
              trailing={
                <div className="mt-6 space-y-1 text-[11px] leading-relaxed text-stone-500">
                  <div className="font-semibold text-stone-700">{siteConfig.publisher.legalName}</div>
                  <div>{siteConfig.contact.address}</div>
                  <div>사업자 {siteConfig.contact.businessNumber}</div>
                </div>
              }
            />
          </div>
        </div>

        {/* CTA row */}
        <div className="mt-10 grid gap-6 border-b border-stone-300 pb-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
              Become a Partner
            </div>
            <p className="mt-3 font-serif text-2xl italic leading-snug text-stone-800 md:text-3xl">
              &ldquo;병원의 이야기를, AI 가 인용할 수 있는 자산으로.&rdquo;
            </p>
          </div>
          <a
            href={kakaoTrackHrefSelf()}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-4 text-white transition hover:bg-stone-800"
          >
            <span className="text-sm font-bold tracking-tight">카카오톡으로 무료 상담</span>
            <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-8 flex flex-col items-start justify-between gap-2 text-[11px] tabular-nums text-stone-500 md:flex-row md:items-center">
          <div>
            © {year} {siteConfig.publisher.legalName}. All rights reserved.
          </div>
          <div className="text-stone-400">Issue {year - 2000} · Vol. wecircle.co.kr</div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  overline,
  items,
  trailing,
}: {
  overline: string;
  items: { label: string; href: string; external?: boolean }[];
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
        {overline}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) =>
          item.external || item.href.startsWith("http") || item.href.startsWith("mailto:") ? (
            <li key={item.label}>
              <a
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="text-sm text-stone-700 transition hover:text-stone-950"
              >
                {item.label}
              </a>
            </li>
          ) : (
            <li key={item.href}>
              <Link href={item.href} className="text-sm text-stone-700 transition hover:text-stone-950">
                {item.label}
              </Link>
            </li>
          )
        )}
      </ul>
      {trailing}
    </div>
  );
}
