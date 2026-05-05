"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

type Tab = "partnership" | "listing";
type Status = "idle" | "sending" | "success" | "error";

const TABS: { id: Tab; label: string }[] = [
  { id: "partnership", label: "비즈니스 제휴 문의" },
  { id: "listing", label: "병원 입점 문의" },
];

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
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/inquiry/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form_type: tab,
          org_name: org,
          contact_name: contact,
          phone,
          message,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(humanizeError(data.error, res.status));
      }
      setStatus("success");
      setOrg("");
      setContact("");
      setPhone("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
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
        disabled={status === "sending"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-base font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === "sending" ? "전송 중…" : "문의하기"}
        {status !== "sending" && <Send size={16} />}
      </button>

      {status === "success" && (
        <div className="mt-4 flex items-start gap-2.5 rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <div className="font-semibold">문의가 접수되었습니다.</div>
            <div className="mt-0.5 text-emerald-700/80">
              영업일 기준 1~2일 내 회신드립니다.
            </div>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-2.5 rounded-card border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <div className="font-semibold">전송 실패</div>
            <div className="mt-0.5 text-red-700/80">
              {errorMsg ?? "잠시 후 다시 시도해주세요."}
            </div>
          </div>
        </div>
      )}
      {status === "idle" && (
        <p className="mt-3 text-center text-[12px] text-ink-subtle">
          영업일 기준 1~2일 내 회신드립니다.
        </p>
      )}
    </form>
  );
}

function humanizeError(code: string | undefined, status: number): string {
  switch (code) {
    case "database-unconfigured":
      return "시스템 점검 중입니다. 잠시 후 다시 시도해주세요.";
    case "missing-fields":
      return "필수 입력값을 모두 채워주세요.";
    case "insert-failed":
      return "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    case "invalid-json":
      return "요청을 처리하지 못했습니다. 페이지를 새로고침 후 다시 시도해주세요.";
    default:
      return `전송에 실패했습니다 (HTTP ${status}).`;
  }
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
