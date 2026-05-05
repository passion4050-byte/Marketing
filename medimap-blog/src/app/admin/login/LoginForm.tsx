"use client";

import { useState, type FormEvent } from "react";
import { Lock, AlertCircle } from "lucide-react";

/**
 * Client-side login form — fetch /api/admin/login → window.location.assign().
 *
 * 이전에는 server action + form action 패턴을 썼지만, Next.js 14.2 + Vercel
 * 환경에서 cookies.set() + redirect() 조합이 RSC navigation 을 trigger 하지 못해
 * 로그인 후 /admin 으로 이동이 안 되는 이슈가 있어 hard navigate 패턴으로 교체.
 */
export function LoginForm({ from }: { from: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "").trim();
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        if (res.status === 401 || data.error === "invalid") {
          setError("비밀번호가 일치하지 않습니다.");
        } else if (res.status === 503 || data.error === "setup") {
          setError("어드민 비밀번호가 설정되지 않았습니다. ADMIN_PASSWORD env 확인 필요.");
        } else if (data.error === "missing") {
          setError("비밀번호를 입력해주세요.");
        } else {
          setError(`로그인 실패 (HTTP ${res.status}).`);
        }
        setLoading(false);
        return;
      }
      // Hard navigation: 다음 요청에 새 cookie 가 포함되어야 middleware 가 검증 통과.
      const dest = from && from.startsWith("/admin") ? from : "/admin";
      window.location.assign(dest);
    } catch {
      setError("네트워크 오류. 잠시 후 다시 시도해주세요.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted"
        >
          <Lock size={13} /> 비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          required
          placeholder="ADMIN_PASSWORD"
          className="form-input"
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3 text-[14px] font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
