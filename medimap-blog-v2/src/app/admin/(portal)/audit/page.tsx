'use client';

import { auditLog } from '@/lib/admin-mock';
import { cn } from '@/lib/cn';

export default function AuditPage() {
  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">감사 로그 (Audit Log)</h1>
        <p className="mt-1 text-sm text-ink-muted">모든 변경 이력 — 의료법 분쟁 시 증거 자료</p>
      </header>

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
            {auditLog.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{new Date(a.at).toLocaleString('ko-KR')}</td>
                <td className="px-4 py-3 text-xs">{a.actor}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    a.action.includes('publish') ? 'bg-status-successSoft text-status-success' :
                    a.action.includes('delete') ? 'bg-status-dangerSoft text-status-danger' :
                    'bg-brand-50 text-brand-700'
                  )}>{a.action}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-soft">{a.resource}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">{a.diff ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
