/**
 * GET /api/admin/crawler-stats
 *
 * Round 110-B (2026-07-02) — AI 크롤러 방문 통계.
 *
 * 응답:
 *   {
 *     summary: {
 *       total_7d: 123,
 *       total_30d: 456,
 *       unique_bots_7d: 5,
 *       top_bot: 'gptbot',
 *     },
 *     bots_30d: [
 *       { bot_name, hits_7d, hits_30d, hits_delta, share_pct }
 *     ],
 *     daily_30d: [ { date, total, by_bot: { gptbot: 12, ... } } ],
 *     top_paths_30d: [ { path, hits, top_bot } ],
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Hit {
  bot_name: string;
  path: string;
  hit_at: string;
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ error: 'Supabase client 없음' }, { status: 500 });

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400 * 1000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400 * 1000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  const { data: hits, error } = await sb
    .from('crawler_hits')
    .select('bot_name, path, hit_at')
    .gte('hit_at', d30);

  if (error) {
    // 테이블 없음 등 — 빈 응답
    return NextResponse.json({
      summary: { total_7d: 0, total_30d: 0, unique_bots_7d: 0, top_bot: null },
      bots_30d: [],
      daily_30d: [],
      top_paths_30d: [],
      error: error.message,
    });
  }

  const arr: Hit[] = hits ?? [];
  const total_30d = arr.length;
  const hits7 = arr.filter((h) => h.hit_at >= d7);
  const total_7d = hits7.length;
  const hits_prev_7d = arr.filter((h) => h.hit_at >= d14 && h.hit_at < d7).length;

  // 봇별 30일 집계
  const botMap = new Map<string, { hits_7d: number; hits_30d: number; hits_prev_7d: number }>();
  arr.forEach((h) => {
    const s = botMap.get(h.bot_name) ?? { hits_7d: 0, hits_30d: 0, hits_prev_7d: 0 };
    s.hits_30d += 1;
    if (h.hit_at >= d7) s.hits_7d += 1;
    else if (h.hit_at >= d14) s.hits_prev_7d += 1;
    botMap.set(h.bot_name, s);
  });

  const bots_30d = Array.from(botMap.entries())
    .map(([bot_name, s]) => ({
      bot_name,
      hits_7d: s.hits_7d,
      hits_30d: s.hits_30d,
      hits_delta: s.hits_7d - s.hits_prev_7d,
      share_pct: total_30d > 0 ? Math.round((s.hits_30d / total_30d) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.hits_30d - a.hits_30d);

  const unique_bots_7d = new Set(hits7.map((h) => h.bot_name)).size;
  const top_bot = bots_30d[0]?.bot_name ?? null;

  // 일별 30일 timeline
  const dailyMap = new Map<string, { total: number; by_bot: Record<string, number> }>();
  arr.forEach((h) => {
    const day = h.hit_at.slice(0, 10);
    const s = dailyMap.get(day) ?? { total: 0, by_bot: {} };
    s.total += 1;
    s.by_bot[h.bot_name] = (s.by_bot[h.bot_name] ?? 0) + 1;
    dailyMap.set(day, s);
  });
  const daily_30d = Array.from(dailyMap.entries())
    .map(([date, s]) => ({ date, total: s.total, by_bot: s.by_bot }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 경로 top 10
  const pathMap = new Map<string, { hits: number; bots: Map<string, number> }>();
  arr.forEach((h) => {
    const s = pathMap.get(h.path) ?? { hits: 0, bots: new Map() };
    s.hits += 1;
    s.bots.set(h.bot_name, (s.bots.get(h.bot_name) ?? 0) + 1);
    pathMap.set(h.path, s);
  });
  const top_paths_30d = Array.from(pathMap.entries())
    .map(([path, s]) => {
      const top = Array.from(s.bots.entries()).sort(([, a], [, b]) => b - a)[0];
      return { path, hits: s.hits, top_bot: top?.[0] ?? 'unknown' };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      total_7d,
      total_30d,
      unique_bots_7d,
      top_bot,
      wow_delta: total_7d - hits_prev_7d,
    },
    bots_30d,
    daily_30d,
    top_paths_30d,
    generated_at: now.toISOString(),
  });
}
