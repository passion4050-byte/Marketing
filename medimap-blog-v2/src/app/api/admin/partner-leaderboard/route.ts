/**
 * GET /api/admin/partner-leaderboard
 *
 * Round 109-A (2026-07-03) — 파트너 병원별 30일 AI 인용 리더보드.
 * 사용자 요구: "파트너에게 우리 콘텐츠 덕에 AI 얼마나 노출됐어요" 실증 제공.
 *
 * 응답:
 *   {
 *     partners: [
 *       {
 *         tenant_id, tenant_name, domain_category, partner_slug,
 *         mentions_30d: 123,
 *         mentions_7d: 42,
 *         mentions_delta: +8,   // 최근 7일 vs 이전 7일 증감
 *         published_contents: 5,
 *         engines: { gemini: 80, claude: 30, openai: 13 },
 *         last_mention: '2026-07-02T...',
 *       },
 *       ...
 *     ],
 *     total_mentions_30d: 456,
 *     total_mentions_7d: 158,
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ error: 'Supabase client 없음' }, { status: 500 });

  // 30일 / 7일 시점 기준
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400 * 1000).toISOString();

  // 1. tenants + 발행 콘텐츠 수 (자사 tenant=12 제외)
  const { data: tenants } = await sb
    .from('tenants')
    .select('id, name, domain_category, partner_slug')
    .neq('id', 12)
    .not('partner_slug', 'is', null);

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ partners: [], total_mentions_30d: 0, total_mentions_7d: 0 });
  }

  const tenantIds = tenants.map((t) => t.id);

  // 2. mentions 30일 (self_target 만)
  const { data: mentions30 } = await sb
    .from('mentions')
    .select('tenant_id, created_at, response_id, is_target')
    .in('tenant_id', tenantIds)
    .eq('is_target', true)
    .gte('created_at', d30);

  const mentionsArr = mentions30 ?? [];

  // 3. responses → queries → engine 매핑 (mentions 별로)
  const responseIds = Array.from(new Set(mentionsArr.map((m) => m.response_id).filter(Boolean)));
  const responseToEngine = new Map<number, string>();
  if (responseIds.length > 0) {
    const { data: responses } = await sb
      .from('responses')
      .select('id, query_id')
      .in('id', responseIds);
    const queryIds = Array.from(new Set((responses ?? []).map((r) => r.query_id).filter(Boolean)));
    const { data: queries } = queryIds.length > 0 ? await sb
      .from('queries')
      .select('id, engine')
      .in('id', queryIds) : { data: [] };
    const queryToEngine = new Map<number, string>();
    (queries ?? []).forEach((q) => queryToEngine.set(q.id, q.engine || 'unknown'));
    (responses ?? []).forEach((r) => {
      responseToEngine.set(r.id, queryToEngine.get(r.query_id) || 'unknown');
    });
  }

  // 4. 발행 콘텐츠 수 (30일)
  const { data: contents } = await sb
    .from('generated_contents')
    .select('tenant_id')
    .in('tenant_id', tenantIds)
    .eq('status', 'published');
  const contentCountByTenant = new Map<number, number>();
  (contents ?? []).forEach((c) => {
    contentCountByTenant.set(c.tenant_id, (contentCountByTenant.get(c.tenant_id) || 0) + 1);
  });

  // 5. 집계 (per tenant)
  const partners = tenants.map((t) => {
    const tenantMentions = mentionsArr.filter((m) => m.tenant_id === t.id);
    const mentions_30d = tenantMentions.length;
    const mentions_7d = tenantMentions.filter((m) => m.created_at >= d7).length;
    const mentions_prev_7d = tenantMentions.filter(
      (m) => m.created_at >= d14 && m.created_at < d7,
    ).length;
    const mentions_delta = mentions_7d - mentions_prev_7d;

    const engines: Record<string, number> = {};
    tenantMentions.forEach((m) => {
      const eng = responseToEngine.get(m.response_id!) || 'unknown';
      engines[eng] = (engines[eng] || 0) + 1;
    });

    const last = tenantMentions
      .map((m) => m.created_at)
      .sort()
      .reverse()[0] || null;

    return {
      tenant_id: t.id,
      tenant_name: t.name,
      domain_category: t.domain_category,
      partner_slug: t.partner_slug,
      mentions_30d,
      mentions_7d,
      mentions_delta,
      published_contents: contentCountByTenant.get(t.id) || 0,
      engines,
      last_mention: last,
    };
  });

  // mentions_30d desc 정렬
  partners.sort((a, b) => b.mentions_30d - a.mentions_30d);

  const total_mentions_30d = partners.reduce((sum, p) => sum + p.mentions_30d, 0);
  const total_mentions_7d = partners.reduce((sum, p) => sum + p.mentions_7d, 0);

  return NextResponse.json({
    partners,
    total_mentions_30d,
    total_mentions_7d,
    generated_at: now.toISOString(),
  });
}
