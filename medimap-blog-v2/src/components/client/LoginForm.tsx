'use client';

/**
 * Round 148-d — 병원 클라이언트 로그인 폼 (분리).
 * /c/{code} 고유링크로 진입하면 initialUsername·hospitalName 이 프리필된다.
 * (useSearchParams 대신 서버 page 가 props 로 내려줌 — Suspense 바운더리 불필요.)
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm({
  initialUsername = '',
  hospitalName = '',
}: {
  initialUsername?: string;
  hospitalName?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
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
          {hospitalName ? (
            <p className="mt-2 text-[15px] font-semibold text-stone-700">{hospitalName} 전용 콘솔</p>
          ) : null}
          <p className="mt-2 text-[14px] leading-relaxed text-stone-500">위서클이 발급한 계정으로 로그인하세요.</p>
        </div>
        <form onSubmit={submit} className="rounded-none border border-stone-200 bg-white p-6">
          <label className="block text-xs font-semibold text-stone-600">아이디</label>
          {/* Round 169 — iOS 자동 대문자 변환으로 발급 아이디가 계속 튕기던 문제.
              autoCapitalize/autoCorrect 차단 + name 부여로 키체인 자동입력 활성화.
              (비밀번호가 랜덤 10자라 자동입력이 안 되면 사실상 로그인 불가) */}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-1.5 min-h-[48px] w-full rounded-none border border-stone-300 px-3 text-base outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            placeholder="발급받은 아이디"
          />
          <label className="mt-4 block text-xs font-semibold text-stone-600">비밀번호</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={Boolean(initialUsername)}
            className="mt-1.5 min-h-[48px] w-full rounded-none border border-stone-300 px-3 text-base outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            placeholder="비밀번호"
          />
          {error ? (
            <p className="mt-3 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-5 min-h-[50px] w-full rounded-none bg-stone-900 text-base font-semibold text-white transition active:bg-stone-700 disabled:opacity-40"
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400">
            {initialUsername
              ? '계정이 없거나 비밀번호를 잊으셨나요? 위서클 담당자에게 재발급을 요청해 주세요.'
              : '받으신 병원 전용 링크(/c/…)로 접속하면 아이디가 자동으로 채워집니다. 비밀번호 재발급은 위서클 담당자에게 요청해 주세요.'}
          </p>
        </form>
      </div>
    </main>
  );
}
