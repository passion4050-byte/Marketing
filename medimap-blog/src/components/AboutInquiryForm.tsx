"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

type Tab = "partnership" | "listing";

const TABS: { id: Tab; label: string }[] = [
  { id: "partnership", label: "비즈니스 제휴 문의" },
  { id: "listing", label: "병원 입점 문의" },
];

const SUBJECTS: Record<Tab, string> = {
  partnership: "[메디맵] 비즈니스 제휴 문의",
  listing: "[메디맵] 병원 입점 문의",
};

const PLACEHOLDERS: Record<Tab, { org: string; contact: string }> = {
  partnership: {
    org: "회사/기관명을 입력해주세요",
    contact: "담당자 성함을 입력해주세요",
  },
  listing: {
    org: "병원/의원명을 입력해주세요",
    contact: "원장님/담당자 성함을 입력해주세요",
  },
};

export function AboutInquiryForm() {
  const [tab, setTab] = useState<Tab>("partnership");
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = encodeURIComponent(SUBJECTS[tab]);
    const body = encodeURIComponent(
      [
        `구분: ${TABS.find((t) => t.id === tab)?.label}`,
        `기관/병원명: ${org}`,
        `담당자: ${contact}`,
        `연락처: ${phone}`,
        "",
        "문의 내용:",
        message,
      ].join("\n"),
    );
    window.location.href = `mailto:hello@medimap.kr?subject=${subject}&body=${body}`;
  }

  const ph = PLACEHOLDERS[tab];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card bg-white p-6 shadow-card md:p-8"
    >
      <div
        role="tablist"
        aria-label="문의 종류"
        className="flex gap-2 rounded-pill bg-surface-alt p-1"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-pill px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-white text-brand shadow-soft"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        <Field label="기관/병원명" htmlFor="org">
          <input
            id="org"
            type="text"
            required
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder={ph.org}
            className="form-input"
          />
        </Field>
        <Field label="담당자명" htmlFor="contact">
          <input
            id="contact"
            type="text"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={ph.contact}
            className="form-input"
          />
        </Field>
        <Field label="연락처" htmlFor="phone">
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="form-input"
          />
        </Field>
        <Field label="문의 내용" htmlFor="message">
          <textarea
            id="message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="문의하실 내용을 입력해주세요"
            className="form-input resize-none"
          />
        </Field>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-base font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
      >
        문의하기
        <Send size={16} />
      </button>
      <p className="mt-3 text-center text-[12px] text-ink-subtle">
        제출 시 기본 메일 앱이 열립니다. 영업일 기준 1~2일 내 회신드립니다.
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-semibold text-ink-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
