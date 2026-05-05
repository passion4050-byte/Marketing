import type { Metadata } from "next";
import { Lock, AlertCircle, Info } from "lucide-react";
import { loginAction } from "./actions";
import { isAdminConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "관리자 로그인 — 메디맵",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { from?: string; error?: string; setup?: string };
}) {
  const setup = searchParams?.setup === "1" || !isAdminConfigured();
  const errorCode = searchParams?.error;
  const from = searchParams?.from ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FB] px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white text-[24px] font-extrabold shadow-cta">
            M
          </div>
          <h1 className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">
            메디맵 관리자
          </h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            인증 후 어드민 콘솔로 진입합니다.
          </p>
        </div>

        <div className="rounded-card bg-white p-7 shadow-card md:p-8">
          {setup ? (
            <SetupNotice />
          ) : (
            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="from" value={from} />
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
              {errorCode === "invalid" && (
                <div className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-3 text-[12.5px] text-red-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  비밀번호가 일치하지 않습니다.
                </div>
              )}
              {errorCode === "missing" && (
                <div className="flex items-start gap-2 rounded-card border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  비밀번호를 입력해주세요.
                </div>
              )}
              <button
                type="submit"
                className="mt-2 w-full rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3 text-[14px] font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
              >
                로그인
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="space-y-3 text-[13px] text-ink-muted">
      <div className="flex items-start gap-2 rounded-card border border-amber-200 bg-amber-50 p-3 text-amber-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">어드민 비밀번호 미설정</div>
          <p className="mt-1 text-amber-700/90">
            Vercel 환경변수에 <code className="rounded bg-white/70 px-1 font-mono">ADMIN_PASSWORD</code>{" "}
            를 설정한 뒤 재배포 해주세요.
          </p>
        </div>
      </div>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>
          Vercel 프로젝트 → Settings → Environment Variables 에서{" "}
          <code className="rounded bg-surface-alt px-1 font-mono">ADMIN_PASSWORD</code>{" "}
          추가
        </li>
        <li>
          (권장)
          <code className="ml-1 rounded bg-surface-alt px-1 font-mono">ADMIN_SESSION_SECRET</code>{" "}
          도 함께 추가 (랜덤 문자열)
        </li>
        <li>
          Production / Preview / Development 모두 적용 후 redeploy
        </li>
        <li>
          이 페이지 새로고침 → 로그인 폼이 노출됩니다
        </li>
      </ol>
    </div>
  );
}
