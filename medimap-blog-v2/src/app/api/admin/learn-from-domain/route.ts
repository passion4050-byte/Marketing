/**
 * Round 36 fix 3 (2026-05-31) — 도메인 단위 일괄 분석 + 종합 진단 API.
 *
 * 한 도메인의 여러 URL 을 병렬 fetch → 메타 구조 추출 → 평균/공통점 집계
 *   → 메디맵 가이드 v3 와 비교 → 자연어 진단 제공.
 *
 * POST /api/admin/learn-from-domain
 *   body: { domain, urls[], keywords?, domain_category?, tenant_id?, source_tier? }
 *   응답: { summary, per_url, diagnosis, recommendation }
 *
 * POST /api/admin/learn-from-domain?save=true
 *   body: 위 + { summary, diagnosis, notes? }
 *   동작: learned_insights INSERT (도메인 단위, source_url = https://{domain}/)
 *
 * 안전 장치:
 *   - 병렬 fetch 5개씩 (over-load 방지)
 *   - 각 URL 5초 timeout (Vercel 30초 한도 안)
 *   - 실패 URL skip → 성공한 것만 종합
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UrlPatterns = {
  url: string;
  title_length: number;
  meta_desc_length: number;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  word_count: number;
  image_count: number;
  image_with_alt_count: number;
  internal_link_count: number;
  schema_types: string[];
  has_faq_schema: boolean;
  has_medical_schema: boolean;
  table_count: number;
  ul_ol_count: number;
};

type Summary = {
  urls_analyzed: number;
  urls_failed: number;
  avg_title_length: number;
  avg_word_count: number;
  avg_h2_count: number;
  avg_h3_count: number;
  avg_image_count: number;
  avg_internal_link_count: number;
  faq_schema_rate: number;       // 0~1
  medical_schema_rate: number;   // 0~1
  schema_types_top: string[];
  alt_text_coverage_rate: number;
  table_usage_rate: number;
  list_usage_rate: number;
};

// 메디맵 콘텐츠 baseline — DB 의 content_settings.content_baseline 에서 로드.
// 운영자가 /admin/learned-insights 에서 수정 가능. 로드 실패 시 default fallback.
const DEFAULT_BASELINE = {
  title_length: 35,
  word_count: 850,
  h2_count: 6,
  h3_count: 8,
  image_count: 5,
  internal_link_count: 3,
  faq_schema_rate: 0,
  medical_schema_rate: 0,
};
type Baseline = typeof DEFAULT_BASELINE;

async function loadBaseline(
  sb: ReturnType<typeof getServerClient>,
  domainCategory?: string | null
): Promise<Baseline> {
  if (!sb) return DEFAULT_BASELINE;
  // Round 43 G — 카테고리별 baseline 우선 (content_baseline_안과 등) → 글로벌 baseline → DEFAULT
  const keys = [
    domainCategory ? `content_baseline_${domainCategory}` : null,
    'content_baseline',
  ].filter(Boolean) as string[];
  for (const key of keys) {
    try {
      const { data } = await sb
        .from('content_settings')
        .select('setting_value')
        .eq('setting_key', key)
        .single();
      if (data?.setting_value) {
        const parsed = JSON.parse(data.setting_value as string);
        return { ...DEFAULT_BASELINE, ...parsed };
      }
    } catch {
      /* try next key */
    }
  }
  return DEFAULT_BASELINE;
}

async function fetchHtml(url: string, timeoutMs = 5000): Promise<string | null> {
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
    return await res.text();
  } catch {
    return null;
  }
}

