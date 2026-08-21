"use client";

import { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Builds a TOC from h2/h3 elements in the article and highlights the active one
 * via IntersectionObserver. Hidden on mobile (use CSS to opt-in on lg+).
 */
export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;
    // 🔴 Round 169 — 발행 파이프라인이 heading 에 id 를 주입하지 않아 `h2[id]` 셀렉터가
    //   항상 0개를 반환했다(= TOC 가 데스크톱에서도 실질 미작동). 없으면 여기서 생성한다.
    const all = Array.from(article.querySelectorAll<HTMLElement>("h2, h3"));
    const used = new Set<string>();
    all.forEach((el, i) => {
      if (el.id) {
        used.add(el.id);
        return;
      }
      const base =
        (el.innerText || "")
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .replace(/\s+/g, "-")
          .slice(0, 40) || `section-${i + 1}`;
      let id = base;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      el.id = id;
    });
    const els = all;
    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.innerText,
        level: Number(el.tagName.replace("H", "")),
      })),
    );

    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (headings.length < 2) return null;

  return (
    <>
      {/* 🔴 Round 169 — 모바일 접이식 목차.
          파트너 글 실측 11,601px = 18.2 스크린인데 "지금 어디쯤인지 / 회복기간 섹션이 어디인지"
          알 방법이 0 이었다(TOC 는 xl 이상 전용). 헤더 아래 sticky 로 붙여 항상 접근 가능하게.
          기본은 접힘 — 본문 리듬을 방해하지 않고, 필요할 때만 펼친다. */}
      <details className="not-prose sticky top-[57px] z-20 mb-8 border-y border-stone-200 bg-[#FAFAF7]/95 backdrop-blur xl:hidden">
        <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-1 text-[13px] font-bold tracking-tight text-stone-800 [&::-webkit-details-marker]:hidden">
          <span>이 글의 목차 · {headings.length}개 섹션</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <ul className="max-h-[45vh] space-y-0.5 overflow-y-auto pb-3">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={`flex min-h-[44px] items-center border-l-2 text-[14px] leading-snug transition ${
                  h.level === 3 ? "pl-6 text-stone-500" : "pl-3 text-stone-700"
                } ${activeId === h.id ? "border-stone-900 font-bold text-stone-950" : "border-transparent"}`}
                style={{ wordBreak: "keep-all" }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </details>

      <aside
        className="hidden xl:block"
        aria-label="이 글의 목차"
      >
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-subtle">
          이 글의 목차
        </div>
        <ul className="mt-3 space-y-1.5 border-l border-line pl-4 text-sm">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <li
                key={h.id}
                className={h.level === 3 ? "ml-3" : ""}
              >
                <a
                  href={`#${h.id}`}
                  className={`block rounded py-1 transition ${
                    active
                      ? "font-semibold text-stone-900"
                      : "text-ink-muted hover:text-stone-900"
                  }`}
                  style={{
                    borderLeft: active ? "2px solid var(--color-brand)" : undefined,
                    marginLeft: active ? -17 : undefined,
                    paddingLeft: active ? 15 : undefined,
                  }}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      </aside>
    </>
  );
}
