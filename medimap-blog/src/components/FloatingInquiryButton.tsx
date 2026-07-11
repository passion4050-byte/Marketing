"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/**
 * Round 111 v4 (2026-07-02) — Editorial 톤에 맞춘 미니멀 플로팅 CTA.
 * 검정 원형 버튼 + 카카오 아이콘. Contact/Admin 페이지에선 숨김.
 */
const HIDE_ON: ((p: string) => boolean)[] = [
  (p) => p.startsWith("/admin"),
  (p) => p.startsWith("/client"),
  (p) => p === "/contact",
  // 해외(en/ja/zh)는 자체 WhatsApp·LINE CTA 사용 — 한글 카카오 플로팅 숨김
  (p) => p.startsWith("/en"),
  (p) => p.startsWith("/ja"),
  (p) => p.startsWith("/zh"),
];

export function FloatingInquiryButton() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (HIDE_ON.some((m) => m(pathname))) return null;

  return (
    <Link
      href="/contact"
      aria-label="제휴 문의하기"
      className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 border border-stone-900 bg-stone-900 px-4 py-3 text-[13px] font-bold tracking-tight text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-800 sm:bottom-8 sm:right-8"
    >
      <MessageCircle size={14} strokeWidth={2} />
      <span className="hidden sm:inline">문의하기</span>
      <span className="sm:hidden">문의</span>
    </Link>
  );
}
