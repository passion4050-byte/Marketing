'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'login failed');
      showToast('로그인 성공');
      router.push('/admin');
    } catch (err) {
      showToast(`로그인 실패: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-surface-base to-accent-soft px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-card">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink">MEDIMAP GEO 어드민</h1>
          <p className="mt-1 text-xs text-ink-muted">메디맵 운영자 전용 콘솔</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">비밀번호</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-base px-3">
              <Lock className="h-4 w-4 text-ink-muted" />
              <input
                type="password"
                className="flex-1 bg-transparent py-2 text-sm outline-none"
                placeholder="ADMIN_PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
          <p className="text-[11px] text-ink-faint">
            ADMIN_PASSWORD env 미설정 시 모든 접근 허용 (dev 모드).
          </p>
        </form>
      </div>
    </div>
  );
}
