/**
 * /llms-full.txt — 자사 풀 코퍼스(FAQ + 블로그 본문)를 1파일로 노출.
 * 모델이 본문 전체를 학습/RAG에 사용할 수 있는 형태.
 */
import { NextResponse } from 'next/server';
import { buildLlmsFullTxt } from '@/lib/aeo';
import { contentTopics, faqItems, publications } from '@/lib/mock-data';

export const runtime = 'edge';
export const revalidate = 600;

export async function GET() {
  const blogPosts = contentTopics.flatMap((t) => t.posts);
  const body = buildLlmsFullTxt(publications, faqItems, blogPosts);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Robots-Tag': 'all'
    }
  });
}
