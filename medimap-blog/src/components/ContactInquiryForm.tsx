"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

export function ContactInquiryForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subj = encodeURIComponent(`[메디맵 문의] ${subject || "제휴/광고 문의"}`);
    const body = encodeURIComponent(
      [
        `이름: ${name}`,
        `회사명: ${company}`,
        `연락처: ${phone}`,
        `이메일: ${email}`,
        `제목: ${subject}`,
        "",
        "메시지:",
        message,
      ].join("\n"),
    );
    window.location.href = `mailto:cs@medimap.co.kr?subject=${subj}&body=${body}`;
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
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3.5 text-base font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
      >
        문의하기
        <Send size={16} />
      </button>
      <p className="mt-3 text-center text-[12px] text-ink-subtle">
        제출 시 기본 메일 앱이 열립니다 · 영업일 기준 1~2일 내 회신
      </p>
    </form>
  );
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
