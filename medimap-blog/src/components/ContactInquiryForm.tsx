"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

type Status = "idle" | "sending" | "success" | "error";

export function ContactInquiryForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
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
          form_type: "contact",
          org_name: company || "(미기재)",
          contact_name: name,
          phone,
          email,
          message: subject ? `[${subject}]\n${message}` : message,
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
      setName("");
      setCompany("");
      setPhone("");
      setEmail("");
      setSubject("");
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card bg-white p-7 shadow-card md:p-9"
    >
      <h3 className="text-2xl font-bold tracking-tight text-ink">문의하기</h3>
      <p className="mt-2 text-[14px] text-ink-muted">
        아래 양식을 작성해 주시면 빠르게 답변 드리겠습니다.
      </p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="이름" htmlFor="name" required>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="form-input"
            />
          </Field>
          <Field label="회사명" htmlFor="company">
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="(선택) 회사 또는 병원명"
              className="form-input"
            />
          </Field>
        </div>
        <Field label="연락처" htmlFor="phone" required>
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
        <Field label="이메일" htmlFor="email" required>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="form-input"
          />
        </Field>
        <Field label="제목" htmlFor="subject" required>
          <input
            id="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="문의 제목을 입력해주세요"
            className="form-input"
          />
        </Field>
        <Field label="메시지" htmlFor="message" required>
          <textarea
            id="message"
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="문의 내용을 자세히 입력해주세요"
            className="form-input resize-none"
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-base font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
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
              영업일 기준 1~2일 내에 회신 드리겠습니다.
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
          영업일 기준 1~2일 내 회신
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
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-ink-muted"
      >
        {label}
        {required && <span className="text-brand">*</span>}
      </label>
      {children}
    </div>
  );
}
