'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminKeywords as base, adminTenants, type KeywordRow } from '@/lib/admin-mock';
import { showToast } from '@/lib/clientActions';

export default function KeywordsPage() {
  const [rows, setRows] = useState<KeywordRow[]>(base);
  const [tenant, setTenant] = useState(adminTenants[0].id);
  const [keyword, setKeyword] = useState('');
  const [daily, setDaily] = useState(1);

  const add = () => {
    if (!keyword.trim()) return showToast('키워드를 입력하세요', { kind: 'error' });
    const t = adminTenants.find((x) => x.id === tenant)!;
    setRows((p) => [{
      id: `k-${Date.now()}`,
      tenantId: tenant,
      tenantName: t.name.split(' ')[0],
      keyword: keyword.trim(),
      dailyTarget: daily,
      status: 'active',
      performance: { mention7d: 0, ctr: 0 }
    }, ...p]);
    setKeyword('');
    showToast(`"${keyword}" 추가됨`);
  };

  const toggle = (id: string) => {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r)));
  };
  const remove = (id: string) => {
    if (!confirm('이 키워드를 삭제할까요?')) return;
    setRows((p) => p.filter((r) => r.id !== id));
    showToast('삭제됨');
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">키워드 풀 ({rows.length})</h1>
        <p className="mt-1 text-sm text-ink-muted">테넌트별 자동 생성 키워드 + daily target</p>
      </header>

      <div className="card mb-4 flex items-center gap-2 p-4">
        <select className="input-base max-w-[180px]" value={tenant} onChange={(e) => setTenant(e.target.value)}>
          {adminTenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input-base flex-1" placeholder="새 키워드 (예: 잠실 노안교정)" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input type="number" min={1} max={10} className="input-base w-20" value={daily} onChange={(e) => setDaily(parseInt(e.target.value) || 1)} />
        <button onClick={add} className="btn-primary text-xs"><Plus className="h-3.5 w-3.5" /> 추가</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">키워드</th>
              <th className="px-4 py-3 text-left">테넌트</th>
              <th className="px-4 py-3 text-right">일일 목표</th>
              <th className="px-4 py-3 text-right">7d 인용</th>
              <th className="px-4 py-3 text-right">CTR</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3 text-sm font-semibold text-ink">{r.keyword}</td>
                <td className="px-4 py-3 text-xs">{r.tenantName}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">{r.dailyTarget}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">{r.performance.mention7d}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">{r.performance.ctr}%</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(r.id)} className={r.status === 'active' ? 'chip-success' : 'chip-neutral'}>
                    {r.status === 'active' ? '활성' : '일시정지'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-status-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