function analyzePatterns(url: string, html: string): UrlPatterns {
  // title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  // meta description
  const metaDescMatch = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  const metaDescText = metaDescMatch ? metaDescMatch[1].trim() : '';

  // headings
  const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

  // body word count
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let wordCount = 0;
  if (bodyMatch) {
    const bodyText = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;
  }

  // images
  const imageMatches = html.match(/<img[^>]+>/gi) || [];
  const imageCount = imageMatches.length;
  const imageWithAltCount = imageMatches.filter((tag) => /\salt=["'][^"']+["']/i.test(tag)).length;

  // internal links
  let baseHost = '';
  try {
    baseHost = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  let internalLinkCount = 0;
  if (baseHost) {
    const anchorRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    let am: RegExpExecArray | null;
    while ((am = anchorRegex.exec(html)) !== null) {
      try {
        const u = new URL(am[1], url);
        if (u.hostname === baseHost) internalLinkCount++;
      } catch {
        /* ignore */
      }
    }
  }

  // JSON-LD Schema
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
      /* ignore */
    }
  }
  const schemaArr = Array.from(schemaTypes);

  return {
    url,
    title_length: titleText.length,
    meta_desc_length: metaDescText.length,
    h1_count: h1Count,
    h2_count: h2Count,
    h3_count: h3Count,
    word_count: wordCount,
    image_count: imageCount,
    image_with_alt_count: imageWithAltCount,
    internal_link_count: internalLinkCount,
    schema_types: schemaArr,
    has_faq_schema: schemaArr.includes('FAQPage'),
    has_medical_schema: schemaArr.some((t) =>
      ['MedicalProcedure', 'MedicalCondition', 'MedicalOrganization', 'Hospital'].includes(t)
    ),
    table_count: (html.match(/<table[^>]*>/gi) || []).length,
    ul_ol_count: (html.match(/<[uo]l[^>]*>/gi) || []).length,
  };
}

function summarize(perUrl: UrlPatterns[]): Summary {
  const n = perUrl.length;
  if (n === 0) {
    return {
      urls_analyzed: 0,
      urls_failed: 0,
      avg_title_length: 0,
      avg_word_count: 0,
      avg_h2_count: 0,
      avg_h3_count: 0,
      avg_image_count: 0,
      avg_internal_link_count: 0,
      faq_schema_rate: 0,
      medical_schema_rate: 0,
      schema_types_top: [],
      alt_text_coverage_rate: 0,
      table_usage_rate: 0,
      list_usage_rate: 0,
    };
  }
  const avg = (key: keyof UrlPatterns) =>
    Math.round((perUrl.reduce((s, p) => s + (p[key] as number), 0) / n) * 10) / 10;
  const rate = (pred: (p: UrlPatterns) => boolean) => perUrl.filter(pred).length / n;

  // schema types 빈도 top
  const typeCount = new Map<string, number>();
  perUrl.forEach((p) => p.schema_types.forEach((t) => typeCount.set(t, (typeCount.get(t) ?? 0) + 1)));
  const schemaTop = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  // alt 텍스트 커버리지 — 이미지가 0 인 페이지는 제외하고 평균
  const withImages = perUrl.filter((p) => p.image_count > 0);
  const altCoverage =
    withImages.length > 0
      ? withImages.reduce((s, p) => s + p.image_with_alt_count / p.image_count, 0) / withImages.length
      : 0;

  return {
    urls_analyzed: n,
    urls_failed: 0, // caller 가 채움
    avg_title_length: avg('title_length'),
    avg_word_count: avg('word_count'),
    avg_h2_count: avg('h2_count'),
    avg_h3_count: avg('h3_count'),
    avg_image_count: avg('image_count'),
    avg_internal_link_count: avg('internal_link_count'),
    faq_schema_rate: Math.round(rate((p) => p.has_faq_schema) * 100) / 100,
    medical_schema_rate: Math.round(rate((p) => p.has_medical_schema) * 100) / 100,
    schema_types_top: schemaTop,
    alt_text_coverage_rate: Math.round(altCoverage * 100) / 100,
    table_usage_rate: Math.round(rate((p) => p.table_count > 0) * 100) / 100,
    list_usage_rate: Math.round(rate((p) => p.ul_ol_count > 0) * 100) / 100,
  };
}

