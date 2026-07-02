/**
 * GET /api/admin/kakao-referrals
 *
 * Round 110-C (2026-07-02) — 카카오톡 UTM 유입 트래킹.
 *
 * 응답:
 *   {
 *     summary: { total_7d, total_30d, delta, top_event, top_page },
 *     events_30d: [ { event, clicks_7d, clicks_30d, delta } ],
 *     daily_30d: [ { date, total, by_event: {...} } ],
 *     top_pages_30d: [ { page_path, clicks, primary_event } ],
 *     top_campaigns_30d: [ { utm_campaign, clicks } ],
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Referral {
  event: string;
  page_path: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  tenant_id: number | null;
  clicked_at: string;
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ error: 'Supabase client 없음' }, { status: 500 });

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400 * 1000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  const { data: refs, error } = await sb
    .from('kakao_referrals')
    .select('event, page_path, utm_medium, utm_campaign, tenant_id, clicked_at')
    .gte('clicked_at', d30);

  if (error) {
    return NextResponse.json({
      summary: { total_7d: 0, total_30d: 0, delta: 0, top_event: null, top_page: null },
      events_30d: [],
      daily_30d: [],
      top_pages_30d: [],
      top_campaigns_30d: [],
      error: error.message,
    });
  }

  const arr: Referral[] = refs ?? [];
  const total_30d = arr.length;
  const arr7 = arr.filter((r) => r.clicked_at >= d7);
  const total_7d = arr7.length;
  const total_prev_7d = arr.filter((r) => r.clicked_at >= d14 && r.clicked_at < d7).length;

  // event 별 집계
  const eventMap = new Map<string, { c7: number; c30: number; cPrev7: number }>();
  arr.forEach((r) => {
    const s = eventMap.get(r.event) ?? { c7: 0, c30: 0, cPrev7: 0 };
    s.c30 += 1;
    if (r.clicked_at >= d7) s.c7 += 1;
    else if (r.clicked_at >= d14) s.cPrev7 += 1;
    eventMap.set(r.event, s);
  });
  const events_30d = Array.from(eventMap.entries())
    .map(([event, s]) => ({
      event,
      clicks_7d: s.c7,
      clicks_30d: s.c30,
      delta: s.c7 - s.cPrev7,
    }))
    .sort((a, b) => b.clicks_30d - a.clicks_30d);

  // 일별 timeline
  const dailyMap = new Map<string, { total: number; by_event: Record<string, number> }>();
  arr.forEach((r) => {
    const day = r.clicked_at.slice(0, 10);
    const s = dailyMap.get(day) ?? { total: 0, by_event: {} };
    s.total += 1;
    s.by_event[r.event] = (s.by_event[r.event] ?? 0) + 1;
    dailyMap.set(day, s);
  });
  const daily_30d = Array.from(dailyMap.entries())
    .map(([date, s]) => ({ date, total: s.total, by_event: s.by_event }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 페이지 top 10
  const pageMap = new Map<string, { clicks: number; events: Map<string, number> }>();
  arr.forEach((r) => {
    const p = r.page_path ?? '(unknown)';
    const s = pageMap.get(p) ?? { clicks: 0, events: new Map() };
    s.clicks += 1;
    s.events.set(r.event, (s.events.get(r.event) ?? 0) + 1);
    pageMap.set(p, s);
  });
  const top_pages_30d = Array.from(pageMap.entries())
    .map(([page_path, s]) => {
      const top = Array.from(s.events.entries()).sort(([, a], [, b]) => b - a)[0];
      return { page_path, clicks: s.clicks, primary_event: top?.[0] ?? 'unknown' };
    })
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  // campaign top 10
  const campaignMap = new Map<string, number>();
  arr.forEach((r) => {
    if (!r.utm_campaign) return;
    campaignMap.set(r.utm_campaign, (campaignMap.get(r.utm_campaign) ?? 0) + 1);
  });
  const top_campaigns_30d = Array.from(campaignMap.entries())
    .map(([utm_campaign, clicks]) => ({ utm_campaign, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      total_7d,
      total_30d,
      delta: total_7d - total_prev_7d,
      top_event: events_30d[0]?.event ?? null,
      top_page: top_pages_30d[0]?.page_path ?? null,
    },
    events_30d,
    daily_30d,
    top_pages_30d,
    top_campaigns_30d,
    generated_at: now.toISOString(),
  });
}
