/**
 * Round 180 (2026-08-30) — 성과 보드. 어드민의 새로운 1급 화면.
 *
 * 이 화면이 존재하는 이유:
 *   기존 1급 화면은 '콘텐츠 관리(검수 큐)' 였다. 발행량이 중심이면 편수를 늘릴 유인만
 *   남는다. 실제로 그렇게 됐다 — 370편을 발행해 GSC 평균 17위, 3개월 클릭 14회.
 *   반면 AI 인용 6건 중 4건은 GSC 3위였던 **한 편**에서 나왔다.
 *   인용은 랭킹의 함수다. 그러니 화면도 "몇 편 썼나"가 아니라
 *   "약속한 키워드가 몇 위이고, AI가 인용했는가"를 보여줘야 한다.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

interface BoardRow {
  tenant_id: number;
  partner_slug: string;
  tenant_name: string;
  keyword_id: number;
  keyword_text: string;
  target_rank: number | null;
  baseline_rank: number | null;
  current_rank: number | null;
  impressions: number;
  clicks: number;
  posts: number;
  citations_30d: number;
  citations_all: number;
  last_cited_at: string | null;
}

interface Summary {
  keywords: number; ranked: number; achieved: number; cited: number;
  citations30d: number; citationsAll: number; hospitals: number;
}

function rankBadge(cur: number | null, target: number | null) {
  if (cur == null) return { text: '미진입', cls: 'bg-stone-100 text-stone-500' };
  if (target != null && cur <= target) return { text: `${cur}위`, cls: 'bg-emerald-100 text-emerald-700' };
  if (cur <= 10) return { text: `${cur}위`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `${cur}위`, cls: 'bg-rose-100 text-rose-700' };
}

function delta(base: number | null, cur: number | null) {
  if (base == null || cur == null) return null;
  const d = base - cur; // 순위는 낮을수록 좋다 → 양수면 개선
  if (Math.abs(d) < 0.1) return { text: '—', cls: 'text-stone-400' };
  return d > 0
    ? { text: `▲ ${d.toFixed(1)}`, cls: 'text-emerald-600' }
    : { text: `▼ ${Math.abs(d).toFixed(1)}`, cls: 'text-rose-600' };
}

export default function PerformanceBoardPage() {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/admin/performance-board?days=90', { cache: 'no-store' });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j.rows ?? []);
      setSummary(j.summary ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const byHospital = rows.reduce<Record<string, BoardRow[]>>((acc, r) => {
    (acc[r.tenant_name] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">성과 보드</h1>
          <p className="mt-1 text-sm text-stone-500">
            집중 병원의 추적 키워드별 구글 순위와 AI 인용. 발행량이 아니라 이 표가 병원에 파는 것입니다.
          </p>
        </div>
        <button onClick={() => void load()} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
          새로고침
        </button>
      </header>

      {err && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          불러오지 못했습니다: {err}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 md:grid-cols-6">
          {[
            { k: '집중 병원', v: summary.hospitals },
            { k: '추적 키워드', v: summary.keywords },
            { k: '순위 진입', v: summary.ranked },
            { k: '목표 달성', v: summary.achieved },
            { k: 'AI 인용 (30일)', v: summary.citations30d },
            { k: 'AI 인용 (누적)', v: summary.citationsAll },
          ].map((s) => (
            <div key={s.k} className="bg-white px-4 py-3">
              <div className="text-2xl font-semibold tabular-nums text-stone-900">{s.v}</div>
              <div className="mt-0.5 text-xs text-stone-500">{s.k}</div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="py-10 text-center text-sm text-stone-400">불러오는 중…</div>}

      {!loading && rows.length === 0 && !err && (
        <div className="rounded-lg border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
          추적 키워드가 없습니다. 키워드 풀에서 <code className="rounded bg-stone-100 px-1">tracked</code> 를 지정하세요.
        </div>
      )}

      {Object.entries(byHospital).map(([hospital, list]) => (
        <section key={hospital} className="overflow-hidden rounded-lg border border-stone-200">
          <div className="flex items-baseline justify-between border-b border-stone-200 bg-stone-50 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-stone-800">{hospital}</h2>
            <span className="text-xs text-stone-500">
              키워드 {list.length} · 인용 {list.reduce((s, r) => s + Number(r.citations_all || 0), 0)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[11px] uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-2 font-medium">키워드</th>
                  <th className="px-4 py-2 font-medium">현재 순위</th>
                  <th className="px-4 py-2 font-medium">시작 대비</th>
                  <th className="px-4 py-2 text-right font-medium">목표</th>
                  <th className="px-4 py-2 text-right font-medium">노출</th>
                  <th className="px-4 py-2 text-right font-medium">클릭</th>
                  <th className="px-4 py-2 text-right font-medium">발행</th>
                  <th className="px-4 py-2 text-right font-medium">AI 인용</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const b = rankBadge(r.current_rank, r.target_rank);
                  const d = delta(r.baseline_rank, r.current_rank);
                  return (
                    <tr key={r.keyword_id} className="border-b border-stone-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-stone-800">{r.keyword_text}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}>{b.text}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-xs tabular-nums ${d?.cls ?? 'text-stone-400'}`}>{d?.text ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-500">{r.target_rank ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{r.impressions}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{r.clicks}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-500">{r.posts}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`tabular-nums font-semibold ${r.citations_all > 0 ? 'text-emerald-700' : 'text-stone-300'}`}>
                          {r.citations_all}
                        </span>
                        {r.citations_30d > 0 && (
                          <span className="ml-1 text-[11px] text-emerald-600">(30일 {r.citations_30d})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
