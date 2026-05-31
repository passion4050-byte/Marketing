/**
 * Round 36 fix 3 (2026-05-31) — URL 메타 구조 학습 API.
 *
 * POST /api/admin/learn-from-url
 *   body: { url, domain_category?, keyword?, tenant_id?, source_domain?, source_tier? }
 *   동작: URL fetch → 메타 구조 분석 → 결과 반환 (DB 저장 안 함, 미리보기 only)
 *
 * POST /api/admin/learn-from-url?save=true
 *   body: 위 + { patterns, notes? }
 *   동작: learned_insights INSERT (ON CONFLICT UPDATE)
 *
 * 추출 signals:
 *   - title text + length
 *   - h1/h2/h3 count + 평균 길이
 *   - body word count (KO/EN 혼합)
 *   - JSON-LD Schema (FAQPage / MedicalProcedure / Article 등)
 *   - image count + alt 텍스트 사용 비율
 *   - meta description length
 *   - internal link count
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Patterns = {
  title: { text: string; length: number } | null;
  meta_description: { text: string; length: number } | null;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  h2_samples: string[];           // 처음 5개
  word_count: number;
  image_count: number;
  image_with_alt_count: number;
  internal_link_count: number;
  schema_types: string[];          // FAQPage / MedicalProcedure / Article ...
  has_faq_schema: boolean;
  has_medical_schema: boolean;
  table_count: number;
  ul_ol_count: number;
};

async function fetchHtml(url: string, timeoutMs = 8000): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MedimapLearnBot/1.0; +https://medi-map.co.kr)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    return { html, finalUrl: res.url };
  } catch {
    return null;
  }
}

function analyzePatterns(html: string, baseUrl: string): Patterns {
  // title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  // meta description
  const metaDescMatch = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  const metaDescText = metaDescMatch ? metaDescMatch[1].trim() : '';

  // heading counts
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

  // h2 샘플 (처음 5개)
  const h2Samples: string[] = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let h2m: RegExpExecArray | null;
  while ((h2m = h2Regex.exec(html)) !== null && h2Samples.length < 5) {
    const text = h2m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) h2Samples.push(text.slice(0, 80));
  }

  // word count — body 추출 후 script/style 제거 + 텍스트만
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyText = '';
  if (bodyMatch) {
    bodyText = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // word count — 한국어/영어 혼합 단순 추정 (공백 분리 + 한글 묶음 단위)
  const wordCount = bodyText ? bodyText.split(/\s+/).filter((w) => w.length > 0).length : 0;

  // image count + alt
  const imageMatches = html.match(/<img[^>]+>/gi) || [];
  const imageCount = imageMatches.length;
  const imageWithAltCount = imageMatches.filter((tag) => /\salt=["'][^"']+["']/i.test(tag)).length;

  // internal link count
  let baseHost = '';
  try {
    baseHost = new URL(baseUrl).hostname;
  } catch {
    /* ignore */
  }
  let internalLinkCount = 0;
  if (baseHost) {
    const anchorRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let am: RegExpExecArray | null;
    while ((am = anchorRegex.exec(html)) !== null) {
      try {
        const u = new URL(am[1], baseUrl);
        if (u.hostname === baseHost) internalLinkCount++;
      } catch {
        /* ignore */
      }
    }
  }

  // JSON-LD Schema 추출
  const schemaTypes: Set<string> = new Set();
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldm: RegExpExecArray | null;
  while ((ldm = ldRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(ldm[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item: { '@type'?: string | string[] }) => {
        const t = item['@type'];
        if (typeof t === 'string') schemaTypes.add(t);
        else if (Array.isArray(t)) t.forEach((tt) => schemaTypes.add(tt));
      });
    } catch {
      /* ignore JSON parse error */
    }
  }
  const schemaArr = Array.from(schemaTypes);
  const hasFaqSchema = schemaArr.includes('FAQPage');
  const hasMedicalSchema = schemaArr.some((t) =>
    ['MedicalProcedure', 'MedicalCondition', 'MedicalOrganization', 'Hospital'].includes(t)
  );

  // table / list count
  const tableCount = (html.match(/<table[^>]*>/gi) || []).length;
  const ulOlCount = (html.match(/<[uo]l[^>]*>/gi) || []).length;

  return {
    title: titleText ? { text: titleText, length: titleText.length } : null,
    meta_description: metaDescText ? { text: metaDescText, length: metaDescText.length } : null,
    h1_count: h1Count,
    h2_count: h2Count,
    h3_count: h3Count,
    h2_samples: h2Samples,
    word_count: wordCount,
    image_count: imageCount,
    image_with_alt_count: imageWithAltCount,
    internal_link_count: internalLinkCount,
    schema_types: schemaArr,
    has_faq_schema: hasFaqSchema,
    has_medical_schema: hasMedicalSchema,
    table_count: tableCount,
    ul_ol_count: ulOlCount,
  };
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const save = new URL(req.url).searchParams.get('save') === 'true';
  const body = (await req.json().catch(() => ({}))) as {
    url?: string;
    domain_category?: string;
    keyword?: string;
    tenant_id?: number;
    source_domain?: string;
    source_tier?: string;
    patterns?: Patterns;
    notes?: string;
  };

  const url = body.url?.trim() ?? '';
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ ok: false, error: 'url required (http/https)' }, { status: 400 });
  }

  // save 모드: 이미 분석된 patterns 받아서 DB INSERT (UPSERT)
  if (save) {
    if (!body.patterns) {
      return NextResponse.json({ ok: false, error: 'patterns required when save=true' }, { status: 400 });
    }
    const { error } = await sb
      .from('learned_insights')
      .upsert(
        {
          source_url: url,
          source_domain: body.source_domain ?? null,
          source_tier: body.source_tier ?? null,
          domain_category: body.domain_category ?? null,
          keyword: body.keyword ?? null,
          tenant_id: body.tenant_id ?? null,
          patterns: body.patterns,
          notes: body.notes ?? null,
          applied: true,
          applied_at: new Date().toISOString(),
        },
        { onConflict: 'source_url,keyword' }
      );
    if (error) {
      return NextResponse.json({ ok: false, error: `DB INSERT 실패: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, saved: true, source_url: url });
  }

  // analyze 모드: URL fetch + 패턴 분석 (DB 안 건드림)
  const fetched = await fetchHtml(url);
  if (!fetched) {
    return NextResponse.json(
      { ok: false, error: 'URL fetch 실패 (timeout/4xx/5xx)', url },
      { status: 502 }
    );
  }

  const patterns = analyzePatterns(fetched.html, fetched.finalUrl);

  return NextResponse.json({
    ok: true,
    source_url: url,
    fetched_url: fetched.finalUrl,
    patterns,
    note: '운영자 검수 후 save=true 로 호출하면 learned_insights 누적. Phase 2 (다음 라운드) 에서 콘텐츠 생성 시 적용.',
  });
}
