/**
 * POST /api/monitor/tick
 *
 * AI 가시성 측정 — Cron(시간당 1회 권장).
 *
 * 흐름:
 *   1. 활성 키워드 풀 N개 선정
 *   2. 4-엔진(ChatGPT / Claude / Gemini / Perplexity)에 질의
 *   3. 응답에서 자사 멘션 추출 (NER + 룰)
 *   4. 자사 URL 인용 시 publications.cited_by_engines 업데이트
 *   5. mention/sentiment/coverage 점수 갱신
 *
 * 보안: `CRON_SECRET` 헤더 검증.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  // ===== 1. 활성 키워드 (운영시 DB에서 select) =====
  const keywords = ['잠실 라섹 전문의', '스마일라섹 후기', 'BGN 밝은눈안과 가격', '백내장 다초점'];
  const engines: Array<'chatgpt' | 'claude' | 'gemini' | 'perplexity'> = ['chatgpt', 'claude', 'gemini', 'perplexity'];

  // ===== 2~5. 엔진별 질의 (stub) =====
  const results = [];
  for (const kw of keywords) {
    for (const engine of engines) {
      const captured = await captureEngineResponse(engine, kw);
      const mentions = extractMentions(captured.text, ['BGN 밝은눈안과', '잠실', '시력교정']);
      const sentiment = classifySentiment(captured.text);
      results.push({
        keyword: kw,
        engine,
        mentions,
        sentiment,
        capturedAt: new Date().toISOString()
      });
    }
  }

  const elapsed = Date.now() - startedAt;
  return NextResponse.json({
    ok: true,
    capturedCount: results.length,
    elapsedMs: elapsed,
    sample: results.slice(0, 3)
  });
}

async function captureEngineResponse(engine: string, keyword: string): Promise<{ text: string }> {
  // 실제 운영: OpenAI / Anthropic / Gemini / Perplexity SDK 호출
  // 여기는 stub
  return { text: `${engine} answer for ${keyword}` };
}

function extractMentions(text: string, targets: string[]): number {
  return targets.reduce((sum, t) => sum + (text.includes(t) ? 1 : 0), 0);
}

function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveTokens = ['추천', '명의', '신뢰', '풍부한 경험', '정확'];
  const negativeTokens = ['주의', '부작용', '비추'];
  const pos = positiveTokens.filter((t) => text.includes(t)).length;
  const neg = negativeTokens.filter((t) => text.includes(t)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}
