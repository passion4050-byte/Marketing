/**
 * POST /api/blog/generate
 *
 * 소재 1개 → 5변형 블로그 글 자동 생성 (정보·후기·Q&A·비교·체크리스트).
 * stub: 운영 환경에 LLM 키 있으면 실 호출로 교체.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  topic?: string;
  brief?: string;
}

const VARIANTS = [
  { format: 'info', label: '정보형', cue: '정보 가이드 · 800자 내외' },
  { format: 'review', label: '후기형', cue: '환자 후기 톤 · 600자' },
  { format: 'qa', label: 'Q&A', cue: 'FAQ 자동 변환 · 5문항' },
  { format: 'compare', label: '비교형', cue: '비용·회복기·후유증 비교 · 표 포함' },
  { format: 'checklist', label: '체크리스트', cue: '수술 전·중·후 체크리스트' }
] as const;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const topic = (body.topic ?? '').trim();
  if (!topic) {
    return NextResponse.json({ ok: false, error: 'topic is required' }, { status: 400 });
  }
  const brief = body.brief ?? `${topic} 관련 소재. 메디맵 자동 발행 파이프라인 대상.`;
  const posts = VARIANTS.map((v, i) => ({
    id: `gen-${Date.now()}-${i}`,
    variantNo: i + 1,
    formatLabel: v.label,
    cue: v.cue,
    status: 'draft' as const,
    title: `${topic} ${v.label} 글 — 메디맵 자동 발행`,
    lead: `${topic}에 대한 ${v.label} 형식. ${brief}`,
    body: `메디맵 등록 병원·시술 데이터를 기반으로 작성된 ${v.label} 본문. 의료법 9 룰 린터 통과 필요. 실제 운영 시 LLM 호출 결과로 대체.`,
    bullets: v.format === 'checklist' ? ['수술 전 검진', '회복기 관리', '재진 예약'] : undefined,
    keywords: [topic, '메디맵'],
    readMinutes: 4,
    charCount: 1280
  }));
  return NextResponse.json({
    ok: true,
    topic,
    brief,
    posts,
    note: process.env.LLM_PROVIDER ?? 'stub'
  });
}
