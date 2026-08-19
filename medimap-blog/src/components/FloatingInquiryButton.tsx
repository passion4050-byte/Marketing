"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

/**
 * Round 111 v4 (2026-07-02) — Editorial 톤에 맞춘 미니멀 플로팅 CTA.
 * 검정 원형 버튼 + 카카오 아이콘. Contact/Admin 페이지에선 숨김.
 *
 * Round 165 (2026-08-18) — 파트너 병원 글에서 CTA 타깃 불일치 수정.
 *   /with-partners/{category}/{partner}/... 를 읽는 사람은 환자인데, 플로팅 버튼이
 *   B2B 제휴 문의(/contact)로 가고 있었음 (Round 146 이 CTABlock 만 고치고 여기는 누락).
 *   파트너 경로면 그 병원의 카카오 추적 링크(/r/k-{partner})로 — 클릭이
 *   shortlink_clicks 에 적재돼 클라이언트 포털 '상담 클릭' 지표로 이어진다.
 *   그 외 한국어 경로는 기존 B2B 문의 유지.
 */
const HIDE_ON: ((p: string) => boolean)[] = [
  (p) => p.startsWith("/admin"),
  (p) => p.startsWith("/client"),
  (p) => p === "/contact",
  (p) => p.startsWith("/review"), // 리뷰 퍼널은 페이지 자체가 단일 CTA
  // 해외(en/ja/zh/tw)는 자체 WhatsApp·LINE CTA 사용 — 한글 카카오 플로팅 숨김
  (p) => p.startsWith("/en"),
  (p) => p.startsWith("/ja"),
  (p) => p.startsWith("/zh"),
  (p) => p.startsWith("/tw"),
];

/** /with-partners/{category}/{partner}(/{slug}) → partner_slug (없으면 null) */
function partnerSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/with-partners\/[^/]+\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const BTN_CLASS =
  "group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 border border-stone-900 bg-stone-900 px-4 py-3 text-[13px] font-bold tracking-tight text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-800 sm:bottom-8 sm:right-8";

export function FloatingInquiryButton() {
  const pathname = usePathname();
  if (!pathname) return null;
  if (HIDE_ON.some((m) => m(pathname))) return null;

  const partner = partnerSlugFromPath(pathname);
  if (partner) {
    // 환자용 — 그 병원 카카오 상담 (추적 링크 경유, 새 탭에서 302 → 카카오)
    return (
      <a
        href={`/r/k-${partner}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="카카오톡으로 병원에 상담하기"
        className={BTN_CLASS}
      >
        <MessageCircle size={14} strokeWidth={2} />
        <span className="hidden sm:inline">카카오톡 상담</span>
        <span className="sm:hidden">상담</span>
      </a>
    );
  }

  return (
    <Link href="/contact" aria-label="제휴 문의하기" className={BTN_CLASS}>
      <MessageCircle size={14} strokeWidth={2} />
      <span className="hidden sm:inline">문의하기</span>
      <span className="sm:hidden">문의</span>
    </Link>
  );
}
