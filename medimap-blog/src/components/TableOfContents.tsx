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
    const els = Array.from(
      article.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
    );
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
                      ? "font-semibold text-brand"
                      : "text-ink-muted hover:text-brand"
                  }`}
                  style={{
                    borderLeft: active ? "2px solid #0057FF" : undefined,
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
  );
}
