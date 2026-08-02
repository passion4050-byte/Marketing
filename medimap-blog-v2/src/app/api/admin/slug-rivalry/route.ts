/**
 * Round 144 (2026-08-02) — 슬러그/주제 공간 경쟁 현황.
 *
 * 발견 배경: 해외 영문 콘텐츠의 슬러그(`smile-lasik-in-korea` 등)가 경쟁사 URL 과
 *   **완전히 동일**했다. 즉 우리는 같은 주제 공간에서 정면 대결 중이고, 실측상
 *   그 슬러그로 경쟁사 5개 도메인이 15회 인용될 동안 우리는 0회였다.
 *
 * 이 API 가 답하는 것: "우리가 쓴 이 글의 주제를, 지금 누가 가져가고 있는가."
 *   운영자가 키워드 단위로 '이길 수 있는 싸움인지'를 판단할 수 있게 한다.
 *
 * GET /api/admin/slug-rivalry?lang=&limit=
 *   → [{ slug, ourIds, langs, ourCitations, rivalCitations, rivals[], verdict }]
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RivalRow {
  domain: string;
  citations: number;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lang = sp.get('lang');
  const limit = Math.min(60, Math.max(5, Number(sp.get('limit') ?? '25') || 25));

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  // T1 자사 도메인
  const { data: t1rows } = await sb
    .from('domain_classifications')
    .select('domain')
    .eq('tier', 'T1')
    .eq('is_active', true);
  const t1 = ((t1rows ?? []) as Array<{ domain: string }>).map((r) => r.domain.toLowerCase());
  const isT1 = (d: string) => {
    const x = d.toLowerCase().replace(/^www\./, '');
    return t1.some((v) => x === v || x.endsWith('.' + v));
  };

  // 우리 발행 슬러그
  let q = sb
    .from('generated_contents')
    .select('id, slug, title, lang, published_at')
    .eq('status', 'published')
    .not('slug', 'is', null)
    .limit(1000);
  if (lang) q = q.eq('lang', lang);
  const { data: pubs } = await q;

  const bySlug = new Map<
    string,
    { slug: string; ids: number[]; langs: string[]; title: string | null; published: string | null }
  >();
  for (const g of (pubs ?? []) as Array<{
    id: number;
    slug: string;
    title: string | null;
    lang: string | null;
    published_at: string | null;
  }>) {
    const key = g.slug.toLowerCase();
    const cur = bySlug.get(key) ?? {
      slug: g.slug,
      ids: [],
      langs: [],
      title: g.title,
      published: g.published_at,
    };
    cur.ids.push(g.id);
    if (g.lang && !cur.langs.includes(g.lang)) cur.langs.push(g.lang);
    if (!cur.published || (g.published_at && g.published_at < cur.published)) {
      cur.published = g.published_at;
    }
    bySlug.set(key, cur);
  }
  if (bySlug.size === 0) return NextResponse.json({ ok: true, rows: [] });

  // 전체 인용 URL 스캔 (도메인 + 경로)
  const { data: resp } = await sb
    .from('responses')
    .select('source_domains')
    .not('source_domains', 'is', null)
    .limit(20000);

  // slug → { ours, rivals }
  const agg = new Map<string, { ours: number; rivals: Map<string, number> }>();
  for (const r of (resp ?? []) as Array<{
    source_domains: Array<{ domain?: string; final_url?: string | null }> | null;
  }>) {
    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain || !sd.final_url) continue;
      const path = sd.final_url.toLowerCase().split('?')[0].replace(/\/$/, '');
      const last = path.split('/').pop() ?? '';
      if (!last) continue;
      const entry = bySlug.get(last);
      if (!entry) continue;
      const a = agg.get(last) ?? { ours: 0, rivals: new Map<string, number>() };
      if (isT1(sd.domain)) {
        a.ours++;
      } else {
        const dom = sd.domain.toLowerCase().replace(/^www\./, '');
        a.rivals.set(dom, (a.rivals.get(dom) ?? 0) + 1);
      }
      agg.set(last, a);
    }
  }

  const rows = [...bySlug.entries()]
    .map(([key, e]) => {
      const a = agg.get(key) ?? { ours: 0, rivals: new Map<string, number>() };
      const rivals: RivalRow[] = [...a.rivals.entries()]
        .map(([domain, citations]) => ({ domain, citations }))
        .sort((x, y) => y.citations - x.citations);
      const rivalCitations = rivals.reduce((s, r) => s + r.citations, 0);
      const ageDays = e.published
        ? Math.floor((Date.now() - new Date(e.published).getTime()) / 86400000)
        : null;

      // 판정 — 운영자가 바로 행동을 고를 수 있게
      let verdict: 'contested_losing' | 'contested_winning' | 'uncontested' | 'no_signal';
      if (rivalCitations > 0 && a.ours === 0) verdict = 'contested_losing';
      else if (rivalCitations > 0 && a.ours > 0) verdict = 'contested_winning';
      else if (rivalCitations === 0 && a.ours > 0) verdict = 'uncontested';
      else verdict = 'no_signal';

      return {
        slug: e.slug,
        title: e.title,
        ids: e.ids,
        langs: e.langs,
        articleCount: e.ids.length,
        ageDays,
        mature: ageDays != null && ageDays >= 42,
        ourCitations: a.ours,
        rivalCitations,
        rivalDomainCount: rivals.length,
        rivals: rivals.slice(0, 6),
        verdict,
      };
    })
    // 경쟁이 실제로 관측된 것만 = 의사결정 가치가 있는 행
    .filter((r) => r.rivalCitations > 0 || r.ourCitations > 0)
    .sort((a, b) => b.rivalCitations - a.rivalCitations)
    .slice(0, limit);

  return NextResponse.json(
    {
      ok: true,
      rows,
      summary: {
        contestedLosing: rows.filter((r) => r.verdict === 'contested_losing').length,
        contestedWinning: rows.filter((r) => r.verdict === 'contested_winning').length,
        uncontested: rows.filter((r) => r.verdict === 'uncontested').length,
        totalRivalCitations: rows.reduce((s, r) => s + r.rivalCitations, 0),
        totalOurCitations: rows.reduce((s, r) => s + r.ourCitations, 0),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
