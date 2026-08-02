/**
 * Round 144 (2026-08-02) — 클라이언트 공개 월간 보고서.
 *
 * `/r/{tenantId}/{yyyy-MM}?t={token}` — 로그인 없이 열림. middleware matcher
 * (`/`, `/api/admin/*`, `/admin/*`) 밖이라 그대로 통과.
 *
 * 설계 원칙 (E2E 감사 반영):
 *   1. **브랜드 등장(mention)과 출처 인용(citation)을 절대 섞지 않는다.**
 *      기존 이메일은 mentions 값을 "AI 인용"으로 라벨링해 실측의 수십 배로
 *      부풀려 보고하는 구조였음.
 *   2. **0이면 0으로 표기한다.** 위서클 콘텐츠 인용이 0건이면 0건이라고 쓴다.
 *   3. **검증 가능한 증거를 같이 준다.** 인용된 URL·질문·엔진·날짜를 그대로 노출해
 *      클라이언트가 직접 확인할 수 있게 한다.
 *   4. 라이브 대시보드가 아니라 **그 기간 스냅샷**. 월 1회 보는 사람에게 매일
 *      흔들리는 숫자를 보여주면 전부 이상해 보인다.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase';
import { loadClassifierSets, classifyDomain, extractDomainFromUrl } from '@/lib/domain-classifier';
import { verifyReportToken, isValidPeriod } from '@/lib/reportToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '월간 AI 검색 노출 보고서 · WECIRCLE',
  robots: { index: false, follow: false },
};

type SourceDomain = { domain?: string; final_url?: string | null };

interface CitationRow {
  url: string;
  domain: string;
  count: number;
  keywords: string[];
  engines: string[];
  lastSeen: string;
}

interface MentionSample {
  engine: string;
  keyword: string;
  snippet: string;
  at: string;
}

interface ReportData {
  tenantName: string;
  periodLabel: string;
  from: string;
  to: string;
  published: number;
  mentions: number;
  queries: number;
  clientSiteCitations: number;
  ownCitations: number;
  clientRows: CitationRow[];
  ownRows: CitationRow[];
  samples: MentionSample[];
  marketTotal: number;
}

function monthRange(period: string): { from: Date; to: Date } {
  const [y, m] = period.split('-').map(Number);
  return {
    from: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)),
    to: new Date(Date.UTC(y, m, 1, 0, 0, 0)),
  };
}

async function loadReport(tenantId: number, period: string): Promise<ReportData | null> {
  const sb = getServerClient();
  if (!sb) return null;

  const { from, to } = monthRange(period);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const { data: t } = await sb
    .from('tenants')
    .select('name, homepage, additional_domains')
    .eq('id', tenantId)
    .maybeSingle();
  if (!t) return null;
  const tenant = t as { name: string; homepage: string | null; additional_domains: string[] | null };

  // 이 병원의 자체 도메인 set (T2 판정)
  const clientDomains = new Set<string>();
  const main = extractDomainFromUrl(tenant.homepage);
  if (main) clientDomains.add(main);
  (tenant.additional_domains ?? []).forEach((d) => {
    const dd = extractDomainFromUrl(d);
    if (dd) clientDomains.add(dd);
  });

  // 발행 콘텐츠
  const { count: published } = await sb
    .from('generated_contents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .gte('published_at', fromIso)
    .lt('published_at', toIso);

  // 측정 질의
  const { data: qs } = await sb
    .from('queries')
    .select('id, engine, keyword_id')
    .eq('tenant_id', tenantId)
    .gte('requested_at', fromIso)
    .lt('requested_at', toIso);
  const queries = (qs ?? []) as Array<{ id: number; engine: string; keyword_id: number }>;
  const queryMeta = new Map(queries.map((q) => [q.id, q]));
  const queryIds = queries.map((q) => q.id);

  // 키워드 텍스트
  const kwIds = [...new Set(queries.map((q) => q.keyword_id))];
  const kwText = new Map<number, string>();
  if (kwIds.length > 0) {
    const { data: kws } = await sb.from('keywords').select('id, text').in('id', kwIds);
    ((kws ?? []) as Array<{ id: number; text: string }>).forEach((k) => kwText.set(k.id, k.text));
  }

  // 브랜드 등장(mention) 수 + 샘플
  const { count: mentions } = await sb
    .from('mentions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_target', true)
    .gte('created_at', fromIso)
    .lt('created_at', toIso);

  const { data: sampleRows } = await sb
    .from('mentions')
    .select('response_id, context_snippet, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_target', true)
    .not('context_snippet', 'is', null)
    .gte('created_at', fromIso)
    .lt('created_at', toIso)
    .order('created_at', { ascending: false })
    .limit(30);

  // 샘플의 질문/엔진을 채우기 위해 response → query 매핑
  const sampleRespIds = [
    ...new Set(((sampleRows ?? []) as Array<{ response_id: number }>).map((r) => r.response_id)),
  ];
  const respToQuery = new Map<number, number>();
  if (sampleRespIds.length > 0) {
    const { data: rs } = await sb
      .from('responses')
      .select('id, query_id')
      .in('id', sampleRespIds.slice(0, 100));
    ((rs ?? []) as Array<{ id: number; query_id: number }>).forEach((r) =>
      respToQuery.set(r.id, r.query_id),
    );
  }
  const seenKw = new Set<string>();
  const samples: MentionSample[] = [];
  for (const s of (sampleRows ?? []) as Array<{
    response_id: number;
    context_snippet: string;
    created_at: string;
  }>) {
    const qid = respToQuery.get(s.response_id);
    const qm = qid ? queryMeta.get(qid) : undefined;
    const kw = qm ? kwText.get(qm.keyword_id) ?? '' : '';
    if (!kw || seenKw.has(kw)) continue; // 키워드당 1개만 — 같은 문구 반복 방지
    seenKw.add(kw);
    samples.push({
      engine: qm?.engine ?? '-',
      keyword: kw,
      snippet: (s.context_snippet || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      at: s.created_at.slice(0, 10),
    });
    if (samples.length >= 5) break;
  }

  // 출처 인용 — responses.source_domains 를 티어별로 집계
  const sets = await loadClassifierSets();
  const clientMap = new Map<string, CitationRow>();
  const ownMap = new Map<string, CitationRow>();
  let marketTotal = 0;

  if (queryIds.length > 0) {
    const { data: resp } = await sb
      .from('responses')
      .select('query_id, source_domains, created_at')
      .in('query_id', queryIds.slice(0, 2000))
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .not('source_domains', 'is', null);

    for (const r of (resp ?? []) as Array<{
      query_id: number;
      source_domains: SourceDomain[] | null;
      created_at: string;
    }>) {
      const qm = queryMeta.get(r.query_id);
      const kw = qm ? kwText.get(qm.keyword_id) ?? '' : '';
      const engine = qm?.engine ?? '-';
      const day = r.created_at.slice(0, 10);

      for (const sd of r.source_domains ?? []) {
        if (!sd?.domain) continue;
        marketTotal++;
        const tier = classifyDomain(
          sd.domain,
          sd.final_url ?? null,
          clientDomains.size > 0 ? clientDomains : null,
          sets,
        );
        if (tier !== 'T1' && tier !== 'T2') continue;
        const url = sd.final_url || `https://${sd.domain}`;
        const target = tier === 'T1' ? ownMap : clientMap;
        const cur = target.get(url) ?? {
          url,
          domain: sd.domain,
          count: 0,
          keywords: [],
          engines: [],
          lastSeen: day,
        };
        cur.count++;
        if (kw && !cur.keywords.includes(kw)) cur.keywords.push(kw);
        if (engine && !cur.engines.includes(engine)) cur.engines.push(engine);
        if (day > cur.lastSeen) cur.lastSeen = day;
        target.set(url, cur);
      }
    }
  }

  const sortDesc = (a: CitationRow, b: CitationRow) => b.count - a.count;
  const clientRows = [...clientMap.values()].sort(sortDesc);
  const ownRows = [...ownMap.values()].sort(sortDesc);

  const [y, m] = period.split('-');
  return {
    tenantName: tenant.name,
    periodLabel: `${y}년 ${Number(m)}월`,
    from: fromIso.slice(0, 10),
    to: new Date(to.getTime() - 86400000).toISOString().slice(0, 10),
    published: published ?? 0,
    mentions: mentions ?? 0,
    queries: queries.length,
    clientSiteCitations: clientRows.reduce((s, r) => s + r.count, 0),
    ownCitations: ownRows.reduce((s, r) => s + r.count, 0),
    clientRows,
    ownRows,
    samples,
    marketTotal,
  };
}

const ENGINE_LABEL: Record<string, string> = {
  gemini: 'Gemini',
  openai: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
};

export default async function PublicReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; period: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { tenantId: tenantIdRaw, period } = await params;
  const { t: token } = await searchParams;

  const tenantId = Number(tenantIdRaw);
  if (!Number.isFinite(tenantId) || !isValidPeriod(period)) notFound();
  if (!verifyReportToken(tenantId, period, token)) notFound();

  const d = await loadReport(tenantId, period);
  if (!d) notFound();

  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh', padding: '32px 16px' }}>
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: '32px 28px',
          fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#0F172A',
          lineHeight: 1.7,
        }}
      >
        {/* 헤더 */}
        <div style={{ borderBottom: '2px solid #0E5A6B', paddingBottom: 14, marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 2,
              color: '#0E5A6B',
              textTransform: 'uppercase',
            }}
          >
            WECIRCLE · Monthly AI Search Report
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 800 }}>{d.tenantName}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            {d.periodLabel} ({d.from} ~ {d.to}) · ChatGPT · Claude · Gemini · Perplexity 4개 엔진 측정
          </p>
        </div>

        {/* 핵심 3지표 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          {[
            {
              v: d.mentions.toLocaleString(),
              l: 'AI 답변에 병원 이름이 등장',
              c: '#0E5A6B',
              sub: `측정 질의 ${d.queries.toLocaleString()}회 중`,
            },
            {
              v: d.clientSiteCitations.toLocaleString(),
              l: '병원 홈페이지가 출처로 인용',
              c: '#15B8A6',
              sub: `${d.clientRows.length}개 URL`,
            },
            {
              v: d.ownCitations.toLocaleString(),
              l: '위서클 콘텐츠가 출처로 인용',
              c: '#4F5DF8',
              sub: `발행 ${d.published}편 중 ${d.ownRows.length}개 URL`,
            },
          ].map((k) => (
            <div
              key={k.l}
              style={{
                flex: 1,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '14px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 11, color: '#334155', marginTop: 4, fontWeight: 600 }}>
                {k.l}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* 지표 정의 — 이 문단이 이 보고서의 핵심 */}
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 12,
            color: '#78350F',
            marginBottom: 24,
          }}
        >
          <strong>두 지표는 다릅니다.</strong> <b>등장</b>은 AI 답변 본문에 병원 이름이 언급된
          횟수이고, <b>출처 인용</b>은 AI 가 답변의 근거 URL 로 해당 사이트를 실제로 표기한
          횟수입니다. 등장이 많다고 해서 우리가 만든 콘텐츠의 성과라고 볼 수는 없습니다.
          이 보고서는 두 가지를 분리해서 보여드립니다.
        </div>

        {/* 병원 홈페이지 인용 */}
        <Section
          title="병원 홈페이지가 출처로 인용된 URL"
          desc="AI 가 답변 근거로 병원 공식 사이트를 직접 표기한 건입니다. 가장 신뢰도 높은 노출입니다."
          rows={d.clientRows}
          accent="#15B8A6"
          emptyText="이번 기간에 병원 홈페이지가 출처로 인용된 기록이 없습니다."
        />

        {/* 위서클 콘텐츠 인용 */}
        <Section
          title="위서클이 발행한 콘텐츠가 출처로 인용된 URL"
          desc="저희가 작성·발행한 글이 AI 답변의 근거로 사용된 건입니다."
          rows={d.ownRows}
          accent="#4F5DF8"
          emptyText={`이번 기간에 위서클 발행 콘텐츠가 출처로 인용된 기록은 없습니다. 발행 ${d.published}편은 색인 적재 중일 수 있습니다(첫 인용까지 통상 5~6주 소요).`}
        />

        {/* 실제 답변 발췌 */}
        {d.samples.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '28px 0 4px' }}>
              AI 가 실제로 답한 내용
            </h2>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>
              병원 이름이 등장한 답변 원문 일부입니다. 직접 같은 질문을 해보시면 확인하실 수 있습니다.
            </p>
            {d.samples.map((s, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 8,
                  background: '#FAFAFA',
                }}
              >
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 5 }}>
                  <b style={{ color: '#0F172A' }}>{ENGINE_LABEL[s.engine] ?? s.engine}</b>
                  {' · 질문 "'}
                  {s.keyword}
                  {'" · '}
                  {s.at}
                </div>
                <div style={{ fontSize: 12.5, color: '#334155' }}>…{s.snippet}…</div>
              </div>
            ))}
          </>
        )}

        {/* 시장 맥락 */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 16,
            borderTop: '1px solid #E2E8F0',
            fontSize: 12,
            color: '#475569',
          }}
        >
          <b>이번 기간 측정 규모</b> — 질의 {d.queries.toLocaleString()}회, AI 가 표기한 출처
          링크 {d.marketTotal.toLocaleString()}건. 이 중 병원 홈페이지{' '}
          {d.clientSiteCitations}건 · 위서클 콘텐츠 {d.ownCitations}건이 인용됐습니다.
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: '1px solid #E2E8F0',
            fontSize: 11,
            color: '#94A3B8',
            lineHeight: 1.6,
          }}
        >
          주식회사 위서클 · wecircle.co.kr
          <br />본 보고서는 자동 측정 데이터를 가공 없이 집계한 것입니다. 수치가 0인 항목은 0으로
          표기합니다.
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  desc,
  rows,
  accent,
  emptyText,
}: {
  title: string;
  desc: string;
  rows: CitationRow[];
  accent: string;
  emptyText: string;
}) {
  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 800, margin: '28px 0 4px' }}>
        <span style={{ color: accent }}>■</span> {title}
      </h2>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px' }}>{desc}</p>
      {rows.length === 0 ? (
        <div
          style={{
            border: '1px dashed #CBD5E1',
            borderRadius: 8,
            padding: '16px 14px',
            fontSize: 12.5,
            color: '#64748B',
            background: '#FAFAFA',
          }}
        >
          {emptyText}
        </div>
      ) : (
        rows.slice(0, 15).map((r) => (
          <div
            key={r.url}
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '11px 13px',
              marginBottom: 7,
            }}
          >
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12.5,
                color: accent,
                fontWeight: 600,
                wordBreak: 'break-all',
                textDecoration: 'none',
              }}
            >
              {r.url.replace(/^https?:\/\//, '')}
            </a>
            <div style={{ marginTop: 5, fontSize: 11, color: '#64748B' }}>
              <span
                style={{
                  background: `${accent}1A`,
                  color: accent,
                  padding: '1px 7px',
                  borderRadius: 20,
                  fontWeight: 700,
                  marginRight: 6,
                }}
              >
                ×{r.count} 인용
              </span>
              {r.keywords.slice(0, 3).map((k) => (
                <span key={k} style={{ marginRight: 6 }}>
                  🔍 {k}
                </span>
              ))}
              <span style={{ marginRight: 6 }}>
                {r.engines.map((e) => ENGINE_LABEL[e] ?? e).join(', ')}
              </span>
              <span style={{ color: '#94A3B8' }}>최근 {r.lastSeen}</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
