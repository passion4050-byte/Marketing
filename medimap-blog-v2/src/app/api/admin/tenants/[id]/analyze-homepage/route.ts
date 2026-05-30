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

/**
 * HTML 에서 redirect 대상 URL 감지.
 * - <meta http-equiv="refresh" content="0; url=...">
 * - JS location.href / window.location.replace
 * - <a href> 의 첫 번째 internal link
 */
function detectRedirectUrl(html: string, baseUrl: string): string | null {
  // 1. meta refresh
  const metaRefresh = html.match(
    /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^;]*;\s*url=([^"'\s]+)/i
  );
  if (metaRefresh) {
    try {
      return new URL(metaRefresh[1], baseUrl).href;
    } catch {
      /* ignore */
    }
  }

  // 2. JS location redirect
  const jsLocation = html.match(
    /(?:location\.href|location\.replace\s*\(|window\.location\s*=)\s*["']([^"']+)["']/i
  );
  if (jsLocation) {
    try {
      return new URL(jsLocation[1], baseUrl).href;
    } catch {
      /* ignore */
    }
  }

  // 3. <a href> 첫 번째 같은 도메인 link
  const baseHost = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return '';
    }
  })();
  const anchorRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl);
      if (u.hostname === baseHost && u.pathname !== '/' && u.pathname.length > 1) {
        return u.href;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

/**
 * URL fetch + HTML 텍스트 추출 (단일).
 * timeoutMs 안에 응답 받지 못하면 null 반환.
 */
async function fetchAndExtract(url: string, timeoutMs = 8000): Promise<{ html: string; text: string; finalUrl: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MedimapBot/1.0; +https://medi-map.co.kr)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const text = extractTextSignals(html);
    return { html, text, finalUrl: res.url };
  } catch {
    return null;
  }
}

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

  // Round 34 phase 4 fix 2 (2026-05-30): 다단계 fetch — SPA/redirect 사이트 대응.
  // 1단계: root URL fetch
  // 2단계: text 짧으면 → meta refresh / JS redirect / first link 따라가기
  // 3단계: 그래도 짧으면 → common paths (index.php, /main, /about) 순차 시도
  // 각 단계 timeout 8초 × 최대 3 fetch = 최대 24초 (Vercel 30초 limit 안)

  const triedUrls: string[] = [];
  let bestResult: { html: string; text: string; finalUrl: string } | null = null;

  const tryFetch = async (url: string) => {
    triedUrls.push(url);
    const r = await fetchAndExtract(url, 8000);
    if (r && (!bestResult || r.text.length > bestResult.text.length)) {
      bestResult = r;
    }
  };

  // Step 1: 사용자 입력 URL
  await tryFetch(tenant.homepage);

  // Step 2: text 부족 + redirect 감지
  if (!bestResult || (bestResult as { text: string }).text.length < 300) {
    const redirectUrl = bestResult
      ? detectRedirectUrl((bestResult as { html: string }).html, (bestResult as { finalUrl: string }).finalUrl)
      : null;
    if (redirectUrl && !triedUrls.includes(redirectUrl)) {
      await tryFetch(redirectUrl);
    }
  }

  // Step 3: 그래도 짧으면 common paths 시도
  if (!bestResult || (bestResult as { text: string }).text.length < 300) {
    const baseUrl = tenant.homepage.replace(/\/$/, '');
    const candidates = [
      `${baseUrl}/main/index.php`,
      `${baseUrl}/main`,
      `${baseUrl}/about`,
      `${baseUrl}/intro`,
      `${baseUrl}/index.php`,
      `${baseUrl}/index.html`,
      `${baseUrl}/services`,
      `${baseUrl}/sub01`,
    ];
    for (const url of candidates) {
      if (triedUrls.includes(url)) continue;
      await tryFetch(url);
      // 충분한 텍스트 발견 시 즉시 중단
      if (bestResult && (bestResult as { text: string }).text.length > 500) break;
    }
  }

  if (!bestResult) {
    return NextResponse.json(
      {
        ok: false,
        error: `홈페이지 fetch 실패 — 모든 시도 실패`,
        tried_urls: triedUrls,
      },
      { status: 502 }
    );
  }

  const html = (bestResult as { html: string }).html;
  const fetchedUrl = (bestResult as { finalUrl: string }).finalUrl;
  // 3. 텍스트 signals 추출 (위에서 이미 추출했지만 변수 보존)
  const text = (bestResult as { text: string }).text;

  // 4. 의료 키워드 매칭
  const candidates = getKeywordCandidates(tenant.domain_category);
  let matched = extractMatchedKeywords(text, candidates, 8);
  let fallbackUsed: string | null = null;

  // Round 34 phase 4 fix (2026-05-30): SPA/redirect 사이트 대응.
  // 추출 결과 0개면 domain_category 의 default 키워드로 fallback.
  // 예: 안과 tenant → 라식/라섹/스마일라식/백내장/노안교정 (가장 대표적 5개)
  if (matched.length === 0) {
    fallbackUsed = 'domain_category_default';
    const defaultsByCategory: Record<string, string[]> = {
      안과: ['라식', '라섹', '스마일라식', '백내장', '노안교정'],
      피부과: ['여드름', '필러', '보톡스', '리쥬란', '레이저토닝'],
      성형외과: ['쌍꺼풀', '코성형', '안면윤곽', '가슴성형', '지방흡입'],
      치과: ['임플란트', '교정', '치아미백', '신경치료', '라미네이트'],
      모발이식: ['모발이식', '비절개', 'FUE', '헤어라인', '구레나룻'],
      내과: ['건강검진', '내시경', '당뇨', '갑상선', '고혈압'],
      한방: ['한약', '다이어트한약', '추나요법', '침구치료', '보약'],
    };
    const fallbackList =
      defaultsByCategory[tenant.domain_category ?? ''] ?? ['진료', '시술', '상담', '치료', '예약'];
    matched = fallbackList.map((kw) => ({ keyword: kw, count: 1 }));
  }

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
    fallback_used: fallbackUsed,
    note: fallbackUsed
      ? `홈페이지가 SPA/redirect 사이트 — 텍스트 추출 실패. ${tenant.domain_category} 카테고리 default 키워드로 fallback. 운영자 직접 입력 권장.`
      : applied
        ? 'tenant.business_model 자동 UPDATE 완료 → DB trigger 가 keywords 자동 등록함'
        : 'preview only — apply=true 로 호출하면 자동 적용',
  });
}
