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
  focus_tier: number;
  keyword_id: number;
  keyword_text: string;
  target_rank: number | null;
  baseline_rank: number | null;
  current_rank: number | null;
  impressions: number;       // 구글(GSC)
  clicks: number;            // 구글(GSC)
  naver_impressions: number; // 네이버 서치어드바이저
  naver_clicks: number;
  naver_ctr: number | null;
  posts: number;
  citations_30d: number;
  citations_all: number;
  last_cited_at: string | null;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const days = Math.min(180, Math.max(7, Number(sp.get('days') ?? '90') || 90));
  // Round 181 — focus=all 이면 tracked 키워드 전체(비집중 병원 포함).
  //   네이버 클릭 30건 중 다수가 focus_tier=0(벨리셀·청담디어)에서 나왔다는 사실을
  //   기본 화면에서는 감추되, 한 번의 토글로 볼 수 있어야 한다.
  const focusOnly = (sp.get('focus') ?? 'focus') !== 'all';

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('focus_performance_board', { _days: days, _focus_only: focusOnly });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // ⚠ postgrest 는 numeric(avg position) 을 **문자열**로 돌려준다("3.0").
  //   비교연산은 강제변환 덕에 우연히 동작하지만 화면엔 "3.0위" 로 찍히고,
  //   나중에 toFixed/산술을 붙이는 순간 조용히 깨진다. 경계에서 한 번만 정규화한다.
  const num = (v: unknown): number | null =>
    v === null || v === undefined || v === '' ? null : Number(v);
  const rows: BoardRow[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as BoardRow),
    target_rank: num(r.target_rank),
    baseline_rank: num(r.baseline_rank),
    current_rank: num(r.current_rank),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    focus_tier: Number(r.focus_tier ?? 0),
    naver_impressions: Number(r.naver_impressions ?? 0),
    naver_clicks: Number(r.naver_clicks ?? 0),
    naver_ctr: num(r.naver_ctr),
    posts: Number(r.posts ?? 0),
    citations_30d: Number(r.citations_30d ?? 0),
    citations_all: Number(r.citations_all ?? 0),
  }));

  // 목표 달성 = 현재 순위가 target 이하. 순위가 없으면 미진입.
  const achieved = rows.filter((r) => r.current_rank != null && r.target_rank != null
    && r.current_rank <= r.target_rank).length;
  const ranked = rows.filter((r) => r.current_rank != null).length;
  const cited = rows.filter((r) => r.citations_all > 0).length;

  return NextResponse.json({
    ok: true,
    days,
    focusOnly,
    summary: {
      keywords: rows.length,
      ranked,                                   // 구글 순위가 잡힌 키워드
      achieved,                                 // 목표 순위 달성
      cited,                                    // AI 인용이 1회라도 있는 키워드
      citations30d: rows.reduce((s, r) => s + Number(r.citations_30d || 0), 0),
      citationsAll: rows.reduce((s, r) => s + Number(r.citations_all || 0), 0),
      hospitals: new Set(rows.map((r) => r.tenant_id)).size,
      // 🔴 Round 181 — 두 엔진을 나란히. 실측(같은 30일): 네이버가 구글보다 크다.
      googleImpressions: rows.reduce((s, r) => s + Number(r.impressions || 0), 0),
      googleClicks: rows.reduce((s, r) => s + Number(r.clicks || 0), 0),
      naverImpressions: rows.reduce((s, r) => s + Number(r.naver_impressions || 0), 0),
      naverClicks: rows.reduce((s, r) => s + Number(r.naver_clicks || 0), 0),
    },
    rows,
  });
}
