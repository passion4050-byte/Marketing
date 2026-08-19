/**
 * Round 152 — 포털 드릴다운: AI 출처 인용 세부 내역.
 * AI 답변이 실제 출처로 표기한 URL 중 우리(위서클 발행 파트너 콘텐츠 + 병원 자체
 * 홈페이지) 인 것을 최근 30일 기준으로 나열. reportMetrics 의 판정 기준과 동일 계열.
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const dynamic = 'force-dynamic';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export default async function ClientCitationsPage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null;

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [tenantRes, respRows] = await Promise.all([
    sb
      .from('tenants')
      .select('homepage, additional_domains, partner_slug')
      .eq('id', session.tenantId)
      .maybeSingle(),
    // Round 165 — .limit(1500) 은 서버 캡(1,000)에 조용히 잘렸음 (Round 163b 수술에서
    //   포털 페이지가 누락됐던 것) → 페이지네이션 전량 수집.
    fetchAllRows<{
      created_at: string | null;
      source_domains: Array<{ domain?: string | null; final_url?: string | null }> | null;
      queries: unknown;
    }>((from, to) =>
      sb
        .from('responses')
        // Round 153 — keywords 실컬럼은 `text` (keyword 아님, 감사 P0-1과 동일 계열)
        .select('created_at, source_domains, queries(engine, keywords(text))')
        .gte('created_at', since)
        .not('source_domains', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to),
    ),
  ]);

  const tenant = tenantRes.data as {
    homepage: string | null;
    additional_domains: string[] | null;
    partner_slug: string | null;
  } | null;
  const ownDomains = new Set<string>();
  const hp = hostOf(tenant?.homepage);
  if (hp) ownDomains.add(hp);
  for (const d of tenant?.additional_domains ?? []) {
    const h = hostOf(d.startsWith('http') ? d : `https://${d}`) ?? d.replace(/^www\./, '').toLowerCase();
    if (h) ownDomains.add(h);
  }
  const partnerSlug = (tenant?.partner_slug ?? '').toLowerCase();

  type SD = { domain?: string | null; final_url?: string | null };
  type Row = {
    created_at: string | null;
    source_domains: SD[] | null;
    queries: unknown;
  };
  const items: Array<{
    date: string | null;
    url: string;
    kind: '병원 홈페이지' | '위서클 발행';
    engine: string | null;
    keyword: string | null;
  }> = [];

  for (const r of respRows as unknown as Row[]) {
    const q = one(r.queries as never) as { engine?: string | null; keywords?: unknown } | undefined;
    const kw = one(q?.keywords as never) as { text?: string | null } | undefined;
    for (const sd of r.source_domains ?? []) {
      const url = sd?.final_url ?? '';
      if (!url) continue;
      const host = hostOf(url);
      const lower = url.toLowerCase();
      let kind: '병원 홈페이지' | '위서클 발행' | null = null;
      if (host && (ownDomains.has(host) || [...ownDomains].some((d) => host.endsWith(`.${d}`)))) {
        kind = '병원 홈페이지';
      } else if (
        host === 'wecircle.co.kr' &&
        partnerSlug &&
        decodeURIComponent(lower).includes(`/${partnerSlug}/`)
      ) {
        kind = '위서클 발행';
      }
      if (kind) {
        items.push({
          date: r.created_at,
          url,
          kind,
          engine: q?.engine ?? null,
          keyword: kw?.text ?? null,
        });
      }
    }
    if (items.length >= 100) break;
  }

  return (
    <div>
      <Link href="/client" className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-900">
        ← 홈
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-xl font-bold tracking-tight">AI 출처 인용</h1>
        <p className="mt-1 text-sm text-stone-500">
          AI 검색이 답변의 <b>출처</b>로 실제 표기한 우리 관련 URL 입니다 (최근 30일, 최대 100건).
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-none border border-stone-200 bg-white p-6 text-sm leading-relaxed text-stone-500">
          최근 30일 출처 인용 기록이 없습니다. 발행 후 AI 검색이 콘텐츠를 색인해 출처로 쓰기까지
          <b className="text-stone-700"> 통상 5~6주</b>가 걸립니다 — 그 전에는 위의 &lsquo;병원 언급&rsquo;
          지표가 먼저 움직입니다.
        </p>
      ) : (
        <div className="divide-y divide-stone-200 border-t-2 border-stone-900 bg-white">
          {items.map((c, i) => (
            <div key={i} className="px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                <span className="tabular-nums">{fmtDate(c.date)}</span>
                <span
                  className={`px-1.5 py-0.5 font-medium ${
                    c.kind === '병원 홈페이지'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {c.kind}
                </span>
                {c.engine ? <span className="uppercase">{c.engine}</span> : null}
                {c.keyword ? <span>“{c.keyword}” 질의</span> : null}
              </div>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block truncate text-sm text-stone-800 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900"
              >
                {c.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
