/**
 * GET /api/admin/debug/gemini-models
 *
 * Round 107 (2026-07-03) — Gemini API key 로 실제 접근 가능한 모델 목록 조회.
 * Nano Banana (gemini-2.5-flash-image-preview) 및 기타 이미지 생성 모델의 접근 여부 판별.
 *
 * 응답:
 *   - all: 전체 모델 목록
 *   - imageModels: 이미지 생성 관련 모델만 필터 (name 에 image/imagen/vision/banana 포함)
 *   - nanoBananaAvailable: gemini-2.5-flash-image-preview 접근 여부
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY 미설정' }, { status: 500 });
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return NextResponse.json(
        { error: 'ListModels 실패', status: resp.status, detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }
    const j = await resp.json();
    const models: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> =
      j?.models || [];

    const imageModels = models.filter((m) => {
      const n = (m.name || '').toLowerCase();
      const d = (m.displayName || '').toLowerCase();
      return (
        n.includes('image') ||
        n.includes('imagen') ||
        n.includes('vision') ||
        n.includes('banana') ||
        d.includes('image') ||
        d.includes('imagen') ||
        d.includes('nano')
      );
    });

    const nanoBananaAvailable = models.some((m) =>
      (m.name || '').includes('gemini-2.5-flash-image'),
    );

    return NextResponse.json({
      ok: true,
      total: models.length,
      nanoBananaAvailable,
      imageModels: imageModels.map((m) => ({
        name: m.name,
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      })),
      allModelNames: models.map((m) => m.name).slice(0, 50), // 상위 50개만
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'fetch 예외', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
