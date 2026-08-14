"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/site";
import { kakaoTrackHrefSelf } from "@/lib/ctaLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Round 111 v3 (2026-07-02) — Editorial masthead style header.
 * Warm off-white, hairline divider on scroll, no glass blur, tabular nums for CTA.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 bg-[#FAFAF7] transition-[border-color,background-color] duration-200 ${
        scrolled ? "border-b border-stone-200/70" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6 lg:px-10">
        {/* Wordmark */}
        <Link href="/" className="group inline-flex items-center gap-3" aria-label="위서클 홈">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-stone-600 transition hover:text-stone-950"
            >
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <span className="mx-3 h-4 w-px bg-stone-300" aria-hidden />
          <Link
            href={kakaoTrackHrefSelf()}
            className="group inline-flex items-center gap-2 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-stone-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            카카오톡 무료 상담
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>
              <path stroke="currentColor" d="M7 17L17 7" />
              <path stroke="currentColor" d="M7 7h10v10" />
            </svg>
          </Link>
        </nav>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center border border-stone-300 bg-white text-stone-700 transition hover:border-stone-900 hover:text-stone-900 md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`fixed inset-0 z-30 bg-stone-900/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          className={`fixed inset-x-0 top-16 z-40 border-b border-stone-200/70 bg-[#FAFAF7] p-6 transition-all duration-200 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
          aria-label="모바일 메뉴"
        >
          <div className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
            <span className="inline-block h-px w-6 bg-stone-400" />
            Menu
          </div>
          <ul className="divide-y divide-stone-200/70">
            {navItems.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-4 py-4"
                >
                  <span className="font-serif text-sm tabular-nums text-stone-400 group-hover:text-stone-900">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg font-bold tracking-tight text-stone-950 group-hover:text-stone-700">
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={kakaoTrackHrefSelf()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-6 flex w-full items-center justify-between border border-stone-900 bg-stone-900 px-5 py-4 text-white"
          >
            <span className="text-sm font-bold tracking-tight">카카오톡 무료 상담</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path stroke="currentColor" d="M7 17L17 7" />
              <path stroke="currentColor" d="M7 7h10v10" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-base font-black tracking-[-0.02em] text-stone-950 md:text-[17px]">
        WECIRCLE
      </span>
      <span className="hidden font-serif text-[10px] italic text-stone-500 md:inline">
        Insights
      </span>
    </div>
  );
}
