'use client';

import { ArrowUpRight, ClipboardCheck, DollarSign, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { adminTenants, contentQueue, citationEvents, costDaily } from '@/lib/admin-mock';
import { cn } from '@/lib/cn';

export default function AdminDashboardPage() {
  const activeTenants = adminTenants.filter((t) => t.status === 'active').length;
  const pendingQueue = contentQueue.length;
  const todayCost = costDaily[costDaily.length - 1]?.usd ?? 0;
  const recentCitations = citationEvents.slice(0, 3);

  const KPIS = [
    { label: '활성 클라이언트', value: activeTenants, suffix: '개', delta: '+2', href: '/admin/tenants', icon: Users },
    { label: '검수 대기', value: pendingQueue, suffix: '건', delta: '+4', href: '/admin/content-queue', icon: ClipboardCheck },
    { label: '오늘 LLM 비용', value: `$${todayCost.toFixed(2)}`, suffix: '', delta: '+12%', href: '/admin/cost', icon: DollarSign },
    { label: '24h AI 인용', value: citationEvents.length, suffix: '건', delta: '+8', href: '/admin/citations', icon: Zap }
  ];

  return (
    <div className="px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">운영 대시보드</h1>
        <p className="mt-1 text-sm text-ink-muted">
          전체 클라이언트 현황을 한눈에 확인합니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href} className="card card-pad transition hover:border-brand-200">
              <div className="flex items-start justify-between">
                <div className="kpi-label">{k.label}</div>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <div className="kpi-value">{k.value}</div>
                <span className="text-sm text-ink-muted">{k.suffix}</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-status-successSoft px-2 py-0.5 text-xs font-semibold text-status-success">
                ▲ {k.delta}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">최근 검수 대기 (Top 3)</h2>
            <Link href="/admin/content-queue" className="text-xs font-semibold text-brand-700 hover:underline">
              전체 보기 <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {contentQueue.slice(0, 3).map((q) => (
              <li key={q.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{q.title}</div>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {q.tenantName} · {q.keyword} · {q.generator}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                      q.lintScore >= 95 ? 'bg-status-successSoft text-status-success' :
                      q.lintScore >= 85 ? 'bg-status-warningSoft text-status-warning' :
                      'bg-status-dangerSoft text-status-danger'
                    )}
                  >
                    린트 {q.lintScore}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">최근 AI 인용 (24h)</h2>
            <Link href="/admin/citations" className="text-xs font-semibold text-brand-700 hover:underline">
              전체 보기 <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </header>
          <ul className="divide-y divide-border">
            {recentCitations.map((c) => (
              <li key={c.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{c.query}</div>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {c.tenantName} · {c.engine} · {new Date(c.citedAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <span className={cn(
                    'shrink-0 inline-flex h-2 w-2 rounded-full',
                    c.engine === 'chatgpt' ? 'bg-engine-chatgpt' :
                    c.engine === 'claude' ? 'bg-engine-claude' :
                    c.engine === 'gemini' ? 'bg-engine-gemini' : 'bg-engine-perplexity'
                  )} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
