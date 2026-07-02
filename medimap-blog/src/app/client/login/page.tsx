"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, KeyRound, ArrowRight } from "lucide-react";

export default function ClientLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        window.location.assign("/client");
      } else {
        const data = await r.json().catch(() => ({}));
        setErr(
          data.error === "invalid" ? "비밀번호가 올바르지 않습니다." :
          data.error === "setup" ? "CLIENT_PASSWORD 환경변수가 설정되지 않았습니다." :
          "로그인 실패. 잠시 후 다시 시도해주세요.",
        );
      }
    } catch {
      setErr("네트워크 오류. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/5 via-white to-accent/5 px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wecircle-logo.svg" alt="WECIRCLE" width={134} height={22} className="h-7 w-auto" />
        </Link>
        <div className="rounded-card border border-line bg-white p-8 shadow-card">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Building2 size={22} />
            </div>
            <h1 className="mt-4 text-[20px] font-bold tracking-tight text-ink">클라이언트 포털 로그인</h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              위서클에서 발급한 비밀번호를 입력해주세요.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-muted">비밀번호</span>
              <div className="mt-1 relative">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                <input
                  type="password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="form-input pl-9"
                />
              </div>
            </label>
            {err && (
              <div className="rounded-card border border-status-danger/40 bg-status-danger/5 px-3 py-2 text-[12.5px] text-status-danger">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-brand px-5 py-3 text-[14px] font-semibold text-white shadow-cta transition hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? "확인 중…" : (<>로그인 <ArrowRight size={14} /></>)}
            </button>
          </form>
          <div className="mt-6 text-center text-[11.5px] text-ink-subtle">
            비밀번호 분실 시 위서클 운영팀에 문의해주세요 — sales@medimap.team
          </div>
        </div>
        <Link href="/" className="mt-6 block text-center text-[12px] text-ink-muted hover:text-brand">
          ← 위서클 홈으로
        </Link>
      </div>
    </div>
  );
}
