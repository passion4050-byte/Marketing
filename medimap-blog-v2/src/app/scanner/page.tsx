/**
 * /scanner — 무료 의료 GEO 진단 (공개 리드 깔때기).
 *
 * URL + 이메일 → AI 가시성 7항목 + 의료광고법 리스크 진단을 즉시 렌더.
 * 위서클 차별점: 7번 항목(의료광고법 리스크)은 일반 GEO 업체가 못 하는 진단.
 */
'use client';

import { useState } from 'react';
import type { ScanReport, ScanItem } from '@/lib/scanner/scan';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600', B: 'text-brand', C: 'text-amber-500', D: 'text-rose-500'
};
const STATUS_RING: Record<string, string> = {
  good: 'border-emerald-200 bg-emerald-50', warn: 'border-amber-200 bg-amber-50', bad: 'border-rose-200 bg-rose-50'
};
const STATUS_DOT: Record<string, string> = {
  good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-rose-500'
};

function Gauge({ score, grade }: { score: number; grade: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  const stroke = score >= 65 ? '#10B981' : score >= 50 ? '#F59E0B' : '#F43F5E';
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg width="160" height="160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={stroke} strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className={`text-4xl font-extrabold ${GRADE_COLOR[grade]}`}>{score}</div>
        <div className="text-xs font-semibold text-ink-muted">/ 100 · {grade}등급</div>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: ScanItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${STATUS_RING[item.status]}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <span>{item.icon}</span>{item.label}
          {item.key === 'compliance' && (
            <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">위서클 단독</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[item.status]}`} />
          <span className="text-lg font-bold tabular-nums text-ink">{item.score}</span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/60 pt-3 text-sm">
          {item.findings.length > 0 && (
            <ul className="space-y-1 text-ink-soft">
              {item.findings.map((f, i) => <li key={i}>✓ {f}</li>)}
            </ul>
          )}
          {item.fixes.length > 0 && (
            <ul className="space-y-1 text-ink-muted">
              {item.fixes.map((f, i) => <li key={i}>→ {f}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScannerPage() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [err, setErr] = useState('');

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setReport(null);
    if (!url.trim()) { setErr('진단할 병원 홈페이지 URL 을 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email })
      });
      const data = await res.json();
      if (!data?.report) { setErr(data?.error || '진단에 실패했습니다.'); }
      else if (!data.report.ok) { setErr(data.report.error || '페이지를 분석하지 못했습니다.'); }
      else { setReport(data.report as ScanReport); }
    } catch {
      setErr('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-base">
      {/* Brand header (사이드바 없는 잠재고객용 앞문) */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface-base/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="/scanner" className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand">WECIRCLE GEO</span>
            <span className="hidden text-xs text-ink-muted sm:inline">의료 특화 AI 검색 최적화</span>
          </a>
          <a href="/data-feeding" className="text-sm font-semibold text-brand hover:underline">전문가 상담 →</a>
        </div>
      </header>

      {/* Hero + Form */}
      <section className="border-b border-border bg-gradient-to-b from-brand-tint-soft to-surface-base">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <div className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
            무료 · 2분 · AI 가시성 7항목 + 의료광고법 리스크
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            우리 병원, ChatGPT·AI 검색에서<br />어떻게 보이고 있을까요?
          </h1>
          <p className="mt-4 text-base text-ink-muted">
            URL 하나면 됩니다. 4대 AI 엔진 인용 준비도를 진단하고,
            <br className="hidden sm:block" /> 다른 GEO 업체가 못 보는 <strong className="text-brand">의료광고법 리스크</strong>까지 함께 점검합니다.
          </p>

          <form onSubmit={run} className="mx-auto mt-8 max-w-xl space-y-3 text-left">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">병원 홈페이지 URL *</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="clinic.co.kr" className="input-base" inputMode="url" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">결과 안내받을 이메일 (선택)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.co.kr" className="input-base" type="email" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'AI 가시성 분석 중…' : '무료 GEO 진단 시작하기 →'}
            </button>
            {err && <p className="text-sm text-rose-500">{err}</p>}
            <p className="text-center text-xs text-ink-faint">완전 무료 · 결과 즉시 표시 · 스팸 없음</p>
          </form>
        </div>
      </section>

      {/* Report */}
      {report && (
        <section className="mx-auto max-w-3xl px-5 py-12">
          <div className="rounded-2xl border border-border bg-surface-subtle p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 border-b border-border pb-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand">GEO Scanner 리포트</div>
                <h2 className="mt-1 text-xl font-bold text-ink">{report.domain}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  종합 AI 가시성 점수 · 분석 {new Date(report.fetchedAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <Gauge score={report.overallScore} grade={report.grade} />
            </div>

            {report.compliance.status !== 'pass' && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="font-bold text-rose-700">
                  🛡️ 의료광고법 리스크 {report.compliance.failCount > 0 ? '발견' : '주의'} —
                  금지 {report.compliance.failCount} · 주의 {report.compliance.warnCount}건
                </div>
                <p className="mt-1 text-sm text-rose-600">
                  AI 노출을 늘리기 전에, 광고 표현이 의료법을 위반하면 인용될수록 리스크가 커집니다. 일반 GEO 업체는 이 진단을 하지 않습니다.
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3">
              {report.items.map((it) => <ItemCard key={it.key} item={it} />)}
            </div>
            <p className="mt-3 text-center text-xs text-ink-faint">항목을 눌러 상세 발견 사항·개선안을 확인하세요.</p>
          </div>

          {/* CTA */}
          <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-tint-soft p-6 text-center">
            <h3 className="text-lg font-bold text-ink">이 리포트를 실제 AI 인용으로 바꿔 드립니다</h3>
            <p className="mt-2 text-sm text-ink-muted">
              위서클은 의료광고법을 지키면서 4대 AI 엔진에 인용되도록 콘텐츠·스키마·엔티티를 직접 실행하고,
              인용 순위를 실시간 대시보드로 추적합니다.
            </p>
            <a href="/data-feeding" className="btn-primary mt-4 inline-flex px-6 py-3">전문가 상담 신청 →</a>
          </div>
        </section>
      )}

      {/* 항목 설명 */}
      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h3 className="text-center text-sm font-bold uppercase tracking-wider text-ink-muted">진단 7항목</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['🤖', 'AI 인용 가능성', 'AI 가 답변에 그대로 떼어 쓸 수 있는 구조인지'],
            ['🏗️', '구조화 데이터', 'Schema.org·의료 스키마·FAQPage 적용도'],
            ['⚙️', 'AI 크롤러 접근성', 'GPTBot·ClaudeBot·PerplexityBot 허용 + llms.txt'],
            ['📋', 'E-E-A-T 전문성', '전문의·자격·감수 등 의료 신뢰 신호'],
            ['📝', '콘텐츠 AI 친화도', 'FAQ·HowTo·비교·정의형 콘텐츠'],
            ['🏆', '브랜드 권위·엔티티', 'title·OG·sameAs 엔티티 일관성'],
            ['🛡️', '의료광고법 리스크', '위서클 단독 — 광고 표현의 의료법 위반 진단']
          ].map(([icon, label, desc]) => (
            <div key={label} className="rounded-xl border border-border bg-surface-subtle p-4">
              <div className="font-semibold text-ink">{icon} {label}</div>
              <p className="mt-1 text-sm text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
