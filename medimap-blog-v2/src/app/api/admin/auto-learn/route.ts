/**
 * 학습 인사이트 자동화 — AI 인용된 경쟁사 레퍼런스를 주기적으로 자동 학습.
 *
 * 지금까지: competitors 페이지 "학습 후보 → Learn 버튼" 으로 운영자가 수동 학습.
 * 자동화: responses.source_domains(is_self=false = 경쟁사) 를 집계 → 자주 인용되는 top 경쟁사
 *   도메인을 골라 learn-from-domain(analyze+save) 을 내부 호출해 learned_insights 에 자동 누적.
 *   "인용됨 = 측정데이터로 확인" 을 그대로 자동화한다.
 *
 * POST /api/admin/auto-learn
 *   body: { cronSecret?, days?=30, topN?=3, minCitations?=3 }
 *   보안: CRON_SECRET (설정 시 필수). cron(GitHub Actions)에서 주 1회 호출.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SourceDomain = { domain?: string; final_url?: string | null; is_self?: boolean };

// 일반 플랫폼·미디어·포털·디렉토리 — 경쟁 "병원 콘텐츠"가 아니므로 학습 제외.
const PLATFORM_BLOCKLIST = [
  'youtube.com', 'google.com', 'namu.wiki', 'wikipedia.org', 'wikitree.co.kr',
  'naver.com', 'daum.net', 'kakao.com', 'tistory.com', 'brunch.co.kr',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'threads.net',
  'modoodoc.com', 'goodoc.co.kr', 'ddocdoc.com', // 병원 디렉토리/집계
  'hidoc.co.kr', 'kormedi.com', 'health.chosun.com', 'news.', 'yna.co.kr', 'chosun.com',
  'joongang.co.kr', 'donga.com', 'hankyung.com', 'mk.co.kr',
];
function isPlatform(d: string): boolean {
  return PLATFORM_BLOCKLIST.some((p) => d === p || d.endsWith('.' + p) || d.includes(p));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    cronSecret?: string;
    days?: number;
    topN?: number;
    minCitations?: number;
  };
  const secret = process.env.CRON_SECRET;
  if (secret && body.cronSecret !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const days = Math.max(1, Math.min(90, body.days ?? 30));
  const topN = Math.max(1, Math.min(10, body.topN ?? 3));
  const minCitations = Math.max(1, body.minCitations ?? 3);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. 인용 응답의 source_domains 집계 (경쟁사 = is_self=false)
  // Round 163b — .limit(5000) 은 서버 캡(1,000)에 잘렸음 → 페이지네이션 전량 수집
  const resp = await fetchAllRows<{ source_domains: SourceDomain[] | null }>((from, to) =>
    sb
      .from('responses')
      .select('source_domains')
      .gte('created_at', since)
      .not('source_domains', 'is', null)
      .order('id')
      .range(from, to)
  );
  const agg = new Map<string, { count: number; urls: Set<string> }>();
  for (const r of (resp ?? []) as Array<{ source_domains: SourceDomain[] | null }>) {
    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain || sd.is_self) continue;
      const d = sd.domain.toLowerCase().replace(/^www\./, '');
      if (isPlatform(d)) continue; // 플랫폼·미디어·디렉토리 제외 → 경쟁 병원 사이트만
      if (!agg.has(d)) agg.set(d, { count: 0, urls: new Set<string>() });
      const e = agg.get(d)!;
      e.count++;
      if (sd.final_url) e.urls.add(sd.final_url);
    }
  }

  // 2. 최근 14일 내 이미 학습한 도메인 제외 (중복 방지)
  const { data: learned } = await sb
    .from('learned_insights')
    .select('source_domain')
    .gte('applied_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
  const recentlyLearned = new Set(
    ((learned ?? []) as Array<{ source_domain: string | null }>).map((l) =>
      (l.source_domain ?? '').toLowerCase().replace(/^www\./, '')
    )
  );

  // 3. 자주 인용된 경쟁사 도메인 top N (학습 URL 있는 것만)
  const candidates = Array.from(agg.entries())
    .filter(([d, e]) => e.count >= minCitations && !recentlyLearned.has(d) && e.urls.size > 0)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN);

  // 4. 각 도메인 → learn-from-domain(analyze) → save (기존 검증 로직 재사용)
  // 🔴 내부 self-call 도 /api/admin/* 이라 미들웨어(admin cookie or x-cron-secret) 통과 필요.
  //    cron 컨텍스트엔 admin 쿠키가 없으므로 x-cron-secret 헤더를 반드시 전달.
  const origin = req.nextUrl.origin;
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(secret ? { 'X-Cron-Secret': secret } : {}),
  };
  const results: Array<{ domain: string; citations: number; ok: boolean; error?: string }> = [];
  for (const [domain, e] of candidates) {
    const urls = Array.from(e.urls).slice(0, 6);
    try {
      const aRes = await fetch(`${origin}/api/admin/learn-from-domain`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ domain, urls, source_tier: 'competitor' }),
      });
      const a = (await aRes.json()) as {
        ok?: boolean;
        summary?: unknown;
        per_url?: unknown;
        diagnosis?: unknown;
        recommendations?: unknown;
        error?: string;
      };
      if (!a.ok) {
        results.push({ domain, citations: e.count, ok: false, error: a.error ?? 'analyze 실패' });
        continue;
      }
      const sRes = await fetch(`${origin}/api/admin/learn-from-domain?save=true`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          domain,
          urls,
          summary: a.summary,
          per_url: a.per_url,
          diagnosis: a.diagnosis,
          recommendations: a.recommendations,
          source_tier: 'competitor',
          notes: `자동 학습 — 최근 ${days}일 ${e.count}회 AI 인용된 경쟁사 레퍼런스`,
        }),
      });
      const s = (await sRes.json()) as { ok?: boolean; error?: string };
      results.push({ domain, citations: e.count, ok: !!s.ok, error: s.ok ? undefined : s.error });
    } catch (err) {
      results.push({ domain, citations: e.count, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    days,
    competitorsFound: agg.size,
    candidates: candidates.length,
    learned: results.filter((r) => r.ok).length,
    results,
  });
}
