/**
 * Round 84 (2026-06-28) — Funnel · ROI server component.
 *
 * 이전: Mock 데이터 (admin-mock.ts) + MockBanner. 사용자 지시 — mock 제거.
 * 지금: shortlinks + shortlink_clicks 실데이터 query.
 *   - shortlinks 가 아직 발급 안 돼있으면 명확한 빈 상태 안내
 *   - 추적 모델: AI 응답 → shortlink 클릭 → tenant 문의 (Round 24 인프라)
 */
import { LinkIcon, ArrowRight } from 'lucide-react';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ShortLink {
  id: number;
  code: string;
  tenant_id: number | null;
  target_url: string | null;
  source: string | null;
  created_at: string;
}

interface Click {
  shortlink_id: number;
  clicked_at: string;
  tenant_id: number | null;
}

interface Tenant {
  id: number;
  name: string;
}

export default async function FunnelPage() {
  const sb = getServerClient();

  let links: ShortLink[] = [];
  let clicks: Click[] = [];
  let tenants: Tenant[] = [];
  let dataError: string | null = null;

  if (!sb) {
    dataError = 'Supabase 미연결';
  } else {
    const { data: linkRows, error: lErr } = await sb
      .from('shortlinks')
      .select('id, code, tenant_id, target_url, source, created_at')
      .limit(200);
    if (lErr) {
      dataError = `shortlinks query: ${lErr.message}`;
    } else {
      links = (linkRows ?? []) as ShortLink[];
    }

    if (links.length > 0) {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: clickRows } = await sb
        .from('shortlink_clicks')
        .select('shortlink_id, clicked_at, tenant_id')
        .gte('clicked_at', since)
        .limit(10000);
      clicks = (clickRows ?? []) as Click[];
    }

    const { data: tRows } = await sb.from('tenants').select('id, name').limit(200);
    tenants = (tRows ?? []) as Tenant[];
  }

  // 집계
  const clicksByLink = new Map<number, number>();
  for (const c of clicks) {
    clicksByLink.set(c.shortlink_id, (clicksByLink.get(c.shortlink_id) ?? 0) + 1);
  }
  const tenantNameMap = new Map(tenants.map((t) => [t.id, t.name]));

  const rows = links.map((l) => ({
    code: l.code,
    tenantName: l.tenant_id ? tenantNameMap.get(l.tenant_id) ?? `tenant#${l.tenant_id}` : '—',
    source: l.source ?? '',
    targetUrl: l.target_url ?? '',
    clicks: clicksByLink.get(l.id) ?? 0,
    // 문의/예약 = shortlink_clicks 기반으로는 아직 미구현 (Round 24 트래킹 인프라 외)
    inquiries: 0,
    conversionRate: 0,
  }));

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalInq = rows.reduce((s, r) => s + r.inquiries, 0);
  const avgConv = rows.length > 0
    ? rows.reduce((s, r) => s + r.conversionRate, 0) / rows.length
    : 0;

  const hasData = links.length > 0;

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Funnel · ROI</h1>
          <p className="admin-page-desc">AI 인용 → ShortLink 클릭 → 실제 문의/예약까지의 전환 ROI</p>
        </div>
      </header>

      {dataError && (
        <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          ⚠ 데이터 로드 실패: {dataError}
        </div>
      )}

      {!hasData && !dataError && (
        <div className="rounded-lg border border-border bg-surface-subtle p-8 text-center">
          <LinkIcon className="mx-auto mb-3 h-8 w-8 text-ink-faint" />
          <div className="text-base font-semibold text-ink">ShortLink 추적 데이터 없음</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            ROI 측정은 콘텐츠 안의 CTA 링크를 <code className="rounded bg-surface-strong px-1 py-0.5 text-xs">/r/&lt;code&gt;</code> 형태의
            ShortLink 로 발급해야 가능합니다. 현재 발급된 ShortLink 가 0개입니다.
          </p>
          <div className="mx-auto mt-4 max-w-md rounded-md border border-border bg-white px-4 py-3 text-left text-xs text-ink">
            <div className="mb-1 font-semibold">설정 안내</div>
            <ol className="ml-4 list-decimal space-y-1 text-ink-muted">
              <li>generator.py 의 include_cta=True 가 ShortLink 발급하도록 인프라 연결</li>
              <li>발행 콘텐츠 CTA 가 <code>/r/...</code> 로 자동 변환되도록 cron 후처리 추가</li>
              <li>shortlink_clicks 누적 후 이 페이지에서 자동 표시</li>
            </ol>
          </div>
        </div>
      )}

      {hasData && (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card card-pad">
              <div className="kpi-label">총 클릭 (30d)</div>
              <div className="kpi-value">{totalClicks.toLocaleString()}</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">총 문의 (30d)</div>
              <div className="kpi-value">{totalInq}</div>
              <div className="text-[10px] text-ink-muted">문의 추적 인프라 통합 시 자동 표시</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">평균 전환율</div>
              <div className="kpi-value">{avgConv.toFixed(1)}%</div>
            </div>
          </section>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left">ShortLink</th>
                  <th className="px-4 py-3 text-left">테넌트 / 소스</th>
                  <th className="px-4 py-3 text-right">클릭</th>
                  <th className="px-4 py-3 text-right">문의</th>
                  <th className="px-4 py-3 text-right">전환율</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">/r/{r.code}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-ink">{r.tenantName}</div>
                      <div className="text-ink-muted">{r.source}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{r.clicks}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{r.inquiries}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-status-success">
                      {r.conversionRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
