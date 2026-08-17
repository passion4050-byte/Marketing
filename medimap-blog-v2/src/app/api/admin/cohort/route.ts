/**
 * Round 144 (2026-08-02) — 발행일 코호트 분석.
 *
 * GET /api/admin/cohort?lang=&tenantId=
 *
 * 질문: "215편 발행했는데 인용 5개"는 실패인가, 아직 색인이 안 된 미성숙인가?
 *
 * 실측 배경 (2026-08-02):
 *   - 전체 발행물의 82%가 6주 미만. 가장 오래된 글도 10주.
 *   - <6주 코호트 인용률 0.57% vs 6주+ 6.90% (점추정 12배)
 *   - 다만 Wilson 95% CI 가 겹쳐(3.15% vs 1.91%) 통계적으로는 미확정
 *   - 첫 인용까지 실측 22~39일
 *
 * ⚠️ 슬러그 매칭 시 반드시 T1 도메인으로 제한할 것.
 *   해외 영문 슬러그(smile-lasik-in-korea 등)가 경쟁사 URL 과 동일해서,
 *   제한 없이 매칭하면 경쟁사 인용이 우리 것으로 잡혀 인용률이 15.8% 로 뻥튀기됨(오탐 실측).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Wilson score interval (95%) — 소표본에서 정규근사보다 안전. */
function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, (c - h) * 100), Math.min(100, (c + h) * 100)];
}

const BUCKETS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: 'w0_2', label: '0~2주', min: 0, max: 14 },
  { key: 'w2_4', label: '2~4주', min: 14, max: 28 },
  { key: 'w4_6', label: '4~6주', min: 28, max: 42 },
  { key: 'w6_8', label: '6~8주', min: 42, max: 56 },
  { key: 'w8_10', label: '8~10주', min: 56, max: 70 },
  { key: 'w10p', label: '10주+', min: 70, max: 100000 },
];

/**
 * 성숙 기준 — 첫 인용까지 실측 22~39일이라 42일(6주)을 임계로 둔다.
 *
 * ⚠️ `export` 금지. Next.js 의 route.ts 는 허용된 export 이름만 받는다
 *   (GET/POST/... · runtime · dynamic · revalidate 등). 임의 상수를 export 하면
 *   "X is not a valid Route export field" 로 **빌드가 실패**한다. (Round 144 실사고)
 *   외부에서 써야 하면 별도 lib 파일로 옮길 것.
 */
