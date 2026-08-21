"use client";

/**
 * 🔴 Round 169 (2026-08-20) — 해외(en/ja/zh/tw) 모바일 내비게이션 신설.
 *
 * 실사고: OverseasShell 의 nav 가 `hidden … lg:flex` 였고 모바일 드로어가
 * **아예 구현돼 있지 않았다**(햄버거·useState·Menu 아이콘 0개). 푸터에도 nav 링크가 없어
 * 해외 모바일 방문자는 가이드 글을 다 읽은 뒤 갈 곳이 로고·언어 스위처·WhatsApp 뿐 —
 * 사실상 1페이지 사이트였다. 국내 Header.tsx 의 드로어 패턴을 해외 톤으로 이식한다.
 *
 * 설계 원칙(모바일 우선):
 *   · 트리거 44×44px 이상, 드로어 링크는 56px 행 — 흔들리는 지하철/기내에서도 정확히 눌림
 *   · 열렸을 때 body 스크롤 잠금 + Esc 닫기 + 라우트 변경 시 자동 닫힘
 *   · 링크는 18px 로 크게(해외 방문자는 비원어민 — 작은 영문은 판독 부하가 큼)
 *   · 하단에 상담 CTA 를 한 번 더 — 드로어를 연 시점이 이탈 직전이므로 마지막 출구
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function OverseasNav({
  nav,
  ctaHref,
  ctaLabel,
  ctaBg,
}: {
  nav: { href: string; label: string }[];
  ctaHref: string;
  ctaLabel: string;
  ctaBg: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 라우트 이동 시 자동 닫힘
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 열렸을 때 배경 스크롤 잠금 + Esc
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="-mr-2 flex h-11 w-11 items-center justify-center text-stone-700 transition active:bg-stone-200/60 lg:hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open ? (
        <>
          {/* 오버레이 — 바깥 탭으로 닫기 */}
          <div
            className="fixed inset-0 top-[65px] z-30 bg-stone-900/25 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            aria-label="Site menu"
            className="fixed inset-x-0 top-[65px] z-40 border-b border-stone-200 bg-[#FAFAF7] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] lg:hidden"
          >
            <div className="flex flex-col px-5 pb-5 pt-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex min-h-[56px] items-center border-b border-stone-200/70 text-[18px] font-bold tracking-tight text-stone-900 transition active:text-stone-500"
                >
                  {n.label}
                </Link>
              ))}
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 flex min-h-[54px] items-center justify-center ${ctaBg} px-5 text-[15px] font-bold text-white transition active:brightness-95`}
              >
                {ctaLabel}
              </a>
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}
