'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  resource: string | null;
  diff: unknown;
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit?limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setItems(data.items ?? []);
    } catch (e) {
      showToast(`로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">감사 로그 (Audit Log) ({items.length})</h1>
          <p className="admin-page-desc">어드민이 수행한 모든 작업 기록 (클라이언트 · 키워드 · 콘텐츠 변경 이력)</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary text-xs">새로고침</button>
      </header>

      {!loading && items.length === 0 && (
        <div className="card mb-4 px-5 py-4 text-xs text-ink-soft">
          아직 기록된 감사 로그가 없습니다. admin 액션 hook (tenants/keywords/content-queue CRUD)
          은 다음 라운드에 INSERT 추가 예정 — 그 후부터 자동으로 이 페이지에 누적됩니다.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">시각</th>
              <th className="px-4 py-3 text-left">주체</th>
              <th className="px-4 py-3 text-left">액션</th>
              <th className="px-4 py-3 text-left">대상</th>
              <th className="px-4 py-3 text-left">변경</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-ink-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" /><div className="mt-2">로드 중…</div>
              </td></tr>
            )}
            {items.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                  {a.at ? new Date(a.at).toLocaleString('ko-KR') : '—'}
                </td>
                <td className="px-4 py-3 text-xs">{a.actor}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    a.action.includes('publish') ? 'bg-status-successSoft text-status-success' :
                    a.action.includes('delete') ? 'bg-status-dangerSoft text-status-danger' :
                    'bg-surface-muted text-ink'
                  )}>{a.action}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-soft">{a.resource ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                  {a.diff ? <span title={JSON.stringify(a.diff)}>{JSON.stringify(a.diff).slice(0, 60)}…</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
