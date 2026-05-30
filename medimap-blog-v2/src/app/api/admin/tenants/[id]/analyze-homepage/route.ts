/**
 * Round 34 phase 4 (2026-05-30) — 클라이언트 홈페이지 자동 분석.
 *
 * POST /api/admin/tenants/[id]/analyze-homepage
 *   - body 없음 (tenant.homepage 사용)
 *   - 응답: { keywords: [{keyword, count}], extracted_text_preview, fetched_url, suggested_business_model }
 *
 * POST /api/admin/tenants/[id]/analyze-homepage?apply=true
 *   - 추가 동작: tenant.business_model 자동 UPDATE → DB trigger 발동 → keywords 자동 등록
 *
 * 분석 흐름:
 *   1. tenant.homepage URL fetch (timeout 10초)
 *   2. HTML 에서 title / meta description / h1 / h2 / h3 추출
 *   3. domain_category 에 따른 의료 키워드 사전과 매칭
 *   4. 빈도순 top 8 키워드 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import {
  extractMatchedKeywords,
  getKeywordCandidates,
} from '@/lib/medical-keywords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** HTML 에서 title / meta description / h1~h3 텍스트 추출 (regex 기반, dependency 회피) */
function extractTextSignals(html: string): string {
  const parts: string[] = [];

  // <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) parts.push(titleMatch[1]);

  // <meta name="description" content="...">
  const metaDescMatch = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (metaDescMatch) parts.push(metaDescMatch[1]);

  // <meta name="keywords" content="...">
  const metaKwMatch = html.match(
    /<meta\s+[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i
  );
  if (metaKwMatch) parts.push(metaKwMatch[1]);

  // og:title / og:description
  const ogTitleMatch = html.match(
    /<meta\s+[^>]*property=["']og:(title|description)["'][^>]*content=["']([^"']+)["']/gi
  );
  if (ogTitleMatch) {
    ogTitleMatch.forEach((m) => {
      const v = m.match(/content=["']([^"']+)["']/);
      if (v) parts.push(v[1]);
    });
  }

  // <h1>, <h2>, <h3>
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, ' ').trim();
    if (text) parts.push(text);
  }

  // 본문 텍스트 일부 (script/style 제거 후 1500자만)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    let bodyText = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (bodyText.length > 3000) bodyText = bodyText.slice(0, 3000);
    parts.push(bodyText);
  }

  return parts.join(' ');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: 'supabase not configured' },
      { status: 503 }
    );
  }

  const tenantId = Number(params.id);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: 'invalid tenant id' }, { status: 400 });
  }

  const apply = new URL(req.url).searchParams.get('apply') === 'true';

  // 1. tenant 정보 가져오기
  const { data: tenant, error: tenantErr } = await sb
    .from('tenants')
    .select('id, name, homepage, domain_category')
    .eq('id', tenantId)
    .single();
  if (tenantErr || !tenant) {
    return NextResponse.json({ ok: false, error: 'tenant not found' }, { status: 404 });
  }
  if (!tenant.homepage) {
    return NextResponse.json(
      { ok: false, error: '홈페이지 URL 미설정 — tenant 편집에서 입력 필요' },
      { status: 400 }
    );
  }

  // 2. fetch (timeout 10초)
  let html = '';
  let fetchedUrl = tenant.homepage;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(tenant.homepage, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MedimapBot/1.0; +https://medi-map.co.kr)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `homepage fetch failed: HTTP ${res.status}` },
        { status: 502 }
      );
    }
    fetchedUrl = res.url;
    html = await res.text();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `fetch error: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  // 3. 텍스트 signals 추출
  const text = extractTextSignals(html);
  if (!text || text.length < 50) {
    return NextResponse.json(
      { ok: false, error: '홈페이지에서 텍스트 추출 실패 — 빈 페이지 또는 JS-only 사이트' },
      { status: 422 }
    );
  }

  // 4. 의료 키워드 매칭
  const candidates = getKeywordCandidates(tenant.domain_category);
  const matched = extractMatchedKeywords(text, candidates, 8);

  // 5. business_model 후보 생성 (top 4~5개)
  const suggestedBusinessModel = matched.slice(0, 5).map((m) => m.keyword).join(',');

  // 6. apply=true 면 tenant.business_model 자동 UPDATE → trigger 발동
  let applied = false;
  if (apply && suggestedBusinessModel) {
    const { error: updErr } = await sb
      .from('tenants')
      .update({ business_model: suggestedBusinessModel })
      .eq('id', tenantId);
    if (updErr) {
      return NextResponse.json(
        { ok: false, error: `tenant update 실패: ${updErr.message}` },
        { status: 500 }
      );
    }
    applied = true;
  }

  return NextResponse.json({
    ok: true,
    tenant_id: tenantId,
    tenant_name: tenant.name,
    domain_category: tenant.domain_category,
    fetched_url: fetchedUrl,
    extracted_text_preview: text.slice(0, 500),
    keywords: matched,
    suggested_business_model: suggestedBusinessModel,
    applied,
    note: applied
      ? 'tenant.business_model 자동 UPDATE 완료 → DB trigger 가 keywords 자동 등록함'
      : 'preview only — apply=true 로 호출하면 자동 적용',
  });
}