function diagnose(summary: Summary, domain: string, baseline: Baseline): { diagnosis: string[]; recommendations: string[] } {
  const diag: string[] = [];
  const recs: string[] = [];

  // 본문 길이
  const wordDelta = summary.avg_word_count - baseline.word_count;
  if (wordDelta > 200) {
    diag.push(`본문 평균 ${summary.avg_word_count} 단어 (메디맵 ${baseline.word_count} 대비 +${wordDelta})`);
    recs.push(`본문을 ${baseline.word_count} → ${Math.round(summary.avg_word_count)} 단어로 확장`);
  } else if (wordDelta < -200) {
    diag.push(`본문 짧음 (${summary.avg_word_count} vs 메디맵 ${baseline.word_count}) — 짧은 글이 인용되는 케이스`);
    recs.push(`짧고 명확한 답 (${summary.avg_word_count} 단어) 도 grounding 효과 — Q&A 스타일 시도`);
  }

  // H2 구조
  const h2Delta = summary.avg_h2_count - baseline.h2_count;
  if (h2Delta > 1.5) {
    diag.push(`H2 ${summary.avg_h2_count}개 (메디맵 ${baseline.h2_count} 대비 풍부)`);
    recs.push(`H2 ${baseline.h2_count} → ${Math.ceil(summary.avg_h2_count)}개로 구조 세분화`);
  }

  // FAQ schema
  if (summary.faq_schema_rate >= 0.5) {
    diag.push(`FAQ schema 사용률 ${Math.round(summary.faq_schema_rate * 100)}% (메디맵 0%, 즉시 적용 권장)`);
    recs.push('JSON-LD FAQPage schema 추가 — 메디맵 콘텐츠 템플릿에 의무화');
  }

  // Medical schema
  if (summary.medical_schema_rate >= 0.5) {
    diag.push(`Medical schema 사용률 ${Math.round(summary.medical_schema_rate * 100)}% (메디맵 0%)`);
    recs.push('JSON-LD MedicalProcedure / MedicalOrganization schema 추가');
  }

  // 표/리스트
  if (summary.table_usage_rate >= 0.5) {
    diag.push(`비교 표 사용률 ${Math.round(summary.table_usage_rate * 100)}% — 가독성/grounding 모두 강함`);
    recs.push('가격/시술 비교 표 (HTML <table>) 의무 삽입');
  }

  // alt 텍스트 SEO
  if (summary.alt_text_coverage_rate >= 0.8) {
    diag.push(`이미지 alt 텍스트 커버리지 ${Math.round(summary.alt_text_coverage_rate * 100)}% — SEO 기본 충족`);
    recs.push('모든 이미지에 alt 텍스트 필수 (이미 적용 중이면 누락 점검)');
  }

  // 내부 링크
  const linkDelta = summary.avg_internal_link_count - baseline.internal_link_count;
  if (linkDelta > 3) {
    diag.push(`내부 링크 평균 ${summary.avg_internal_link_count}개 (메디맵 ${baseline.internal_link_count} 대비 +${linkDelta.toFixed(1)})`);
    recs.push(`관련 글 내부 링크 ${Math.ceil(summary.avg_internal_link_count)}개 이상 — 회유성 강화`);
  }

  if (diag.length === 0) {
    diag.push(`${domain} 의 분석 결과 메디맵 v3 가이드와 큰 차이 없음 — 차별점은 메디맵 자체 데이터(시술 사례·후기) 가 핵심`);
  }
  if (recs.length === 0) {
    recs.push('현재 메디맵 가이드 유지 — 외부 구조 모방보다 자체 데이터 강화에 집중');
  }

  return { diagnosis: diag, recommendations: recs };
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const save = new URL(req.url).searchParams.get('save') === 'true';
  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    urls?: string[];
    keywords?: string[];
    domain_category?: string;
    tenant_id?: number | null;
    source_tier?: string;
    // save 모드 전용
    summary?: Summary;
    per_url?: UrlPatterns[];
    diagnosis?: string[];
    recommendations?: string[];
    notes?: string;
  };

  const domain = body.domain?.trim() ?? '';
  if (!domain) {
    return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 });
  }

  // save 모드 — 이미 분석된 summary 받아서 DB INSERT
  if (save) {
    if (!body.summary) {
      return NextResponse.json({ ok: false, error: 'summary required when save=true' }, { status: 400 });
    }
    const baseUrl = `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/`;
    // Round 81: domain_category 가 안 오면 tenant_id 로 자동 도출 (프론트가 누락해도 NULL 방지).
    //   진료과 매칭(loader/run_ab_auto)이 동작하려면 이 컬럼이 반드시 채워져야 함.
    let resolvedCategory = body.domain_category ?? null;
    if (!resolvedCategory && body.tenant_id) {
      const { data: t } = await sb
        .from('tenants')
        .select('domain_category')
        .eq('id', body.tenant_id)
        .single();
      resolvedCategory = t?.domain_category ?? null;
    }

    /*
     * 🔴 Round 146 (B5) — category 없는 저장은 applied=false 로 강등.
     * 8/3·8/10 실측: category=null 인 competitor 인사이트 6건이 applied=true 로
     * 저장돼 주입 로더의 `or=(eq.{cat}, is.null)` 매칭을 타고 **전 진료과 프롬프트에
     * 무차별 주입**됐음. 안과 경쟁사 패턴이 피부과 글 생성에 들어가는 구조.
     * category 를 못 구하면 자동 주입 대상에서 제외하고(applied=false),
     * 운영자가 학습 인사이트 화면에서 category 지정 후 수동 토글하게 한다.
     */
    const canAutoApply = Boolean(resolvedCategory);

    const { error } = await sb
      .from('learned_insights')
      .upsert(
        {
          source_url: baseUrl,
          source_domain: domain,
          source_tier: body.source_tier ?? null,
          domain_category: resolvedCategory,
          keyword: (body.keywords ?? []).join(', ') || null,
          tenant_id: body.tenant_id ?? null,
          patterns: {
            scope: 'domain',
            summary: body.summary,
            per_url: body.per_url ?? [],
            diagnosis: body.diagnosis ?? [],
            recommendations: body.recommendations ?? [],
          },
          notes: body.notes ?? null,
          applied: canAutoApply,
          applied_at: canAutoApply ? new Date().toISOString() : null,
        },
        { onConflict: 'source_url,keyword' }
      );
    if (error) {
      return NextResponse.json({ ok: false, error: `DB INSERT 실패: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, saved: true, domain });
  }

  // analyze 모드 — 병렬 fetch + 패턴 추출 + 종합
  const urls = (body.urls ?? []).filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 10);
  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: 'urls 비어있음 (최대 10개)' }, { status: 400 });
  }

  // 병렬 fetch (최대 5개씩 batch, 각 5초 timeout)
  const perUrl: UrlPatterns[] = [];
  let failed = 0;
  const batchSize = 5;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        const html = await fetchHtml(url, 5000);
        if (!html) return null;
        return analyzePatterns(url, html);
      })
    );
    results.forEach((r) => {
      if (r) perUrl.push(r);
      else failed++;
    });
  }

  if (perUrl.length === 0) {
    return NextResponse.json(
      { ok: false, error: `모든 URL fetch 실패 (${failed}개 시도)`, tried: urls.length },
      { status: 502 }
    );
  }

  const summary = summarize(perUrl);
  summary.urls_failed = failed;
  const baseline = await loadBaseline(sb, body.domain_category);
  const { diagnosis, recommendations } = diagnose(summary, domain, baseline);

  return NextResponse.json({
    ok: true,
    domain,
    summary,
    per_url: perUrl,
    diagnosis,
    recommendations,
    baseline,
    note: '운영자 검수 후 save=true 로 호출하면 learned_insights 누적. Phase 2 (다음 라운드) 에서 generator.py 적용 예정.',
  });
}
