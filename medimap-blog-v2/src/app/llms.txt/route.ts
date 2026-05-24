/**
 * /llms.txt — AI 크롤러에 자사 컨텐츠 인덱스를 명시적으로 제공.
 * Anthropic 등이 채택한 표준 (https://llmstxt.org).
 *
 * 사용자 목표(LLM 인용 유도)에서 가장 강력한 단일 시그널.
 */
import { NextResponse } from 'next/server';
import { buildLlmsTxt } from '@/lib/aeo';
import { faqItems, publications } from '@/lib/mock-data';

export const runtime = 'edge';
export const revalidate = 600;

export async function GET() {
  const body = buildLlmsTxt(publications, faqItems);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Robots-Tag': 'all'
    }
  });
}
