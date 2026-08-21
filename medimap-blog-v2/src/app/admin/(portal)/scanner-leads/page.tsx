'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

interface Lead {
  id: number;
  created_at: string;
  name: string | null;
  org: string | null;
  email: string | null;
  phone: string | null;
  url: string | null;
  domain: string | null;
  overall_score: number | null;
  compliance_status: string | null;
  message: string | null;
  lead_captured: boolean | null;
  source: string | null;
}

function fmt(dt: string): string {
  try { return new Date(dt).toLocaleString('ko-KR'); } catch { return dt; }
}

export default function ScannerLeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'captured' | 'all'>('captured');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scanner-leads', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setItems(data.leads ?? []);
    } catch (e) {
      showToast(`로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const captured = useMemo(() => items.filter((l) => l.lead_captured), [items]);
  const rows = tab === 'captured' ? captured : items;

  function toCsv() {
    const head = ['일시', '담당자', '병원/기관', '이메일', '전화', '진단URL', '점수', '의료법', '문의', '유형'];
    const lines = rows.map((l) => [
      fmt(l.created_at), l.name ?? '', l.org ?? '', l.email ?? '', l.phone ?? '',
      l.domain ?? l.url ?? '', l.overall_score ?? '', l.compliance_status ?? '',
      (l.message ?? '').replace(/[\r\n,]+/g, ' '), l.lead_captured ? '문의' : '스캔'
    ].join(','));
    const csv = '﻿' + [head.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `client-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    // Round 169 (2026-08-20) — 모바일: px-8 하드코딩 → 반응형(md+ 는 기존 px-8 복원)
    <div className="px-4 py-5 md:px-8 md:py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">클라이언트 문의 ({captured.length})</h1>
          <p className="admin-page-desc">무료 GEO Scanner 상담 폼으로 들어온 클라이언트 문의. 담당자·병원·연락처·진단 점수·문의를 한눈에.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toCsv} className="btn-secondary text-xs">CSV 내보내기</button>
          <button onClick={() => void load()} className="btn-secondary text-xs">새로고침</button>
        </div>
      </header>

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('captured')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'captured' ? 'bg-brand text-white' : 'bg-surface-muted text-ink-soft'}`}>
          문의 (폼 제출) ({captured.length})
        </button>
        <button onClick={() => setTab('all')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'all' ? 'bg-brand text-white' : 'bg-surface-muted text-ink-soft'}`}>
          전체 스캔 ({items.length})
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-1 py-6 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card mb-4 px-5 py-6 text-sm text-ink-soft">
          아직 {tab === 'captured' ? '클라이언트 문의가' : '스캔 기록이'} 없습니다. geo.wecircle.co.kr 스캐너에서 진단·상담 폼이 제출되면 여기에 쌓입니다.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-muted">
                <th className="px-3 py-2 font-semibold">일시</th>
                <th className="px-3 py-2 font-semibold">담당자</th>
                <th className="px-3 py-2 font-semibold">병원 · 기관</th>
                <th className="px-3 py-2 font-semibold">연락처</th>
                <th className="px-3 py-2 font-semibold">진단 대상</th>
                <th className="px-3 py-2 font-semibold">점수</th>
                <th className="px-3 py-2 font-semibold">의료법</th>
                <th className="px-3 py-2 font-semibold">문의</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-border/60 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-muted">{fmt(l.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink">{l.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{l.org ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-ink-soft">
                    {l.email && <div>{l.email}</div>}
                    {l.phone && <div>{l.phone}</div>}
                    {!l.email && !l.phone && '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-soft">{l.domain ?? l.url ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {typeof l.overall_score === 'number'
                      ? <span className="font-bold tabular-nums text-ink">{l.overall_score}</span>
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {l.compliance_status === 'fail' ? <span className="font-bold text-status-danger">금지</span>
                      : l.compliance_status === 'warn' ? <span className="font-bold text-status-warning">주의</span>
                      : l.compliance_status === 'pass' ? <span className="text-status-success">통과</span>
                      : '—'}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-xs text-ink-soft">{l.message ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
