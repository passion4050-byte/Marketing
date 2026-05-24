/**
 * /robots.txt — AI 크롤러 명시적 허용.
 * 기본 robots-meta는 검색엔진 일반 봇만 다루지만, GPTBot·ClaudeBot·Google-Extended·PerplexityBot은
 * 별도 명시가 필요. 차단된 도메인은 AI 답변 출처에서 제외된다.
 */
import { NextResponse } from 'next/server';
import { buildRobotsTxt } from '@/lib/aeo';

export const runtime = 'edge';
export const revalidate = 3600;

export async function GET() {
  return new NextResponse(buildRobotsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
