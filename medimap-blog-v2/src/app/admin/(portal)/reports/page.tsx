'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, Mail, FileText, Calendar } from 'lucide-react';
import { adminTenants, costDaily, citationEvents, funnelRows } from '@/lib/admin-mock';
import { showToast } from '@/lib/clientActions';

export default function ReportsListPage() {
  const [sending, setSending] = useState<string | null>(null);
  const period = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const sendEmail = async (tenantId: string) => {
    setSending(tenantId);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, period })
      });
      const data = await res.json();
      if (data.stub) {
        showToast(`RESEND_API_KEY 미설정 — 보고서 URL 만 생성됨`, { kind: 'info', ms: 3500 });
      } else if (data.ok) {
        showToast(`${data.to} 로 보고서 이메일 발송됨`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">월간 보고서 — {period}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          클라이언트별 발행/인용/ROI 보고서. [PDF] 클릭 시 브라우저 인쇄 다이얼로그 → "PDF로 저장".
        </p>
      </header>

      <div className="card mb-4 border-l-4 border-brand bg-brand-50/40 p-4 text-xs text-brand-700">
        매월 1일 자동 발송: <code className="rounded bg-surface-base px-1 py-0.5">scheduled-tasks → /api/admin/reports/email</code>{' '}
        cron 으로 자동화. Resend env 설정 시 즉시 이메일 발송.
      </div>

      <div className="space-y-3">
        {adminTenants.map((t) => {
          const cited = citationEvents.filter((c) => c.tenantId === t.id).length;
          const funnel = funnelRows.filter((f) => f.tenantId === t.id);
          const clicks = funnel.reduce((s, r) => s + r.clicks, 0);
          const inqs = funnel.reduce((s, r) => s + r.inquiries, 0);
          return (
            <div key={t.id} className="card flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <FileText className="h-10 w-10 text-brand-700" />
                <div>
                  <h3 className="text-sm font-bold text-ink">{t.name}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-muted">
                    <span>발행 {t.publishCount}건</span>
                    <span>인용 {cited}회</span>
                    <span>클릭 {clicks}</span>
                    <span>문의 {inqs}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/reports/${t.id}`} target="_blank" className="btn-secondary text-xs">
                  <Download className="h-3.5 w-3.5" /> PDF 미리보기
                </Link>
                <button
                  onClick={() => sendEmail(t.id)}
                  disabled={sending === t.id || !t.contact}
                  className="btn-primary text-xs disabled:opacity-60"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sending === t.id ? '발송 중…' : `${t.contact} 로 발송`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
