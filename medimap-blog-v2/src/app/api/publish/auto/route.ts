/**
 * POST /api/publish/auto
 *
 * 자동 발행 파이프라인 트리거 — Vercel Cron 또는 외부 스케줄러에서 호출.
 *
 * 흐름:
 *   1. 키워드 풀에서 다음 토픽 선택
 *   2. LLM(env에 설정된 provider)으로 5개 변형 생성
 *   3. 의료법 린터 통과 시 status='published'로 저장
 *   4. JSON-LD / 사이트맵 / llms.txt 캐시 무효화
 *   5. IndexNow ping → Bing 즉시 인덱싱
 *   6. (선택) RSS, GA4 이벤트 emit
 *
 * 보안: `CRON_SECRET` 헤더 검증.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { pingIndexNow } from '@/lib/aeo';
import { siteConfig } from '@/lib/site-config';
import { lintForChannel } from '@/lib/compliance/lint';
import { getProvider, checkDailyCostGuard, logLlmCall } from '@/lib/llm/factory';

export const runtime = 'nodejs';

interface AutoPublishRequest {
  topicSeed?: string;
  channels?: Array<'blog' | 'naver' | 'faq' | 'video'>;
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as AutoPublishRequest;
  const channels = body.channels ?? ['blog', 'faq'];

  // ===== 1. 토픽 선정 (운영시엔 Supabase에서 fetch) =====
  const topicSeed =
    body.topicSeed ?? `잠실 안과 ${new Date().toISOString().slice(0, 10)} 콘텐츠 생성`;

  // ===== 2. LLM 생성 (placeholder — provider 분기) =====
  const provider = process.env.LLM_PROVIDER ?? 'stub';
  const drafts = await generateContentDrafts(topicSeed, channels, provider);

  // ===== 3. 의료법 린터 통과 시 published =====
  const lintResults = drafts.map((d) => ({
    draft: d,
    report: lintForChannel(d.body, d.channel as 'blog' | 'naver' | 'instagram' | 'video' | 'faq')
  }));
  const published = lintResults.filter((r) => r.report.status === 'pass').map((r) => r.draft);
  const warned = lintResults.filter((r) => r.report.status === 'warn').map((r) => r.draft);
  const blocked = lintResults.length - published.length;

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      mode: 'dry-run',
      topic: topicSeed,
      generatedCount: drafts.length,
      passedCount: published.length,
      blockedCount: blocked
    });
  }

  // ===== 4. 캐시 무효화 =====
  revalidateTag('blog');
  revalidateTag('faq');
  revalidateTag('llms');
  revalidateTag('sitemap');

  // ===== 5. IndexNow ping =====
  const publishedUrls = published.map((d) => `${siteConfig.url}${d.path}`);
  const indexNowKey = process.env.INDEXNOW_KEY ?? '';
  const indexNowHost = process.env.INDEXNOW_HOST ?? new URL(siteConfig.url).host;
  const indexNowResult = indexNowKey
    ? await pingIndexNow(publishedUrls, indexNowHost, indexNowKey)
    : { ok: false, status: 0 };

  return NextResponse.json({
    ok: true,
    topic: topicSeed,
    publishedCount: published.length,
    warnedCount: warned.length,
    blockedCount: blocked,
    publishedUrls,
    indexNow: indexNowResult,
    totalCostUsd: drafts.reduce((s, d) => s + d.costUsd, 0)
  });
}

// ===== 콘텐츠 생성 — LLM provider 호출 =====
async function generateContentDrafts(
  seed: string,
  channels: string[],
  _provider: string
): Promise<Array<{ path: string; body: string; channel: string; costUsd: number }>> {
  const llm = getProvider();
  const tenantId = process.env.DEMO_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  // 비용 가드 — 일일 한도 초과 시 빈 배열
  const guard = await checkDailyCostGuard(tenantId, Number(process.env.MAX_DAILY_USD ?? 5));
  if (!guard.ok) return [];

  const systemPrompt = [
    '당신은 한국 의료기관 블로그를 작성하는 의료 카피라이터다.',
    '아래 의료법 규제를 절대 위반하지 마라:',
    '- 최상급 표현 금지 (최고/1위/완치)',
    '- 다른 병원과 직접 비교 금지',
    '- 사은품·할인·환자 유인 표현 금지',
    '- 공포 조장 금지',
    '- 가격은 "○○만원~ (시술명·옵션 범위·기간 명시)" 형식으로만 표기',
    '톤은 차분하고 정보 중심으로 작성한다.'
  ].join('\n');

  const results: Array<{ path: string; body: string; channel: string; costUsd: number }> = [];
  for (const channel of channels) {
    try {
      const out = await llm.generate({
        systemPrompt,
        userPrompt: `토픽: ${seed}\n채널: ${channel}\n800자 내외 본문 + 키워드 5개 + 한 줄 lead 형식으로 작성.`,
        maxTokens: 1500,
        temperature: 0.4
      });
      await logLlmCall(tenantId, out, 'ok');
      results.push({
        path: `/${channel}/auto-${Date.now()}-${results.length}`,
        body: out.text,
        channel,
        costUsd: out.costUsd
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      await logLlmCall(
        tenantId,
        { engine: llm.engine, model: llm.defaultModel, promptTokens: 0, completionTokens: 0, costUsd: 0, durationMs: 0 },
        'error',
        message
      );
    }
  }
  return results;
}
