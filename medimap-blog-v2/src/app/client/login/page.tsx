'use client';

/**
 * Round 147 — 병원 클라이언트 포털 로그인.
 * 어드민이 발급한 id/pw 로 로그인 (바비톡 병원관리자 모델).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? '로그인에 실패했습니다.');
        return;
      }
      router.replace('/client');
      router.refresh();
    } catch {
      setError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
            WECIRCLE Partner Console
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">병원 관리자 로그인</h1>
          <p className="mt-2 text-sm text-stone-500">
            위서클이 발급한 계정으로 로그인하세요.
          </p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <label className="block text-xs font-semibold text-stone-600">아이디</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            placeholder="발급받은 아이디"
          />
          <label className="mt-4 block text-xs font-semibold text-stone-600">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            placeholder="비밀번호"
          />
          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-5 w-full rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-40"
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400">
            계정이 없거나 비밀번호를 잊으셨나요?
            <br />
            위서클 담당자에게 재발급을 요청해 주세요.
          </p>
        </form>
      </div>
    </main>
  );
}
