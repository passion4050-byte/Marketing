/**
 * POST /api/faq/generate
 *
 * 키워드 → FAQ 자동 생성 → Schema.org FAQ JSON-LD 자동 합성.
 */
import { NextRequest, NextResponse } from 'next/server';
import { faqPageSchema } from '@/lib/aeo';
import { faqItems } from '@/lib/mock-data';

export const runtime = 'nodejs';

interface Body {
  keyword?: string;
  count?: number;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const keyword = body.keyword ?? '잠실 라섹';
  const count = Math.min(Math.max(body.count ?? 5, 1), 20);

  // stub — 실제 운영에서는 LLM 호출 후 의료법 린터 통과한 결과만 저장
  const generated = Array.from({ length: count }).map((_, i) => ({
    id: `faq-gen-${Date.now()}-${i}`,
    category: keyword,
    question: `${keyword} 관련 자주 묻는 질문 #${i + 1}`,
    answer: `${keyword}에 대한 표준 답변 본문. 운영시엔 모델 응답으로 대체.`,
    keywords: [keyword],
    status: 'review' as const,
    generatedBy: (process.env.LLM_PROVIDER ?? 'stub') as 'chatgpt',
    schemaReady: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  const schema = faqPageSchema([...faqItems, ...generated]);
  return NextResponse.json({ ok: true, generated, schema });
}
