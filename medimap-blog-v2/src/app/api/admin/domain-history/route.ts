/**
 * Round 46 (2026-05-31) — 도메인별 인용 추이 API (검증 히스토리).
 *
 * 특정 도메인이 시간별로 몇 회 인용됐는지 추적.
 * 자동 분류 도메인의 가치 검증에 사용.
 *
 * GET /api/admin/domain-history?domain=sueye.co.kr&days=30
 *   응답: { domain, days: [{ date, count }], total, classification }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const domain = url.searchParams.get('domain')?.toLowerCase().trim();
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? 30)));
  if (!domain) return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 });

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 도메인 분류 정보
  const { data: classRow } = await sb
    .from('domain_classifications')
    .select('domain, tier, category, is_active, created_at')
    .eq('domain', domain)
    .single();

  // responses 중 source_domains 에 그 도메인 포함된 것 일자별 count
  // Round 163b — 1,000행 캡 대응
  const resps = await fetchAllRows<{
    source_domains: Array<{ domain: string }> | null;
    created_at: string;
  }>((from, to) =>
    sb
      .from('responses')
      .select('source_domains, created_at')
      .gte('created_at', cutoff)
      .not('source_domains', 'is', null)
      .order('id')
      .range(from, to)
  );

  const dailyMap = new Map<string, number>();
  let total = 0;
  (resps ?? []).forEach((r: { source_domains: Array<{ domain: string }> | null; created_at: string }) => {
    const matched = (r.source_domains ?? []).some(
      (sd: { domain: string }) => sd.domain && sd.domain.toLowerCase() === domain
    );
    if (matched) {
      const dateKey = r.created_at.slice(5, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1);
      total++;
    }
  });

  // fill days
  const result: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const k = dt.toISOString().slice(5, 10);
    result.push({ date: k, count: dailyMap.get(k) ?? 0 });
  }

  return NextResponse.json({
    ok: true,
    domain,
    days: result,
    total,
    classification: classRow ?? null,
  });
}