const MATURE_DAYS = 42;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get('lang');
  const tenantId = sp.get('tenantId');

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  // 1) T1(자사) 도메인 셋
  const { data: t1rows } = await sb
    .from('domain_classifications')
    .select('domain')
    .eq('tier', 'T1')
    .eq('is_active', true);
  const t1 = ((t1rows ?? []) as Array<{ domain: string }>).map((r) => r.domain.toLowerCase());
  const isT1 = (domain: string) => {
    const d = domain.toLowerCase().replace(/^www\./, '');
    return t1.some((x) => d === x || d.endsWith('.' + x));
  };

  // 2) 자사 도메인으로 인용된 URL + 최초 인용 시각
  // Round 163b — .limit(20000) 은 서버 캡(1,000)에 잘렸음 → 페이지네이션 전량 수집
  const resp = await fetchAllRows<{
    source_domains: Array<{ domain?: string; final_url?: string | null }> | null;
    created_at: string;
  }>((from, to) =>
    sb
      .from('responses')
      .select('source_domains, created_at')
      .not('source_domains', 'is', null)
      .order('id')
      .range(from, to)
  );
  const firstCited = new Map<string, string>(); // url(lower) → ISO
  for (const r of (resp ?? []) as Array<{
    source_domains: Array<{ domain?: string; final_url?: string | null }> | null;
    created_at: string;
  }>) {
    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain || !sd.final_url) continue;
      if (!isT1(sd.domain)) continue; // ← 오탐 차단 지점
      const u = sd.final_url.toLowerCase();
      const prev = firstCited.get(u);
      if (!prev || r.created_at < prev) firstCited.set(u, r.created_at);
    }
  }
  const citedUrls = [...firstCited.entries()];

  // 3) 발행물
  let q = sb
    .from('generated_contents')
    .select('id, slug, title, published_at, lang, tenant_id')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .not('slug', 'is', null)
    .limit(2000);
  if (lang) q = q.eq('lang', lang);
  if (tenantId) q = q.eq('tenant_id', Number(tenantId));
  const { data: pubs } = await q;

  const now = Date.now();
  type Row = {
    id: number;
    slug: string;
    title: string | null;
    published_at: string;
    ageDays: number;
    firstCitedAt: string | null;
    daysToCite: number | null;
  };
  const rows: Row[] = ((pubs ?? []) as Array<{
    id: number;
    slug: string;
    title: string | null;
    published_at: string;
    lang: string | null;
  }>).map((g) => {
    const slug = g.slug.toLowerCase();
    // 슬러그가 URL 경로의 마지막 세그먼트인 경우만 매칭
    let fc: string | null = null;
    for (const [u, at] of citedUrls) {
      const path = u.split('?')[0].replace(/\/$/, '');
      if (path.endsWith('/' + slug)) {
        if (!fc || at < fc) fc = at;
      }
    }
    const ageDays = Math.floor((now - new Date(g.published_at).getTime()) / 86400000);
    return {
      id: g.id,
      slug: g.slug,
      title: g.title,
      published_at: g.published_at,
      ageDays,
      firstCitedAt: fc,
      daysToCite: fc
        ? Math.floor((new Date(fc).getTime() - new Date(g.published_at).getTime()) / 86400000)
        : null,
    };
  });

  // 4) 버킷 집계
  const buckets = BUCKETS.map((b) => {
    const inB = rows.filter((r) => r.ageDays >= b.min && r.ageDays < b.max);
    const cited = inB.filter((r) => r.firstCitedAt).length;
    const [lo, hi] = wilson(cited, inB.length);
    return {
      key: b.key,
      label: b.label,
      articles: inB.length,
      cited,
      pct: inB.length ? Math.round((cited / inB.length) * 10000) / 100 : 0,
      ciLow: Math.round(lo * 100) / 100,
      ciHigh: Math.round(hi * 100) / 100,
      mature: b.min >= MATURE_DAYS,
    };
  });

  // 5) 성숙/미성숙 요약
  const mature = rows.filter((r) => r.ageDays >= MATURE_DAYS);
  const immature = rows.filter((r) => r.ageDays < MATURE_DAYS);
  const matureCited = mature.filter((r) => r.firstCitedAt).length;
  const immatureCited = immature.filter((r) => r.firstCitedAt).length;
  const [mLo, mHi] = wilson(matureCited, mature.length);
  const [iLo, iHi] = wilson(immatureCited, immature.length);

  const daysToCiteList = rows.map((r) => r.daysToCite).filter((d): d is number => d != null);
  const avgDaysToCite = daysToCiteList.length
    ? Math.round((daysToCiteList.reduce((s, d) => s + d, 0) / daysToCiteList.length) * 10) / 10
    : null;

  const maturePct = mature.length ? matureCited / mature.length : 0;

  return NextResponse.json(
    {
      ok: true,
      total: rows.length,
      matureDays: MATURE_DAYS,
      buckets,
      summary: {
        mature: mature.length,
        matureCited,
        maturePct: Math.round(maturePct * 10000) / 100,
        matureCi: [Math.round(mLo * 100) / 100, Math.round(mHi * 100) / 100],
        immature: immature.length,
        immatureCited,
        immaturePct: immature.length
          ? Math.round((immatureCited / immature.length) * 10000) / 100
          : 0,
        immatureCi: [Math.round(iLo * 100) / 100, Math.round(iHi * 100) / 100],
        immatureShare: rows.length
          ? Math.round((immature.length / rows.length) * 1000) / 10
          : 0,
        avgDaysToCite,
        // 통계적 유의성 — CI 가 겹치면 "차이 미확정"
        ciOverlap: mLo < iHi,
        // 전량 성숙 시 기대 인용 글 수 (보수/점추정/낙관)
        projection: {
          low: Math.round(rows.length * (mLo / 100) * 10) / 10,
          mid: Math.round(rows.length * maturePct * 10) / 10,
          high: Math.round(rows.length * (mHi / 100) * 10) / 10,
        },
      },
      citedArticles: rows
        .filter((r) => r.firstCitedAt)
        .sort((a, b) => (a.daysToCite ?? 0) - (b.daysToCite ?? 0))
        .map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          published: r.published_at.slice(0, 10),
          firstCited: r.firstCitedAt!.slice(0, 10),
          daysToCite: r.daysToCite,
        })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
