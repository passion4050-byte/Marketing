'use client';

/**
 * Round 147 — 병원 클라이언트 포털 계정 관리 (어드민).
 * 계정 발급 → 평문 비밀번호 1회 표시(복사 버튼) → 병원에 전달.
 * 재발급/비활성화 지원. 비밀번호는 DB 에 해시만 저장되어 다시 볼 수 없음.
 */
import { useCallback, useEffect, useState } from 'react';

interface AccountRow {
  id: number;
  tenantId: number;
  tenantName: string;
  username: string;
  displayName: string | null;
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

interface TenantOpt {
  id: number;
  name: string;
}

export function ClientAccounts({ tenants }: { tenants: TenantOpt[] }) {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 발급 폼
  const [tenantId, setTenantId] = useState<string>('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  // 발급 결과 (평문 1회 표시)
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/client-accounts');
      const json = (await res.json()) as { ok?: boolean; accounts?: AccountRow[]; error?: string };
      if (json.ok) setAccounts(json.accounts ?? []);
      else setError(json.error ?? '목록을 불러오지 못했습니다.');
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setIssued(null);
    try {
      const res = await fetch('/api/admin/client-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: Number(tenantId), username, displayName }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        username?: string;
        password?: string;
        error?: string;
      };
      if (!json.ok) {
        setError(json.error ?? '발급 실패');
        return;
      }
      setIssued({ username: json.username ?? username, password: json.password ?? '' });
      setUsername('');
      setDisplayName('');
      void load();
    } catch {
      setError('네트워크 오류');
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: number, action: 'toggle' | 'reset') {
    if (action === 'reset' && !window.confirm('비밀번호를 재발급할까요? 기존 비밀번호는 즉시 무효화됩니다.')) {
      return;
    }
    const res = await fetch('/api/admin/client-accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const json = (await res.json()) as { ok?: boolean; password?: string; error?: string };
    if (!json.ok) {
      setError(json.error ?? '요청 실패');
      return;
    }
    if (action === 'reset' && json.password) {
      const acc = accounts.find((a) => a.id === id);
      setIssued({ username: acc?.username ?? '', password: json.password });
    }
    void load();
  }

  async function copyIssued() {
    if (!issued) return;
    const text = `위서클 병원 관리자 콘솔\n주소: ${window.location.origin}/client/login\n아이디: ${issued.username}\n비밀번호: ${issued.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      {/* 발급 폼 */}
      <form onSubmit={create} className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-bold text-ink">새 계정 발급</h2>
        <p className="mt-1 text-xs text-ink-subtle">
          병원(테넌트)을 선택하고 아이디를 정하면 비밀번호가 자동 생성됩니다. 비밀번호는 발급
          직후 한 번만 표시됩니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
            className="rounded-lg border border-line px-3 py-2 text-sm"
          >
            <option value="">병원 선택</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디 (영문/숫자 4자+)"
            required
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="담당자명 (선택)"
            className="rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creating || !tenantId || !username}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-40"
          >
            {creating ? '발급 중…' : '계정 발급'}
          </button>
        </div>
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
        {issued ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
              발급 완료 — 아래 정보는 지금만 표시됩니다. 복사해서 병원에 전달하세요.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono">
                ID: <b>{issued.username}</b>
              </span>
              <span className="font-mono">
                PW: <b>{issued.password}</b>
              </span>
              <button
                type="button"
                onClick={copyIssued}
                className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                {copied ? '복사됨 ✓' : '접속정보 복사'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700">
              로그인 주소: 이 콘솔과 같은 도메인의 /client/login
            </p>
          </div>
        ) : null}
      </form>

      {/* 계정 목록 */}
      <div className="rounded-2xl border border-line/70 bg-white shadow-soft">
        <div className="border-b border-line/60 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">
            발급된 계정 <span className="tabular-nums text-ink-subtle">{accounts.length}</span>
          </h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-ink-subtle">불러오는 중…</p>
        ) : accounts.length === 0 ? (
          <p className="p-5 text-sm text-ink-subtle">발급된 계정이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line/60 text-left text-xs text-ink-subtle">
                  <th className="px-5 py-2.5 font-medium">병원</th>
                  <th className="px-3 py-2.5 font-medium">아이디</th>
                  <th className="px-3 py-2.5 font-medium">담당자</th>
                  <th className="px-3 py-2.5 font-medium">상태</th>
                  <th className="px-3 py-2.5 font-medium">최근 로그인</th>
                  <th className="px-3 py-2.5 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-line/40 last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{a.tenantName}</td>
                    <td className="px-3 py-3 font-mono text-xs">{a.username}</td>
                    <td className="px-3 py-3 text-ink-muted">{a.displayName ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          a.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {a.active ? '활성' : '중지'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums text-ink-subtle">
                      {a.lastLoginAt ? a.lastLoginAt.slice(0, 10) : '로그인 전'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => void patch(a.id, 'reset')}
                          className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted hover:border-ink hover:text-ink"
                        >
                          PW 재발급
                        </button>
                        <button
                          onClick={() => void patch(a.id, 'toggle')}
                          className="rounded-lg border border-line px-2 py-1 text-[11px] text-ink-muted hover:border-ink hover:text-ink"
                        >
                          {a.active ? '중지' : '활성화'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
