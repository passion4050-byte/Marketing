/**
 * 리포트용 tenant 실측 지표 — 이메일 리포트(reports/email)와 리포트 화면(admin/reports/[tenantId]) 공용.
 *   발행수 · AI 인용수 · 평균 AEO 점수 · Top AEO 콘텐츠 · 등급 분포(A/B/C/D).
 * scoreAeo(Princeton GEO 기반) 재사용 — 콘텐츠 body 품질 점수.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreAeo } from '@/lib/aeoScore';
import { loadClassifierSets, classifyDomain, extractDomainFromUrl } from '@/lib/domain-classifier';
import { fetchAllRows, fetchByIdChunks } from '@/lib/fetchAllRows';

export interface ReportMetrics {
  published30d: number;
  /**
   * 🔴 Round 144 — 구 `citations30d`. mentions 테이블 = AI 답변 본문에 병원 이름이
   * 등장한 횟수(브랜드 언급). **출처 인용(citation)이 아니며 우리 콘텐츠와 인과관계 없음.**
   * UI/이메일에서 "인용"으로 라벨링 금지.
   */
  mentions30d: number;
  /** 우리(위서클)가 발행한 URL 이 AI 답변에 출처로 표기된 실제 건수. T1 인용. */
  ownCitations30d: number;
  /** 클라이언트 병원 자체 도메인이 AI 답변에 출처로 표기된 건수. T2 인용. */
  clientSiteCitations30d: number;
  /** 해당 tenant 의 30일 측정 질의 수 (분모). */
  queries30d: number;
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
  // Round 165 — 직렬 3왕복(contents → mentions → citations)을 병렬 1왕복으로.
  //   포털 홈·어드민 리포트·이메일 리포트가 전부 이 함수를 기다린다 (로딩속도 핵심 경로).
  const [contentsRes, mentionsRes, citationCounts] = await Promise.all([
    sb
      .from('generated_contents')
      .select('title, body, raw_qa_pairs, published_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .gte('published_at', since),
    sb
      .from('mentions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_target', true)
      .gte('created_at', since),
    computeCitationCounts(sb, tenantId, since),
  ]);
  const contents = contentsRes.data;
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
      // 🔴 Round 144 — 이전엔 `true` 하드코딩이라 실측이 아니라 상수였음.
      //   어드민 자체 집계상 Medical schema 사용률 0% 인데 점수에는 있다고 가정돼
      //   AEO 평균이 실제보다 높게 나왔음. body 에서 실제 검출.
      hasMedicalSchema: /"@type"\s*:\s*"(MedicalWebPage|MedicalClinic|Physician|MedicalProcedure)"/.test(
        c.body ?? '',
      ),
    });
    aeoSum += r.score;
    gradeDist[r.grade] += 1;
    if (!top || r.score > top.aeo) top = { title: c.title ?? '(제목 없음)', aeo: r.score };
  }
  const avgAeo = list.length > 0 ? Math.round(aeoSum / list.length) : null;

  // 브랜드 언급(mention) — AI 답변에 병원 이름이 등장한 횟수. citation 아님. (위 병렬 fetch)
  const mentions = mentionsRes.count;

  // 🔴 Round 144 — 실제 출처 인용(citation) 집계. (위 병렬 fetch)
  const { ownCitations30d, clientSiteCitations30d, queries30d } = citationCounts;

  return {
    published30d: list.length,
    mentions30d: mentions ?? 0,
    ownCitations30d,
    clientSiteCitations30d,
    queries30d,
    avgAeo,
    topContent: top,
    gradeDist,
  };
}

/**
 * tenant 의 30일 측정 응답에서 실제 source URL 인용을 티어별로 집계.
 * classifyDomain() 단일 소스 사용 — substring 매칭 금지(홍콩 medimap.com.hk 오염 사고).
 */
async function computeCitationCounts(
  sb: SupabaseClient,
  tenantId: string | number,
  since: string,
): Promise<{ ownCitations30d: number; clientSiteCitations30d: number; queries30d: number }> {
  // Round 165 — 1,000행 캡 수술 + 병렬화.
  //   기존: queries 단발 fetch(캡 잘림 — 다국어 시딩 후 테넌트당 30일 질의가 1,000행을
  //   넘기 시작: 키워드 50개 × 엔진 4 × 30일) + responses `.in(slice 2000)`(역시 캡).
  //   queries30d 분모가 잘리면 포털·이메일 리포트의 인용 지표 전체가 과소집계된다.
  const [qRows, tRes, sets] = await Promise.all([
    fetchAllRows<{ id: number }>((from, to) =>
      sb
        .from('queries')
        .select('id')
        .eq('tenant_id', tenantId)
        .gte('requested_at', since)
        .order('id')
        .range(from, to),
    ),
    sb.from('tenants').select('homepage, additional_domains').eq('id', tenantId).maybeSingle(),
    loadClassifierSets(),
  ]);
  const queryIds = qRows.map((q) => q.id);
  if (queryIds.length === 0) {
    return { ownCitations30d: 0, clientSiteCitations30d: 0, queries30d: 0 };
  }

  // 이 tenant 의 자체 도메인 set (T2 판정용)
  const t = tRes.data;
  const clientDomains = new Set<string>();
  const main = extractDomainFromUrl((t as { homepage?: string | null } | null)?.homepage ?? null);
  if (main) clientDomains.add(main);
  ((t as { additional_domains?: string[] | null } | null)?.additional_domains ?? []).forEach((d) => {
    const dd = extractDomainFromUrl(d);
    if (dd) clientDomains.add(dd);
  });

  const resp = await fetchByIdChunks(queryIds, (chunk) =>
    sb
      .from('responses')
      .select('source_domains')
      .in('query_id', chunk)
      .gte('created_at', since)
      .not('source_domains', 'is', null),
  );

  let own = 0;
  let clientSite = 0;
  for (const r of resp as Array<{
    source_domains: Array<{ domain?: string; final_url?: string | null }> | null;
  }>) {
    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain) continue;
      const tier = classifyDomain(
        sd.domain,
        sd.final_url ?? null,
        clientDomains.size > 0 ? clientDomains : null,
        sets,
      );
      if (tier === 'T1') own++;
      else if (tier === 'T2') clientSite++;
    }
  }
  return { ownCitations30d: own, clientSiteCitations30d: clientSite, queries30d: queryIds.length };
}
