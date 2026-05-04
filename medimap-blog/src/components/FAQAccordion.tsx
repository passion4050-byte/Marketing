"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="my-10 divide-y divide-line rounded-card border border-line bg-white">
      {items.map((item, idx) => (
        <FAQRow key={idx} {...item} />
      ))}
    </div>
  );
}

function FAQRow({ question, answer }: FAQItem) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-ink">Q. {question}</span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-ink-subtle transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm leading-relaxed text-ink-muted">
          <span className="font-semibold text-brand">A. </span>
          {answer}
        </div>
      )}
    </div>
  );
}
