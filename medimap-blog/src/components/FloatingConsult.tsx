"use client";

import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";

/**
 * Round 145c (2026-08-14) — 해외(en/ja/zh) 모바일 플로팅 상담 버튼.
 *   감사 #7: 가이드 글이 8~10 스크린인데 CTA 가 최말미 1개 → 모바일에서 상담 진입 상실.
 *   설계(emil 원칙): 모션 최소 — 진입 애니메이션 1회(motion-safe), active 시 촉각 스케일만.
 *   스크롤 리스너 없음(항상 표시) — window scroll listener 금지 규칙 준수.
 *   데스크톱(md+)은 스티키 헤더 CTA 가 상시 보이므로 모바일 전용(md:hidden).
 *   /contact 페이지는 페이지 자체가 CTA 라 숨김. lang=ja 는 LINE 우선.
 */
const LABELS: Record<string, { wa: string; line: string }> = {
  en: { wa: "WhatsApp", line: "LINE" },
  ja: { wa: "WhatsApp", line: "LINE相談" },
  zh: { wa: "咨询", line: "LINE" },
};

export function FloatingConsult({ lang }: { lang: "en" | "ja" | "zh" }) {
  const pathname = usePathname();
  if (!pathname || pathname.endsWith("/contact")) return null;

  const l = LABELS[lang] ?? LABELS.en;
  const lineFirst = lang === "ja";

  const wa = (
    <a
      key="wa"
      href={siteConfig.contact.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp chat"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition active:scale-[0.97]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.04 2a9.9 9.9 0 00-8.4 15.15L2 22l4.98-1.3A9.9 9.9 0 1012.04 2zm0 1.8a8.1 8.1 0 11-4.13 15.06l-.3-.18-2.95.77.79-2.87-.2-.3A8.1 8.1 0 0112.04 3.8z" />
      </svg>
      {l.wa}
    </a>
  );
  const line = (
    <a
      key="line"
      href={siteConfig.contact.line}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LINE chat"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755] px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition active:scale-[0.97]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.56 7.39 8.37 8.03.33.07.77.22.88.5.1.26.06.66.03.92l-.14.86c-.04.26-.2 1.02.9.56 1.1-.46 5.95-3.5 8.12-5.99C21.4 13.4 22 11.86 22 10.13 22 5.64 17.52 2 12 2z" />
      </svg>
      {l.line}
    </a>
  );

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex gap-2 pb-[env(safe-area-inset-bottom)] motion-safe:animate-[fc-in_.4s_ease-out] md:hidden"
      role="group"
      aria-label="Consultation"
    >
      <style>{`@keyframes fc-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {lineFirst ? [line, wa] : [wa, line]}
    </div>
  );
}
