import { siteConfig } from "@/lib/site";

/**
 * 해외(en/ja/zh) 상담 CTA — WhatsApp + LINE. 국내는 카카오(별도).
 * 링크는 siteConfig.contact.whatsapp / .line (Vercel env 로 주입).
 *
 * Round 145c (2026-08-14) — 로케일별 채널 우선순위.
 *   일본 시장은 LINE 이 지배 채널 → lang="ja" 면 LINE 을 첫 번째(주 CTA)로.
 *   그 외(en/zh)는 WhatsApp 우선 유지. (페르소나 E2E 감사 #6)
 */
export function ContactButtons({
  waLabel,
  lineLabel = "LINE",
  lang,
  size = "md",
  className = "",
}: {
  waLabel?: string;
  lineLabel?: string;
  lang?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const pad = size === "lg" ? "px-8 py-4" : "px-6 py-3";
  const lineFirst = lang === "ja";

  const wa = (
    <a
      key="wa"
      href={siteConfig.contact.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp chat"
      className={`inline-flex items-center gap-2 rounded-full bg-[#25D366] ${pad} text-sm font-bold text-white transition hover:brightness-95 active:scale-[0.98]`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12.04 2a9.9 9.9 0 00-8.4 15.15L2 22l4.98-1.3A9.9 9.9 0 1012.04 2zm0 1.8a8.1 8.1 0 11-4.13 15.06l-.3-.18-2.95.77.79-2.87-.2-.3A8.1 8.1 0 0112.04 3.8zm4.66 11.49c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.13-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29z" />
      </svg>
      {waLabel ?? "WhatsApp"}
    </a>
  );

  const line = (
    <a
      key="line"
      href={siteConfig.contact.line}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LINE chat"
      className={`inline-flex items-center gap-2 rounded-full bg-[#06C755] ${pad} text-sm font-bold text-white transition hover:brightness-95 active:scale-[0.98]`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.02 3.56 7.39 8.37 8.03.33.07.77.22.88.5.1.26.06.66.03.92l-.14.86c-.04.26-.2 1.02.9.56 1.1-.46 5.95-3.5 8.12-5.99C21.4 13.4 22 11.86 22 10.13 22 5.64 17.52 2 12 2zM8.2 12.67H6.6c-.24 0-.43-.19-.43-.43V8.9c0-.24.19-.43.43-.43.24 0 .43.19.43.43v2.92H8.2c.24 0 .43.19.43.43s-.19.42-.43.42zm1.68-.43c0 .24-.19.43-.43.43a.43.43 0 01-.43-.43V8.9c0-.24.19-.43.43-.43.24 0 .43.19.43.43v3.34zm4.02 0c0 .18-.12.35-.3.41a.44.44 0 01-.49-.16l-1.65-2.25v2c0 .24-.19.43-.43.43a.43.43 0 01-.43-.43V8.9c0-.18.12-.35.3-.41a.43.43 0 01.49.16l1.65 2.25v-2c0-.24.19-.43.43-.43.24 0 .43.19.43.43v3.34zm2.77-2.1c.24 0 .43.19.43.43s-.19.43-.43.43h-1.17v.75h1.17c.24 0 .43.19.43.43s-.19.42-.43.42h-1.6a.43.43 0 01-.43-.42V8.9c0-.24.19-.43.43-.43h1.6c.24 0 .43.19.43.43s-.19.43-.43.43h-1.17v.75h1.17z" />
      </svg>
      {lineLabel}
    </a>
  );

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {lineFirst ? [line, wa] : [wa, line]}
    </div>
  );
}
