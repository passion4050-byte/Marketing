/**
 * Round 33 phase A (2026-05-30) — 키워드 클릭 시 AI 응답 raw 상세 fetch.
 *
 * Query:
 *   ?keyword=잠실+백내장&tenantId=4
 *
 * 응답:
 *   {
 *     keyword, tenant_name,
 *     responses: [
 *       {
 *         engine, query_prompt, raw_text, created_at,
 *         cited_urls: string[],
 *         mentions: [{ brand, weight, context_snippet }],
 *         source_domains: [{ domain, final_url, tier, is_self }]
 *       }
 *     ]
 *   }
 *
 * 가치: 클라이언트 영업 시 "Gemini 가 이렇게 추천했어요" 라며 raw 응답을 보여줌.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const keyword = url.searchParams.get('keyword') ?? '';
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  if (!keyword) {
    return NextResponse.json({ ok: false, error: 'keyword required' }, { status: 400 });
  }

  // 1. 해당 키워드의 keyword id 찾기
  let kwQuery = sb.from('keywords').select('id, text, tenant_id').eq('text', keyword);
  if (tenantIdFilter) kwQuery = kwQuery.eq('tenant_id', tenantIdFilter);
  const { data: keywords } = await kwQuery;
  if (!keywords || keywords.length === 0) {
    return NextResponse.json({ ok: true, keyword, responses: [] });
  }
  const keywordIds = keywords.map((k: { id: number }) => k.id);

  // 2. 해당 키워드의 queries (최근 30일)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: queriesRows } = await sb
    .from('queries')
    .select('id, tenant_id, engine, prompt, requested_at')
    .in('keyword_id', keywordIds)
    .gte('requested_at', cutoff)
    .order('requested_at', { ascending: false })
    .limit(50);
  if (!queriesRows || queriesRows.length === 0) {
    return NextResponse.json({ ok: true, keyword, responses: [] });
  }

  const queryIds = queriesRows.map((q: { id: number }) => q.id);
  const queryMap = new Map(queriesRows.map((q: { id: number }) => [q.id, q]));

  // 3. responses 가져오기
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, raw_text, cited_urls, source_domains, created_at')
    .in('query_id', queryIds)
    .order('created_at', { ascending: false });

  // 4. tenant 이름
  const tenantIds = Array.from(
    new Set(queriesRows.map((q: { tenant_id: number }) => q.tenant_id))
  );
  const tenantMap = new Map<number, string>();
  if (tenantIds.length > 0) {
    const { data: tenants } = await sb.from('tenants').select('id, name').in('id', tenantIds);
    (tenants ?? []).forEach((t: { id: number; name: string }) => {
      tenantMap.set(t.id, t.name);
    });
  }

  // 5. mentions 가져오기 (각 response 의)
  const respIds = (respRows ?? []).map((r: { id: number }) => r.id);
  const mentionsByResp = new Map<
    number,
    Array<{ brand: string; weight: number; context_snippet: string; is_target: boolean }>
  >();
  if (respIds.length > 0) {
    const { data: mentions } = await sb
      .from('mentions')
      .select('response_id, brand, weight, context_snippet, is_target')
      .in('response_id', respIds);
    (mentions ?? []).forEach(
      (m: {
        response_id: number;
        brand: string;
        weight: number;
        context_snippet: string;
        is_target: boolean;
      }) => {
        if (!mentionsByResp.has(m.response_id)) mentionsByResp.set(m.response_id, []);
        mentionsByResp.get(m.response_id)!.push({
          brand: m.brand,
          weight: m.weight,
          context_snippet: m.context_snippet,
          is_target: m.is_target,
        });
      }
    );
  }

  const responses = (respRows ?? []).map(
    (r: {
      id: number;
      query_id: number;
      raw_text: string;
      cited_urls: string[] | null;
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
      created_at: string;
    }) => {
      const q = queryMap.get(r.query_id) as
        | { tenant_id: number; engine: string; prompt: string; requested_at: string }
        | undefined;
      return {
        response_id: r.id,
        engine: q?.engine ?? '?',
        prompt: q?.prompt ?? '',
        tenant_name: q?.tenant_id ? tenantMap.get(q.tenant_id) ?? '?' : '?',
        raw_text: r.raw_text ?? '',
        cited_urls: r.cited_urls ?? [],
        source_domains: r.source_domains ?? [],
        mentions: mentionsByResp.get(r.id) ?? [],
        created_at: r.created_at,
      };
    }
  );

  return NextResponse.json({
    ok: true,
    keyword,
    responses,
  });
}
