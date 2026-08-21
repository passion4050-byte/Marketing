"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";

const LANGS = [
  { code: "ko", label: "한국어", short: "KO" },
  { code: "en", label: "English", short: "EN" },
  { code: "ja", label: "日本語", short: "JA" },
  { code: "zh", label: "简体中文", short: "ZH" },
  // Round 159b — 대만(번체) 추가. hreflang 은 zh-Hant.
  { code: "tw", label: "繁體中文", short: "TW" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];

/**
 * 현재 경로를 기준으로 각 언어의 대응 URL을 계산.
 *   - 해외 가이드 `/{lang}/guides/{slug}` 는 같은 slug 로 언어 교체(ko 는 대응 가이드 없음 → 홈).
 *   - 홈/기타 해외 페이지 → 해당 언어 홈.
 *   - 국내(prefix 없음) → 해외는 각 언어 홈, ko 는 현재 경로 유지.
 */
function targetPath(pathname: string, code: LangCode): string {
  const m = pathname.match(/^\/(en|ja|zh|tw)(\/.*)?$/);
  const curLang: LangCode = m ? (m[1] as LangCode) : "ko";
  const rest = m ? m[2] || "" : "";
  if (code === curLang) return pathname;

  // 해외 가이드는 같은 slug 로 언어만 교체
  if (rest.startsWith("/guides/")) {
    return code === "ko" ? "/" : `/${code}${rest}`;
  }
  // 🔴 Round 169 — 클리닉 경로 맥락 유지.
  //   기존엔 /guides/ 가 아니면 전부 홈으로 보내서, /en/clinics/eyeclinic/brighteye 에서
  //   언어를 바꾸면 **B2B 국내 홈**으로 튕겼다(해외 방문자 재유입 차단).
  //   /clinics/ 는 언어별로 동일 구조라 경로를 그대로 유지한다.
  if (rest.startsWith("/clinics")) {
    // ko 에는 대응 경로가 /with-partners 뿐이므로 목록으로 보낸다(홈보다 맥락이 가깝다)
    return code === "ko" ? "/with-partners" : `/${code}${rest}`;
  }
  // 그 외: 각 언어 홈 (ko 는 루트)
  return code === "ko" ? "/" : `/${code}`;
}

function useCurLang(pathname: string): LangCode {
  const m = pathname.match(/^\/(en|ja|zh|tw)(\/.*)?$/);
  return m ? (m[1] as LangCode) : "ko";
}

/**
 * variant:
 *   - "light" | "dark": 헤더/푸터용 드롭다운. 트리거에 네이티브 라벨(中文/日本語…)을 노출해
 *     외국인 방문자가 "언어 전환"임을 직관적으로 인지하도록 함.
 *   - "inline": 아티클 타이틀 영역용. 4개 언어를 pill 로 나란히 노출(드롭다운 없이 한 번에).
 */
export function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark" | "inline";
}) {
  const pathname = usePathname() || "/";
  const curLang = useCurLang(pathname);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // 아티클 타이틀 영역 — pill 나열형(가장 직관적)
  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Language">
        <Globe className="mr-0.5 h-3.5 w-3.5 text-stone-400" />
        {LANGS.map((l) => {
          const active = l.code === curLang;
          return (
            <Link
              key={l.code}
              href={targetPath(pathname, l.code)}
              lang={l.code}
              hrefLang={l.code === "zh" ? "zh-Hans" : l.code === "tw" ? "zh-Hant" : l.code}
              aria-current={active ? "true" : undefined}
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
                active
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    );
  }

  const current = LANGS.find((l) => l.code === curLang) ?? LANGS[0];
  const trigger =
    variant === "dark"
      ? "border-white/25 text-white/90 hover:bg-white/10"
      : "border-stone-300 text-stone-700 hover:bg-stone-100";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border min-h-[44px] px-3 text-xs font-semibold transition ${trigger}`}
      >
        <Globe className="h-3.5 w-3.5" />
        {current.label}
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-none border border-stone-200 bg-white py-1 shadow-[0_14px_34px_-20px_rgba(0,0,0,0.4)] md:w-40"
        >
          {LANGS.map((l) => {
            const active = l.code === curLang;
            return (
              <Link
                key={l.code}
                href={targetPath(pathname, l.code)}
                onClick={() => setOpen(false)}
                className={`flex min-h-[48px] items-center justify-between px-4 text-[15px] transition active:bg-stone-100 md:min-h-[44px] md:text-sm md:hover:bg-stone-50 ${
                  active ? "font-bold text-stone-900" : "text-stone-600"
                }`}
                lang={l.code}
                hrefLang={l.code === "zh" ? "zh-Hans" : l.code === "tw" ? "zh-Hant" : l.code}
              >
                {l.label}
                {active && <Check className="h-3.5 w-3.5 text-stone-900" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
