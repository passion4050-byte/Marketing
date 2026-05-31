'use client';

import { useState } from 'react';
import { Beaker, Plus, Trophy, X } from 'lucide-react';
import { MockBanner } from '@/components/admin/MockBanner';
import { abTests as base, adminTenants, type AbTest } from '@/lib/admin-mock';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

export default function AbTestsPage() {
  const [tests, setTests] = useState<AbTest[]>(base);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Partial<AbTest>>({});

  const conclude = (id: string, winner: 'A' | 'B' | 'tie') => {
    setTests((p) => p.map((t) => (t.id === id ? { ...t, status: 'concluded', winner } : t)));
    showToast(`테스트 종료 — 승자: ${winner === 'tie' ? '동률' : `변형 ${winner}`}`);
  };

  const create = () => {
    if (!draft.keyword?.trim() || !draft.hypothesis?.trim()) {
      return showToast('키워드와 가설은 필수', { kind: 'error' });
    }
    const t = adminTenants.find((x) => x.id === draft.tenantId) ?? adminTenants[0];
    setTests((p) => [{
      id: `ab-${Date.now()}`,
      tenantId: t.id,
      tenantName: t.name.split(' ')[0],
      keyword: draft.keyword!,
      hypothesis: draft.hypothesis!,
      variantA: { title: '', cta: '', metric: { mentions: 0, clicks: 0, inquiries: 0 } },
      variantB: { title: '', cta: '', metric: { mentions: 0, clicks: 0, inquiries: 0 } },
      startedAt: new Date().toISOString().slice(0, 10),
      status: 'running'
    }, ...p]);
    setShowNew(false);
    setDraft({});
    showToast('A/B 테스트 생성됨 — 콘텐츠 큐에서 변형 2개 작성하세요');
  };

  return (
    <div className="px-8 py-6">
      <MockBanner source="자동발행 cron 의 A/B 변형 생성 + 측정" />
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">A/B 콘텐츠 테스트 ({tests.length})</h1>
          <p className="admin-page-desc">A/B 콘텐츠 변형을 자동 생성해 AI 인용 효과를 비교합니다</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 신규 테스트
        </button>
      </header>

      <div className="space-y-3">
        {tests.map((t) => {
          const totalA = t.variantA.metric.mentions + t.variantA.metric.clicks;
          const totalB = t.variantB.metric.mentions + t.variantB.metric.clicks;
          const lift = totalA > 0 ? ((totalB - totalA) / totalA) * 100 : 0;
          const confidence = Math.min(95, Math.abs(lift) * 1.8 + 50); // 단순화된 신뢰도

          return (
            <div key={t.id} className="card p-5">
              <header className="flex items-start justify-between gap-3 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-brand-700" />
                    <span className="chip-brand">{t.tenantName}</span>
                    <span className="text-sm font-bold text-ink">{t.keyword}</span>
                    {t.status === 'running' && <span className="chip-warning animate-pulse">진행 중</span>}
                    {t.status === 'concluded' && t.winner && (
                      <span className="chip-success inline-flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> 승자 {t.winner}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs italic text-ink-muted">"{t.hypothesis}"</p>
                </div>
                <span className="text-[11px] text-ink-muted">시작 {t.startedAt}</span>
              </header>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {(['A', 'B'] as const).map((v) => {
                  const data = v === 'A' ? t.variantA : t.variantB;
                  const isWinner = t.winner === v;
                  return (
                    <div
                      key={v}
                      className={cn(
                        'rounded-lg border-2 p-3',
                        isWinner ? 'border-status-success bg-status-successSoft/30' : 'border-border bg-surface-subtle'
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-brand-700">변형 {v}</span>
                        {isWinner && <span className="text-status-success">🏆 WINNER</span>}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-ink">{data.title || '(작성 대기)'}</div>
                      <div className="mt-1 text-[11px] text-ink-muted">CTA: {data.cta || '—'}</div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                        <div>
                          <div className="text-base font-bold text-ink">{data.metric.mentions}</div>
                          <div className="text-[9px] text-ink-muted">인용</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-ink">{data.metric.clicks}</div>
                          <div className="text-[9px] text-ink-muted">클릭</div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-status-success">{data.metric.inquiries}</div>
                          <div className="text-[9px] text-ink-muted">문의</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {t.status === 'running' && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="text-ink-muted">
                    예상 lift: <strong className={lift >= 0 ? 'text-status-success' : 'text-status-danger'}>
                      {lift >= 0 ? '+' : ''}{lift.toFixed(0)}%
                    </strong>
                    {' '}· 신뢰도 ≈ {confidence.toFixed(0)}%
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => conclude(t.id, 'A')} className="btn-secondary text-xs">A 승</button>
                    <button onClick={() => conclude(t.id, 'B')} className="btn-secondary text-xs">B 승</button>
                    <button onClick={() => conclude(t.id, 'tie')} className="btn-secondary text-xs">동률</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={() => setShowNew(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">신규 A/B 테스트</h3>
              <button onClick={() => setShowNew(false)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold">테넌트</label>
                <select className="input-base" value={draft.tenantId ?? ''} onChange={(e) => setDraft((p) => ({ ...p, tenantId: e.target.value }))}>
                  {adminTenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">키워드 *</label>
                <input className="input-base" value={draft.keyword ?? ''} onChange={(e) => setDraft((p) => ({ ...p, keyword: e.target.value }))} placeholder="예: 잠실 라식" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">가설 *</label>
                <textarea className="input-base min-h-[70px]" value={draft.hypothesis ?? ''} onChange={(e) => setDraft((p) => ({ ...p, hypothesis: e.target.value }))} placeholder="예: 가격 명시 CTA 가 회복기 강조보다 효과적일 것" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowNew(false)} className="btn-secondary text-xs">취소</button>
              <button onClick={create} className="btn-primary text-xs">생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
