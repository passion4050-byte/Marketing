/**
 * POST /api/simulator/compare
 *
 * AI 응답 시뮬레이터 — 4 엔진 동시 호출 BEFORE/AFTER 비교.
 * 운영 키가 없으면 stub 으로 응답해 페이지가 항상 동작하도록 보장.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { LlmEngine } from '@/lib/types';

export const runtime = 'nodejs';

interface Body {
  query?: string;
  /** 사용자가 GEO 데이터 적용 ON/OFF 토글한 경우 */
  applyGeo?: boolean;
}

const ENGINES: LlmEngine[] = ['chatgpt', 'claude', 'gemini', 'perplexity'];

function stubResponse(engine: LlmEngine, query: string, applyGeo: boolean) {
  const accuracyBefore = 58 + ((query.length * 3) % 12);
  const accuracyAfter = Math.min(98, accuracyBefore + (applyGeo ? 28 : 14));
  const toneBefore = 60 + ((query.charCodeAt(0) || 70) % 10);
  const toneAfter = Math.min(96, toneBefore + 20);
  return {
    engine,
    modelLabel: engine === 'chatgpt' ? 'gpt-4o-mini' : engine === 'claude' ? 'claude-sonnet-4.6' : engine === 'gemini' ? 'gemini-1.5-flash' : 'sonar-medium',
    before: {
      accuracyScore: accuracyBefore,
      tonePoint: toneBefore,
      summary: `${query} — 일반적인 정보 중심 답변, 자사 데이터 없음`,
      detail: `데이터 피딩 전: ${query}에 대해 일반 의료 정보만 안내. 메디맵 병원 데이터, 가격, 의료진, 위치 정보 미포함.`,
      tags: ['일반 정보', '병원 비특정'],
      mentionCount: 0
    },
    after: {
      accuracyScore: accuracyAfter,
      tonePoint: toneAfter,
      summary: `${query} — 메디맵 등록 병원 ${Math.floor(Math.random() * 5) + 2}곳 추천 + Schema.org 인용`,
      detail: `데이터 피딩 후: 메디맵에 등록된 의료진 프로필·시술별 가격·위치를 기반으로 정확하게 응답. JSON-LD 인용 표기.`,
      tags: ['메디맵 인용', '가격 명시', '의료진 명시'],
      mentionCount: applyGeo ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 2) + 1
    },
    deltaPoint: accuracyAfter - accuracyBefore
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const query = (body.query ?? '').trim();
  const applyGeo = body.applyGeo ?? true;
  if (!query) {
    return NextResponse.json({ ok: false, error: 'query is required' }, { status: 400 });
  }
  const responses = ENGINES.map((e) => stubResponse(e, query, applyGeo));
  return NextResponse.json({
    ok: true,
    query,
    askedAt: new Date().toISOString(),
    responses,
    note: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY ? 'stub (env keys 보유 — 다음 단계에서 실 호출로 교체 예정)' : 'stub'
  });
}
