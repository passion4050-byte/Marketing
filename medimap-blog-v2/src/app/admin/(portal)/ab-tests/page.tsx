/**
 * Round 73 (2026-06-22) — A/B 콘텐츠 테스트 (실데이터, mock 대체).
 *
 * 변형 A = 베이스라인(기존 스타일), 변형 B = 학습 인사이트 반영.
 * 변형별 AI 인용 수를 비교해 어느 콘텐츠 전략이 더 자주 인용되는지 검증.
 * 생성: scripts/run_ab_test.py / 측정·승자판정: scripts/run_ab_analysis.py (일일 cron).
 */
'use client';

import { useEffect, useState } from 'react';
import { Beaker, ExternalLink, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = {
  content_id: number | null;
  title: string | null;
  slug: string | null;
  url: string | null;
  content_status: string | null;
  citations: number;
  mentions: number;
};
type AbTest = {
  id: number;
  tenant_name: string;
  keyword: string;
  hypothesis: string | null;
  status: string;
  winner: string | null;
  metric: string;
  variant_a: Variant;
  variant_b: Variant;
  last_measured_at: string | null;
  started_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '대기', cls: 'bg-surface-subtle text-ink-muted' },
  running: { label: '측정 중', cls: 'bg-status-warningSoft text-status-warning' },
  concluded: { label: '종료', cls: 'bg-status-successSoft text-status-success' },
};

export default function AbTestsPage() {
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ab-tests', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'fetch failed');
      setTests(json.tests ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">A/B 콘텐츠 테스트 ({tests.length})</h1>
          <p className="admin-page-desc">
            변형 A(기존 스타일) vs B(학습 인사이트 반영) 의 AI 인용 효과를 비교합니다
          </p>
        </div>
        <button onClick={() => void load()} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </header>

      <div className="mb-5 rounded-lg border border-border bg-brand-50/40 px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
        <strong className="text-brand">측정 방식</strong> — 각 변형 글의 URL 이 AI 응답의 인용 출처로 등장한 횟수를 비교합니다.{' '}
        결과(승자)는 AI 엔진이 크롤링·인용을 누적해야 나오므로 <strong>수 주~수개월</strong> 걸립니다.{' '}
        생성: <code className="rounded bg-surface-subtle px-1">scripts/run_ab_test.py</code> · 측정: 매일 06:00 KST 자동.
      </div>

      {loading ? (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      ) : error ? (
        <div className="card border-status-danger/30 bg-status-dangerSoft/30 px-6 py-4 text-sm text-status-danger">
          데이터 로드 실패: {error}
        </div>
      ) : tests.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-ink-muted">
          <Beaker className="mx-auto mb-2 h-6 w-6 text-ink-faint" />
          아직 A/B 테스트가 없습니다.
          <div className="mt-1 text-[11px] text-ink-faint">
            서버에서{' '}
            <code className="rounded bg-surface-subtle px-1">python scripts/run_ab_test.py &lt;tenant_id&gt; &quot;키워드&quot;</code>{' '}
            로 변형 2개를 생성하세요.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => {
            const st = STATUS_META[t.status] ?? STATUS_META.pending;
            const total = t.variant_a.citations + t.variant_b.citations;
            const aPct = total > 0 ? Math.round((t.variant_a.citations / total) * 100) : 0;
            return (
              <div key={t.id} className="card card-pad">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{t.keyword}</span>
                    <span className="text-[11px] text-ink-muted">· {t.tenant_name}</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', st.cls)}>{st.label}</span>
                  </div>
                  {t.winner && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-status-successSoft px-2 py-0.5 text-[11px] font-bold text-status-success">
                      <Trophy className="h-3 w-3" /> 승자: 변형 {t.winner}
                    </span>
                  )}
                </div>
                {t.hypothesis && (
                  <div className="mb-3 text-[11px] text-ink-muted">가설: {t.hypothesis}</div>
                )}

                {/* 변형 인용 비교 바 (A 회색 / B 브랜드) */}
                <div className="mb-2 flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div className="h-full bg-ink-muted/40" style={{ width: `${aPct}%` }} title={`A ${t.variant_a.citations}`} />
                  <div className="h-full flex-1 bg-brand" title={`B ${t.variant_b.citations}`} />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {([
                    { v: t.variant_a, label: 'A · 기존 스타일', isB: false },
                    { v: t.variant_b, label: 'B · 인사이트 반영', isB: true },
                  ] as const).map(({ v, label, isB }) => (
                    <div
                      key={label}
                      className={cn(
                        'rounded-lg border px-3 py-2',
                        isB ? 'border-brand/40 bg-brand-50/30' : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-[11px] font-bold', isB ? 'text-brand' : 'text-ink-soft')}>{label}</span>
                        <span className="font-mono text-sm font-bold text-ink">
                          {v.citations}
                          <span className="ml-0.5 text-[10px] font-normal text-ink-muted">인용</span>
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[11px] text-ink" title={v.title ?? ''}>
                        {v.title ?? '(제목 없음)'}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-muted">
                        <span>{v.content_status ?? '미생성'}</span>
                        {v.url && (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-brand-700 hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" /> 글 보기
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-[10px] text-ink-muted">
                  최근 측정: {t.last_measured_at ? new Date(t.last_measured_at).toLocaleString('ko-KR') : '아직 없음'}
                  {' · '}시작: {new Date(t.started_at).toLocaleDateString('ko-KR')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
