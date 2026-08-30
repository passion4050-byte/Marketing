/**
 * GET /api/admin/performance-board?days=90
 *
 * Round 180 (2026-08-30) — 제품 축 전환의 데이터 엔드포인트.
 *
 * 왜 새로 만들었나:
 *   지금까지 어드민의 1급 화면은 '콘텐츠 관리(검수 큐)' 였다. 즉 **발행량**이 중심이었고,
 *   그래서 편수를 늘릴 유인만 남아 카니벌라이즈(청담디어 필러 39편, 해외 동일 제목 3편)를
 *   낳았다. 실측이 말하는 인과는 반대다 — AI 인용 6건 중 4건이 GSC 3위였던 **단 한 편**에서
 *   나왔고, 17위인 369편은 0건이었다.
 *   → 파는 것을 "월 N편"에서 "키워드 N개 상위 진입 + AI 인용 증명"으로 바꾼다.
 *     이 라우트는 그 약속의 이행 상태를 그대로 보여준다.
 *
 * 데이터원은 focus_performance_board RPC 하나뿐이다(집계 로직을 화면마다 재구현하지 않는다).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface BoardRow {
  tenant_id: number;
  partner_slug: string;
  tenant_name: string;
  keyword_id: number;
  keyword_text: string;
  target_rank: number | null;
  baseline_rank: number | null;
  current_rank: number | null;
  impressions: number;
  clicks: number;
  posts: number;
  citations_30d: number;
  citations_all: number;
  last_cited_at: string | null;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const days = Math.min(180, Math.max(7, Number(sp.get('days') ?? '90') || 90));

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('focus_performance_board', { _days: days });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as BoardRow[];

  // 목표 달성 = 현재 순위가 target 이하. 순위가 없으면 미진입.
  const achieved = rows.filter((r) => r.current_rank != null && r.target_rank != null
    && r.current_rank <= r.target_rank).length;
  const ranked = rows.filter((r) => r.current_rank != null).length;
  const cited = rows.filter((r) => r.citations_all > 0).length;

  return NextResponse.json({
    ok: true,
    days,
    summary: {
      keywords: rows.length,
      ranked,                                   // 구글 순위가 잡힌 키워드
      achieved,                                 // 목표 순위 달성
      cited,                                    // AI 인용이 1회라도 있는 키워드
      citations30d: rows.reduce((s, r) => s + Number(r.citations_30d || 0), 0),
      citationsAll: rows.reduce((s, r) => s + Number(r.citations_all || 0), 0),
      hospitals: new Set(rows.map((r) => r.tenant_id)).size,
    },
    rows,
  });
}
