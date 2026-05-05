"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="my-10 divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {items.map((item, idx) => (
        <FAQRow key={idx} {...item} />
      ))}
    </div>
  );
}

function FAQRow({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? "bg-surface-alt/40" : ""}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-surface-alt/60"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-ink">
          <span className="mr-2 text-brand">Q.</span>
          {question}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-line bg-white text-ink-subtle transition-transform duration-200 ${
            open ? "rotate-180 border-brand-200 text-brand" : ""
          }`}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="px-6 pb-5 text-sm leading-relaxed text-ink-muted">
            <span className="font-semibold text-brand">A. </span>
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
