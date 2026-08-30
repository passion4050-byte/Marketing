/**
 * Round 180 (2026-08-30) — 성과 보드. 어드민의 새로운 1급 화면.
 *
 * 이 화면이 존재하는 이유:
 *   기존 1급 화면은 '콘텐츠 관리(검수 큐)' 였다. 발행량이 중심이면 편수를 늘릴 유인만
 *   남는다. 실제로 그렇게 됐다 — 370편을 발행해 GSC 평균 17위, 3개월 클릭 14회.
 *   반면 AI 인용 6건 중 4건은 GSC 3위였던 **한 편**에서 나왔다.
 *   인용은 랭킹의 함수다. 그러니 화면도 "몇 편 썼나"가 아니라
 *   "약속한 키워드가 몇 위이고, AI가 인용했는가"를 보여줘야 한다.
 *
 * 🔴 Round 181 (2026-08-30) — 네이버를 나란히 붙였다.
 *   실측(같은 30일): 네이버 노출 1,800 / 클릭 30  vs  구글 644 / 클릭 17.
 *   네이버가 이미 더 큰 채널인데 이 화면은 GSC 만 보고 있었다 —
 *   실제 유입의 2/3 가 화면에 없었던 것이다. 국내 병원 상품인 이상
 *   **두 엔진을 같은 줄에서 비교할 수 없으면 이 보드는 반쪽이다.**
 *   focus 토글: 기본은 집중 9곳, '전체'로 바꾸면 tracked 전부가 보인다
 *   (네이버 클릭 다수가 비집중 병원에서 나온다는 사실을 숨기지 않기 위해).
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

interface BoardRow {
  tenant_id: number;
  partner_slug: string;
  tenant_name: string;
  focus_tier: number;
  keyword_id: number;
  keyword_text: string;
  target_rank: number | null;
  baseline_rank: number | null;
  current_rank: number | null;
  impressions: number;        // 구글(GSC)
  clicks: number;             // 구글(GSC)
  naver_impressions: number;  // 네이버 서치어드바이저
  naver_clicks: number;
  naver_ctr: number | null;
  posts: number;
  citations_30d: number;
  citations_all: number;
  last_cited_at: string | null;
}

interface Summary {
  keywords: number; ranked: number; achieved: number; cited: number;
  citations30d: number; citationsAll: number; hospitals: number;
  googleImpressions: number; googleClicks: number;
  naverImpressions: number; naverClicks: number;
}

// GSC 평균 게재순위라 소수가 나온다(2.5위). 정수면 소수점을 떼고, 아니면 한 자리.
function fmtRank(v: number) {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

function rankBadge(cur: number | null, target: number | null) {
  if (cur == null) return { text: '미진입', cls: 'bg-stone-100 text-stone-500' };
  const t = `${fmtRank(cur)}위`;
  if (target != null && cur <= target) return { text: t, cls: 'bg-emerald-100 text-emerald-700' };
  if (cur <= 10) return { text: t, cls: 'bg-amber-100 text-amber-700' };
  return { text: t, cls: 'bg-rose-100 text-rose-700' };
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
  const [scope, setScope] = useState<'focus' | 'all'>('focus');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/performance-board?days=90&focus=${scope}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(j.rows ?? []);
      setSummary(j.summary ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [scope]);

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
            추적 키워드별 <b>구글 순위 · 네이버 노출/클릭 · AI 인용</b>. 발행량이 아니라 이 표가 병원에 파는 것입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-stone-300 text-sm">
            {(['focus', 'all'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setScope(v)}
                className={`px-3 py-1.5 ${scope === v ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'}`}
              >
                {v === 'focus' ? '집중 병원' : '전체'}
              </button>
            ))}
          </div>
          <button onClick={() => void load()} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
            새로고침
          </button>
        </div>
      </header>

      {err && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          불러오지 못했습니다: {err}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 md:grid-cols-6">
            {[
              { k: '병원', v: summary.hospitals },
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

          {/* Round 181 — 두 엔진을 같은 줄에서 비교. 국내 병원 상품이면 네이버가 본진이다. */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '네이버', imp: summary.naverImpressions, clk: summary.naverClicks, tone: 'text-[#03C75A]' },
              { label: '구글', imp: summary.googleImpressions, clk: summary.googleClicks, tone: 'text-[#4285F4]' },
            ].map((e) => (
              <div key={e.label} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
                <div className={`text-xs font-bold ${e.tone}`}>{e.label}</div>
                <div className="mt-1 flex items-baseline gap-4">
                  <div>
                    <span className="text-2xl font-semibold tabular-nums text-stone-900">{e.clk}</span>
                    <span className="ml-1 text-xs text-stone-500">클릭</span>
                  </div>
                  <div>
                    <span className="text-lg font-medium tabular-nums text-stone-600">{e.imp}</span>
                    <span className="ml-1 text-xs text-stone-400">노출</span>
                  </div>
                  <div className="text-xs text-stone-400">
                    CTR {e.imp > 0 ? ((e.clk * 100) / e.imp).toFixed(1) : '—'}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
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
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              {hospital}
              {list[0]?.focus_tier === 1 && (
                <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] font-medium text-white">집중</span>
              )}
            </h2>
            <span className="text-xs text-stone-500">
              키워드 {list.length}
              {' · '}네이버 클릭 {list.reduce((s, r) => s + Number(r.naver_clicks || 0), 0)}
              {' · '}구글 클릭 {list.reduce((s, r) => s + Number(r.clicks || 0), 0)}
              {' · '}인용 {list.reduce((s, r) => s + Number(r.citations_all || 0), 0)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-[11px] uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-2 font-medium">키워드</th>
                  <th className="px-4 py-2 font-medium">구글 순위</th>
                  <th className="px-4 py-2 font-medium">시작 대비</th>
                  <th className="px-4 py-2 text-right font-medium">목표</th>
                  <th className="px-4 py-2 text-right font-medium text-[#4285F4]">구글 노출</th>
                  <th className="px-4 py-2 text-right font-medium text-[#4285F4]">구글 클릭</th>
                  <th className="px-4 py-2 text-right font-medium text-[#03C75A]">네이버 노출</th>
                  <th className="px-4 py-2 text-right font-medium text-[#03C75A]">네이버 클릭</th>
                  <th className="px-4 py-2 text-right font-medium text-[#03C75A]">N CTR</th>
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
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{r.impressions || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{r.clicks || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{r.naver_impressions || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-stone-800">{r.naver_clicks || '—'}</td>
                      {/* CTR 은 "노출은 있는데 클릭이 없는" 글을 찾는 렌즈다 —
                          강남힐링안과 425 노출 / 0.2% 처럼 제목·description 만 고치면 되는 케이스. */}
                      <td className={`px-4 py-2.5 text-right tabular-nums text-xs ${
                        r.naver_ctr == null ? 'text-stone-300'
                          : r.naver_ctr >= 5 ? 'text-emerald-600'
                          : r.naver_impressions >= 15 ? 'text-rose-600 font-semibold'
                          : 'text-stone-500'}`}>
                        {r.naver_ctr == null ? '—' : `${r.naver_ctr}%`}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${r.posts === 0 ? 'text-rose-500' : 'text-stone-500'}`}>{r.posts}</td>
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
