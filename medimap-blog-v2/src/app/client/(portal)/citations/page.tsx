/**
 * Round 152 — 포털 드릴다운: AI 출처 인용 세부 내역.
 * AI 답변이 실제 출처로 표기한 URL 중 우리(위서클 발행 파트너 콘텐츠 + 병원 자체
 * 홈페이지) 인 것을 최근 30일 기준으로 나열. reportMetrics 의 판정 기준과 동일 계열.
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows, fetchByIdChunks } from '@/lib/fetchAllRows';

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
  // 🔴 Round 169 (2026-08-20) — Round 165 회귀 수정.
  //   165 에서 `.limit(1500)`(서버 캡에 잘려 실제 1,000행) 을 fetchAllRows 로 바꾸면서
  //   **tenant 필터가 없다는 사실을 놓쳤다** → 캡이 사라지자 전 테넌트 responses 를
  //   최대 50,000행(직렬 50왕복) 스캔하는 최악의 경로가 됨. force-dynamic 이라 캐시도 없음.
  //   병원 담당자가 원장 앞에서 누르는 화면인데 LTE 에서 수십 초 흰 화면 → 신뢰 붕괴.
  //   수정: reportMetrics.computeCitationCounts 와 동일하게 **queries 를 tenant 로 먼저 좁힌 뒤**
  //   그 query_id 로만 responses 를 청크 조회한다. 0건이라도 빠르게 0을 보여주는 게 신뢰다.
  const [tenantRes, qRows] = await Promise.all([
    sb
      .from('tenants')
      .select('homepage, additional_domains, partner_slug')
      .eq('id', session.tenantId)
      .maybeSingle(),
    fetchAllRows<{ id: number }>((from, to) =>
      sb
        .from('queries')
        .select('id')
        .eq('tenant_id', session.tenantId)
        .gte('requested_at', since)
        .order('id')
        .range(from, to),
    ),
  ]);

  const respRows =
    qRows.length === 0
      ? []
      : await fetchByIdChunks(
          qRows.map((q) => q.id),
          (chunk) =>
            sb
              .from('responses')
              // Round 153 — keywords 실컬럼은 `text` (keyword 아님, 감사 P0-1과 동일 계열)
              .select('created_at, source_domains, queries(engine, keywords(text))')
              .in('query_id', chunk)
              .gte('created_at', since)
              .not('source_domains', 'is', null)
              .order('created_at', { ascending: false }),
        );

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
      {/* Round 169 — 상단 탭 네비가 생겨 '← 홈' 브레드크럼은 중복. 제목 구조를 크게. */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight md:text-xl">AI 출처 인용</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-500 md:text-sm">
          AI 검색이 답변의 <b className="text-stone-700">출처</b>로 실제 표기한 우리 관련 URL 입니다
          <span className="whitespace-nowrap"> (최근 30일)</span>.
        </p>
      </div>

      {items.length === 0 ? (
        /* Round 169 — 0 을 '결과'가 아니라 '과정'으로 읽히게. 원장 보고 시 그대로 인용 가능한 문장. */
        <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <div className="text-[15px] font-bold text-stone-800">아직 출처 인용 기록이 없습니다</div>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-stone-600">
            지금은 AI 검색이 우리 콘텐츠를 <b className="text-stone-800">색인에 적재하는 단계</b>입니다.
            보통 <b className="text-stone-800">발행 후 3~4주</b>부터 AI 답변에 병원 이름이 등장하고,
            <b className="text-stone-800"> 5~6주</b>부터 답변의 출처로 URL 이 표기되기 시작합니다.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
            이름 등장이 먼저 움직이므로, 지금은{' '}
            <Link
              href="/client/mentions"
              className="font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4"
            >
              AI 언급
            </Link>{' '}
            지표를 함께 확인해 주세요.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-2.5 text-[12px] text-stone-400">
            최근 30일 <b className="tabular-nums text-stone-600">{items.length}</b>건
            {items.length >= 100 ? ' (최대 100건 표시)' : ''}
          </div>
          {/* Round 169 — 모바일: URL 을 두 줄까지 접어 보여주고(잘림 금지), 메타는 칩으로 줄바꿈 허용 */}
          <div className="space-y-2.5">
            {items.map((c, i) => (
              <a
                key={i}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-stone-200 bg-white p-4 transition active:bg-stone-50 md:hover:border-stone-300"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={`rounded-md px-2 py-1 font-semibold ${
                      c.kind === '병원 홈페이지'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-stone-900 text-white'
                    }`}
                  >
                    {c.kind}
                  </span>
                  {c.engine ? (
                    <span className="rounded-md bg-stone-100 px-2 py-1 font-medium uppercase text-stone-500">
                      {c.engine}
                    </span>
                  ) : null}
                  <span className="tabular-nums text-stone-400">{fmtDate(c.date)}</span>
                </div>
                {c.keyword ? (
                  <div className="mt-2.5 break-keep text-[13.5px] font-medium leading-snug text-stone-800">
                    “{c.keyword}” 질의에서 인용
                  </div>
                ) : null}
                <div className="mt-1.5 line-clamp-2 break-all text-[12px] leading-relaxed text-stone-500 underline decoration-stone-200 underline-offset-2">
                  {c.url}
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
