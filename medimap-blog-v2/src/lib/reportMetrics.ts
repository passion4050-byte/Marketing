/**
 * 리포트용 tenant 실측 지표 — 이메일 리포트(reports/email)와 리포트 화면(admin/reports/[tenantId]) 공용.
 *   발행수 · AI 인용수 · 평균 AEO 점수 · Top AEO 콘텐츠 · 등급 분포(A/B/C/D).
 * scoreAeo(Princeton GEO 기반) 재사용 — 콘텐츠 body 품질 점수.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreAeo } from '@/lib/aeoScore';

export interface ReportMetrics {
  published30d: number;
  citations30d: number;
  avgAeo: number | null;
  topContent: { title: string; aeo: number } | null;
  gradeDist: { A: number; B: number; C: number; D: number };
}

/** sinceIso 미지정 시 최근 30일. */
export async function computeReportMetrics(
  sb: SupabaseClient,
  tenantId: string | number,
  sinceIso?: string,
): Promise<ReportMetrics> {
  const since = sinceIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: contents } = await sb
    .from('generated_contents')
    .select('title, body, raw_qa_pairs, published_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .eq('channel', 'blog_html')
    .gte('published_at', since);
  const list = (contents ?? []) as Array<{
    title: string | null;
    body: string | null;
    raw_qa_pairs: unknown;
    published_at: string | null;
  }>;
  let aeoSum = 0;
  let top: { title: string; aeo: number } | null = null;
  const gradeDist = { A: 0, B: 0, C: 0, D: 0 };
  for (const c of list) {
    const faqCount = Array.isArray(c.raw_qa_pairs) ? c.raw_qa_pairs.length : 0;
    const r = scoreAeo({
      body: c.body ?? '',
      faqCount,
      publishedAt: c.published_at,
      hasFaqSchema: faqCount > 0,
      hasMedicalSchema: true,
    });
    aeoSum += r.score;
    gradeDist[r.grade] += 1;
    if (!top || r.score > top.aeo) top = { title: c.title ?? '(제목 없음)', aeo: r.score };
  }
  const avgAeo = list.length > 0 ? Math.round(aeoSum / list.length) : null;
  const { count: citations } = await sb
    .from('mentions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_target', true)
    .gte('created_at', since);
  return {
    published30d: list.length,
    citations30d: citations ?? 0,
    avgAeo,
    topContent: top,
    gradeDist,
  };
}
