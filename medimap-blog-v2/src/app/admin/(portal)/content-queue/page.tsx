'use client';

import { useState } from 'react';
import { Check, X, FileText, AlertTriangle } from 'lucide-react';
import { contentQueue as base, type ContentQueueItem } from '@/lib/admin-mock';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

export default function ContentQueuePage() {
  const [items, setItems] = useState<ContentQueueItem[]>(base);
  const [preview, setPreview] = useState<ContentQueueItem | null>(null);

  const approve = (id: string) => {
    setItems((p) => p.filter((x) => x.id !== id));
    showToast('발행 승인됨 — 자사 블로그 + 네이버 배포 대기열 진입');
  };
  const reject = (id: string) => {
    if (!confirm('이 콘텐츠를 거부할까요?')) return;
    setItems((p) => p.filter((x) => x.id !== id));
    showToast('거부됨 — 다시 생성됩니다', { kind: 'info' });
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">콘텐츠 검수 큐 ({items.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">Gemini 자동 생성 콘텐츠 검토 후 publish 또는 reject</p>
        </div>
      </header>

      <div className="space-y-3">
        {items.map((q) => (
          <div key={q.id} className="card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="chip-brand">{q.tenantName}</span>
                  <span className="text-[11px] text-ink-muted">{q.generator}</span>
                  <span className="text-[11px] text-ink-muted">· {q.keyword}</span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-ink">{q.title}</h3>
                <p className="mt-1 text-xs text-ink-soft line-clamp-2">{q.body}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                  q.lintScore >= 95 ? 'bg-status-successSoft text-status-success' :
                  q.lintScore >= 85 ? 'bg-status-warningSoft text-status-warning' :
                  'bg-status-dangerSoft text-status-danger'
                )}>린트 {q.lintScore}점</div>
                {q.lintIssues.length > 0 && (
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-status-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {q.lintIssues.length} 이슈
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <button onClick={() => setPreview(q)} className="text-xs text-brand-700 hover:underline">
                <FileText className="inline h-3.5 w-3.5" /> 본문 미리보기
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => reject(q.id)} className="btn-secondary text-xs">
                  <X className="h-3.5 w-3.5" /> 거부
                </button>
                <button onClick={() => approve(q.id)} className="btn-primary text-xs">
                  <Check className="h-3.5 w-3.5" /> 발행 승인
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
            검수 대기 큐가 비어 있습니다. 다음 cron 사이클 (정각 매시간) 에 새 콘텐츠가 들어옵니다.
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={() => setPreview(null)}>
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">{preview.title}</h3>
              <button onClick={() => setPreview(null)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm leading-relaxed text-ink-soft">
              <div className="mb-3 text-xs text-ink-muted">{preview.tenantName} · {preview.keyword} · 린트 {preview.lintScore}점</div>
              {preview.lintIssues.length > 0 && (
                <div className="mb-3 rounded-md bg-status-warningSoft px-3 py-2 text-xs text-status-warning">
                  <strong>린트 이슈 ({preview.lintIssues.length}):</strong> {preview.lintIssues.join(', ')}
                </div>
              )}
              <p>{preview.body}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
