"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText } from "lucide-react";

/**
 * 강남언니 톤 플로팅 "문의하기" CTA — 모든 공개 페이지에서 우하단 고정.
 * 어드민/문의 페이지 자체에선 숨김 (중복 노출 방지).
 */
const HIDE_ON: ((p: string) => boolean)[] = [
  (p) => p.startsWith("/admin"),
  (p) => p === "/contact",
];

export function FloatingInquiryButton() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (HIDE_ON.some((m) => m(pathname))) return null;

  return (
    <Link
      href="/contact"
      aria-label="문의하기"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-brand to-accent px-5 py-3.5 text-[14px] font-bold text-white shadow-cta ring-2 ring-white/30 transition-all duration-200 hover:-translate-y-1 hover:shadow-glow active:translate-y-0 sm:bottom-6 sm:right-6"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
        <MessageSquareText size={14} />
      </span>
      <span className="hidden sm:inline">문의하기</span>
      <span className="sm:hidden">문의</span>
    </Link>
  );
}
