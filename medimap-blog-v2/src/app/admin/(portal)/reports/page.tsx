'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, Loader2, Mail } from 'lucide-react';
import { MockBanner } from '@/components/admin/MockBanner';
import { showToast } from '@/lib/clientActions';

interface SbTenant {
  id: number | string;
  name: string;
  phone: string | null;
  email: string | null;
  publish_count: number | null;
  partner_slug: string | null;
}

export default function ReportsListPage() {
  const [tenants, setTenants] = useState<SbTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | number | null>(null);
  const period = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setTenants(data.tenants ?? []);
    } catch (e) {
      showToast(`목록 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendEmail = async (tenantId: SbTenant['id']) => {
    setSending(tenantId);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, period })
      });
      const data = await res.json();
      if (data.stub) {
        showToast('RESEND_API_KEY 미설정 — 보고서 URL 만 생성됨', { kind: 'info', ms: 3500 });
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
          클라이언트별 발행/인용/ROI 보고서. [PDF] 클릭 시 브라우저 인쇄 다이얼로그 → &quot;PDF 로 저장&quot;.
        </p>
      </header>

      <div className="mb-4 rounded-lg border border-border bg-surface-subtle px-4 py-3 text-xs text-ink-soft">
        매월 1일 자동 발송: scheduled-tasks → <code className="rounded bg-surface-base px-1 py-0.5">/api/admin/reports/email</code> cron 으로 자동화. Resend env 설정 시 즉시 이메일 발송.
      </div>

      {/* Mock 부분 — 인용/클릭/문의 카운터는 다른 페이지 데이터에 의존. 다음 round 에서 ETL 통합. */}
      <MockBanner phase="Phase 2" source="citations + funnel ETL — 발행수만 실데이터, 인용/클릭/문의 mock" />

      {loading && (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      )}
      {!loading && tenants.length === 0 && (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          등록된 클라이언트가 없습니다.
        </div>
      )}

      <div className="space-y-3">
        {tenants.map((t) => {
          // 인용/클릭/문의는 ETL 미연결 → placeholder
          return (
            <div key={String(t.id)} className="card flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <FileText className="h-10 w-10 text-brand-700" />
                <div>
                  <h3 className="text-sm font-bold text-ink">{t.name}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-muted">
                    <span>발행 {t.publish_count ?? 0}건</span>
                    <span className="text-ink-faint">인용 — · 클릭 — · 문의 —</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/reports/${t.id}`} target="_blank" className="btn-secondary text-xs">
                  <Download className="h-3.5 w-3.5" /> PDF 미리보기
                </Link>
                <button
                  onClick={() => sendEmail(t.id)}
                  disabled={sending === t.id || !t.email}
                  className="btn-primary text-xs disabled:opacity-60"
                  title={!t.email ? '이메일 미등록 — tenants 편집에서 이메일 입력 필요' : ''}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sending === t.id ? '발송 중…' : (t.email ? `${t.email} 로 발송` : '이메일 미등록')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
