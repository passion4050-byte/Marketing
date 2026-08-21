/**
 * Round 152 — 포털 드릴다운: AI 답변 속 병원 언급 세부 내역.
 * 홈 KPI 카드 클릭 → 최근 30일 언급 목록 (날짜·엔진·측정 키워드·문맥 스니펫).
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** supabase FK 조인은 생성 타입 없으면 배열 추론 — 배열/객체 양쪽 처리 (Round 148 규약) */
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export default async function ClientMentionsPage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null;

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  // 🔴 Round 153 — keywords 의 실컬럼은 `text` (keyword 아님). 잘못된 조인은 PostgREST
  //   400 인데 error 를 버리면 조용히 빈 목록이 됨(감사 P0-1 실사고) → error 표면화.
  const { data, error } = await sb
    .from('mentions')
    .select(
      'created_at, brand, context_snippet, position, responses(queries(engine, keywords(text)))'
    )
    .eq('tenant_id', session.tenantId)
    .eq('is_target', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);

  type Row = {
    created_at: string | null;
    brand: string | null;
    context_snippet: string | null;
    position: number | null;
    responses:
      | { queries: { engine: string | null; keywords: { keyword: string | null } | Array<{ keyword: string | null }> | null } | Array<never> | null }
      | Array<never>
      | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const resp = one(r.responses as never) as
      | { queries?: unknown }
      | undefined;
    const q = one(resp?.queries as never) as
      | { engine?: string | null; keywords?: unknown }
      | undefined;
    const kw = one(q?.keywords as never) as { text?: string | null } | undefined;
    return {
      date: r.created_at,
      brand: r.brand,
      snippet: r.context_snippet,
      position: r.position,
      engine: q?.engine ?? null,
      keyword: kw?.text ?? null,
    };
  });

  return (
    <div>
      <Link href="/client" className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-900">
        ← 홈
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-xl font-bold tracking-tight">AI 답변 속 병원 언급</h1>
        <p className="mt-1.5 break-keep text-[13.5px] leading-relaxed text-stone-500 md:text-sm">
          최근 30일, AI 검색 답변 본문에 우리 병원 이름이 등장한 기록입니다. 최근{' '}
          <span className="font-semibold tabular-nums text-stone-700">{rows.length}</span>건 표시.
        </p>
      </div>

      {error ? (
        <p className="rounded-none border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          데이터를 불러오는 중 일시적 오류가 발생했습니다. 잠시 후 새로고침해 주세요.
        </p>
      ) : rows.length === 0 ? (
        /* Round 169 — 벌거벗은 0 은 해지 사유가 된다. 지금이 '어느 단계'인지 알려준다. */
        <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <div className="text-[15px] font-bold text-stone-800">
            아직 AI 답변에 병원 이름이 등장한 기록이 없습니다
          </div>
          <p className="mt-2.5 break-keep text-[13.5px] leading-relaxed text-stone-600">
            지금은 AI 가 우리 콘텐츠를 <b className="text-stone-800">읽어들이는 단계</b>입니다.
            보통 <b className="text-stone-800">발행 후 3~4주</b>부터 이름 등장이,{' '}
            <b className="text-stone-800">5~6주</b>부터 답변의 출처 인용이 나타납니다.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
            그동안의 진행 상황은{' '}
            <Link
              href="/client/contents"
              className="font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4"
            >
              발행 콘텐츠
            </Link>
            와{' '}
            <Link
              href="/client/traffic"
              className="font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4"
            >
              검색 유입
            </Link>
            에서 확인하실 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-200 border-t-2 border-stone-900 bg-white">
          {rows.map((m, i) => (
            <div key={i} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                <span className="tabular-nums">{fmtDate(m.date)}</span>
                {m.engine ? (
                  <span className="bg-stone-100 px-1.5 py-0.5 font-medium uppercase text-stone-600">
                    {m.engine}
                  </span>
                ) : null}
                {m.keyword ? <span className="text-stone-500">“{m.keyword}” 질의</span> : null}
                {m.position ? <span>답변 내 {m.position}번째 언급</span> : null}
              </div>
              {m.snippet ? (
                <p className="mt-2 border-l-2 border-stone-300 pl-3 text-sm leading-relaxed text-stone-700">
                  {m.snippet.slice(0, 240)}
                  {m.snippet.length > 240 ? '…' : ''}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
