/**
 * Round 143h — 자사(T1) 인용 콘텐츠 자동 학습.
 *
 * AI 가 실제로 source 로 인용한 위서클(wecircle.co.kr) 콘텐츠 URL 을 분석해
 * "왜 AI 가 이 콘텐츠를 선택했는가" 를 학습 → learned_insights 에 applied=true 로 저장.
 * 저장 즉시 Python 콘텐츠 생성기(learned_insights_loader.py)가 다음 발행 시 반영.
 *
 * POST /api/admin/auto-learn-own
 *   body: { cronSecret?, days?=60, topN?=5, minCitations?=1 }
 *   보안: CRON_SECRET (설정 시 필수). GitHub Actions cron 에서 호출.
 *
 * 흐름:
 *   1. responses.source_domains 에서 T1(자사) 인용 URL 집계
 *   2. 인용 횟수 상위 topN 선택 (minCitations 이상)
 *   3. 각 URL → learn-from-url 로 구조 분석
 *   4. learned_insights INSERT (source_tier='T1', applied=true)
 *      → Python 생성기가 다음 사이클에 패턴 반영
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { loadClassifierSets, classifyDomain } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SourceDomain = {
  domain?: string;
  final_url?: string | null;
  is_self?: boolean;
};

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

  const days = Math.max(1, Math.min(180, body.days ?? 60));
  const topN = Math.max(1, Math.min(20, body.topN ?? 5));
  const minCitations = Math.max(1, body.minCitations ?? 1);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. T1 도메인 분류기 로드
  const classifierSets = await loadClassifierSets();

  // 2. responses.source_domains 에서 T1 인용 URL 집계
  const { data: resp } = await sb
    .from('responses')
    .select('source_domains, created_at, query_id')
    .gte('created_at', since)
    .not('source_domains', 'is', null)
    .limit(10000);

  // query_id → keyword 텍스트 매핑
  const queryIds = [...new Set(((resp ?? []) as Array<{ query_id: number }>).map((r) => r.query_id))];
  const keywordMap = new Map<number, string>();
  if (queryIds.length > 0) {
    const { data: queries } = await sb
      .from('queries')
      .select('id, keyword_id')
      .in('id', queryIds.slice(0, 1000));
    const kwIds = [...new Set(((queries ?? []) as Array<{ keyword_id: number }>).map((q) => q.keyword_id))];
    if (kwIds.length > 0) {
      const { data: kws } = await sb
        .from('keywords')
        .select('id, keyword')
        .in('id', kwIds);
      const kwById = new Map(((kws ?? []) as Array<{ id: number; keyword: string }>).map((k) => [k.id, k.keyword]));
      for (const q of (queries ?? []) as Array<{ id: number; keyword_id: number }>) {
        const kw = kwById.get(q.keyword_id);
        if (kw) keywordMap.set(q.id, kw);
      }
    }
  }

  // URL 단위 인용 집계
  const urlAgg = new Map<
    string,
    { url: string; domain: string; count: number; keywords: Set<string>; dates: string[] }
  >();
  for (const r of (resp ?? []) as Array<{
    source_domains: SourceDomain[] | null;
    created_at: string;
    query_id: number;
  }>) {
    const kwText = keywordMap.get(r.query_id) ?? '';
    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain || !sd.final_url) continue;
      const tier = classifyDomain(sd.domain, sd.final_url, null, classifierSets);
      const isSelf = tier === 'T1' || sd.is_self === true;
      if (!isSelf) continue;
      const key = sd.final_url;
      if (!urlAgg.has(key)) {
        urlAgg.set(key, { url: key, domain: sd.domain, count: 0, keywords: new Set(), dates: [] });
      }
      const e = urlAgg.get(key)!;
      e.count++;
      if (kwText) e.keywords.add(kwText);
      e.dates.push(r.created_at.slice(0, 10));
    }
  }

  // 3. 최근 30일 내 이미 학습한 T1 URL 제외 (중복 방지)
  const { data: recentLearned } = await sb
    .from('learned_insights')
    .select('source_url')
    .eq('source_tier', 'T1')
    .gte('applied_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  const recentUrls = new Set(
    ((recentLearned ?? []) as Array<{ source_url: string | null }>)
      .map((l) => l.source_url ?? '')
      .filter(Boolean)
  );

  // 4. 인용 횟수 상위 topN 선택
  const candidates = Array.from(urlAgg.values())
    .filter((e) => e.count >= minCitations && !recentUrls.has(e.url))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      days,
      totalT1Urls: urlAgg.size,
      candidates: 0,
      learned: 0,
      results: [],
      message: '학습할 신규 T1 인용 URL 없음',
    });
  }

  // 5. 각 URL 분석 + learned_insights 저장
  const origin = req.nextUrl.origin;
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(secret ? { 'X-Cron-Secret': secret } : {}),
  };
  const results: Array<{ url: string; citations: number; ok: boolean; insight_id?: number; error?: string }> = [];

  for (const cand of candidates) {
    try {
      // learn-from-url 분석 (구조 패턴 추출)
      const aRes = await fetch(`${origin}/api/admin/learn-from-url`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({ url: cand.url }),
      });
      const analysis = (await aRes.json()) as {
        ok?: boolean;
        title?: string;
        word_count?: number;
        h2_count?: number;
        h3_count?: number;
        has_faq_schema?: boolean;
        table_count?: number;
        ul_ol_count?: number;
        schema_types?: string[];
        error?: string;
      };

      if (!aRes.ok || !analysis.ok) {
        results.push({ url: cand.url, citations: cand.count, ok: false, error: analysis.error ?? 'analyze 실패' });
        continue;
      }

      // 성공 패턴 요약 생성
      const keywordList = Array.from(cand.keywords).join(', ') || '(키워드 미확인)';
      const latestDate = [...new Set(cand.dates)].sort().reverse()[0] ?? '날짜 미상';
      const notes = `자동학습(자사 인용) — 최근 ${days}일 ${cand.count}회 AI 인용된 위서클 콘텐츠. 키워드: ${keywordList}. 최근 인용: ${latestDate}.`;

      // 성공 패턴 권장사항 자동 구성
      const recommendations = [
        `✅ AI 인용된 실제 콘텐츠 구조 — 단어수: ~${analysis.word_count ?? '?'}자`,
        `✅ H2 헤딩 수: ${analysis.h2_count ?? '?'}개 (AI 가 출처로 선택한 구조)`,
        `✅ FAQ 스키마 포함: ${analysis.has_faq_schema ? 'YES — AEO 최적화 효과 확인됨' : 'NO'}`,
        `✅ 표(table) 활용: ${analysis.table_count ?? 0}개`,
        `✅ 스키마 타입: ${(analysis.schema_types ?? []).join(', ') || '없음'}`,
        `✅ 인용 키워드: ${keywordList}`,
        `🔁 이 구조를 동일 카테고리 신규 콘텐츠에 반복 적용 (확인된 AI 인용 패턴)`,
      ].join('\n');

      // learned_insights 저장
      const { data: saved, error: saveErr } = await sb
        .from('learned_insights')
        .insert({
          source_url: cand.url,
          source_domain: cand.domain,
          source_tier: 'T1',
          domain_category: null,
          keyword: keywordList,
          patterns: {
            word_count: analysis.word_count,
            h2_count: analysis.h2_count,
            h3_count: analysis.h3_count,
            has_faq_schema: analysis.has_faq_schema ?? false,
            table_count: analysis.table_count ?? 0,
            schema_types: analysis.schema_types ?? [],
            citation_count: cand.count,
            citation_keywords: Array.from(cand.keywords),
          },
          diagnosis: `위서클 자사 콘텐츠가 AI 에 ${cand.count}회 실제 인용됨 (최근 ${days}일). 키워드: ${keywordList}. 이 콘텐츠의 구조적 특징을 동일 카테고리 신규 콘텐츠에 재적용한다.`,
          recommendations,
          notes,
          applied: true,   // 즉시 Python 생성기에 반영
          applied_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (saveErr) {
        results.push({ url: cand.url, citations: cand.count, ok: false, error: saveErr.message });
      } else {
        results.push({
          url: cand.url,
          citations: cand.count,
          ok: true,
          insight_id: (saved as { id: number } | null)?.id,
        });
      }
    } catch (err) {
      results.push({ url: cand.url, citations: cand.count, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    days,
    totalT1Urls: urlAgg.size,
    candidates: candidates.length,
    learned: results.filter((r) => r.ok).length,
    results,
  });
}
