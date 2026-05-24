"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { siteConfig, navItems } from "@/lib/site";

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
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 transition-[backdrop-filter,box-shadow,background-color] duration-200 ${
        scrolled
          ? "bg-white/85 shadow-soft backdrop-blur-md"
          : "bg-white/95 backdrop-blur-sm"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-200 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(27,104,255,0.40) 50%, transparent 100%)",
        }}
      />
      <div className="container-content flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="메디맵 홈">
          <Logo />
          <span className="sr-only">메디맵</span>
        </Link>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-pill px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-surface-hover hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={siteConfig.contact.kakao}
            className="btn-primary ml-3 px-5 py-2.5 text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            메디맵 바로가기
          </Link>
        </nav>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-line bg-white text-ink-muted transition hover:bg-surface-hover hover:text-brand md:hidden"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          className={`fixed inset-x-3 top-20 z-40 origin-top rounded-card border border-line bg-white p-4 shadow-card transition-all duration-200 ${
            open ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          aria-label="모바일 메뉴"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-pill px-4 py-3 text-base font-medium text-ink-muted transition hover:bg-surface-hover hover:text-brand"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href={siteConfig.contact.kakao}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="btn-primary w-full justify-center"
              >
                메디맵 바로가기
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="drop-shadow-[0_2px_8px_rgba(27,104,255,0.22)]"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#logoGrad)" />
        <path
          d="M9 22V10l4 7 4-7v12M21 10v12M21 13.5l3-3.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
          메디맵
        </div>
        <div className="text-sm font-extrabold tracking-tight text-brand">
          MEDIMAP
        </div>
      </div>
    </div>
  );
}
