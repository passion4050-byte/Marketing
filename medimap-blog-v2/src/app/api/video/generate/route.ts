/**
 * POST /api/video/generate
 *
 * 영상 스크립트 자동 합성 (Shorts/Reels/YouTube 3종).
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface Body {
  topic?: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const topic = (body.topic ?? '').trim();
  if (!topic) {
    return NextResponse.json({ ok: false, error: 'topic is required' }, { status: 400 });
  }
  const scripts = [
    {
      id: `gen-shorts-${Date.now()}`,
      channel: 'shorts',
      duration: '0:45',
      status: 'draft',
      title: `${topic} 핵심 30초 (Shorts)`,
      hook: `"${topic}" 진짜 정보 30초 정리`,
      beats: [
        { start: '00:00', line: '문제 제시 — 환자 페인포인트' },
        { start: '00:08', line: `${topic} 핵심 사실 1` },
        { start: '00:20', line: `${topic} 핵심 사실 2` },
        { start: '00:32', line: '메디맵 등록 병원 추천 멘트' }
      ],
      cta: '댓글에 지역명 → AI가 가까운 병원 매칭'
    },
    {
      id: `gen-reels-${Date.now()}`,
      channel: 'reels',
      duration: '0:30',
      status: 'draft',
      title: `${topic} 비포애프터 (Reels)`,
      hook: `"${topic}" 후기 한 컷 정리`,
      beats: [
        { start: '00:00', line: 'BEFORE 컷' },
        { start: '00:10', line: 'AFTER 컷 + 텍스트 오버레이' },
        { start: '00:22', line: '메디맵 링크 + 톡톡' }
      ],
      cta: '프로필 링크 — 메디맵 톡톡 상담'
    },
    {
      id: `gen-yt-${Date.now()}`,
      channel: 'youtube',
      duration: '3:30',
      status: 'draft',
      title: `${topic} 환자가 진짜 궁금한 5가지 (YouTube)`,
      hook: `${topic} — 의사가 직접 답변`,
      beats: [
        { start: '00:00', line: '인트로 + 질문 5개 소개' },
        { start: '00:30', line: 'Q1 비용' },
        { start: '01:10', line: 'Q2 회복기' },
        { start: '01:50', line: 'Q3 부작용' },
        { start: '02:30', line: 'Q4 의료진 선택 기준' },
        { start: '03:00', line: 'Q5 메디맵 활용법 + 아웃트로' }
      ],
      cta: '구독 + 더 알아보기: medi-map.co.kr'
    }
  ];
  return NextResponse.json({ ok: true, topic, scripts });
}
