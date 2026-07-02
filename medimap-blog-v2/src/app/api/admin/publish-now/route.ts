/**
 * POST /api/admin/publish-now
 *
 * Round 112 (2026-07-02) — 즉시 발행 트리거.
 * 사용자가 특정 tenant 를 선택해서 지금 바로 콘텐츠 생성 (자동 cron 을 기다리지 않고).
 *
 * body:
 *   { tenantId: number, keyword?: string }
 *
 * 동작:
 *   1. GitHub Actions `auto-publish.yml` workflow_dispatch 트리거 (tenant_id input).
 *   2. GH_TOKEN + GH_REPO env 필요.
 *   3. 트리거 성공 시 202 반환. 실제 발행은 GH Actions 러너에서 진행 (2~5분 소요).
 *
 * 필수 env:
 *   - GH_TOKEN — repo:workflow scope
 *   - GH_REPO — 예: passion4050-byte/Marketing
 *
 * fallback: env 미설정이면 anleitung 메시지 반환 (사용자가 GH Actions 를 직접 실행).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = Number(body.tenantId);
    if (!tenantId || Number.isNaN(tenantId)) {
      return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });
    }
    const keyword = body.keyword ? String(body.keyword) : null;

    // 1. tenant 존재 확인
    const sb = getServerClient();
    if (!sb) {
      return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
    }
    const { data: tenant } = await sb
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();
    if (!tenant) {
      return NextResponse.json({ ok: false, error: 'tenant not found' }, { status: 404 });
    }

    // 2. GH Actions dispatch
    const ghToken = process.env.GH_TOKEN;
    const ghRepo = process.env.GH_REPO ?? 'passion4050-byte/Marketing';
    const workflow = process.env.PUBLISH_WORKFLOW ?? 'auto-publish.yml';

    if (!ghToken) {
      return NextResponse.json({
        ok: false,
        needsManual: true,
        message: 'GH_TOKEN 미설정. GitHub → Actions → auto-publish → Run workflow 에서 tenant_id 를 수동 입력해 주세요.',
        tenantId,
        tenantName: tenant.name,
        workflowUrl: `https://github.com/${ghRepo}/actions/workflows/${workflow}`,
      }, { status: 200 });
    }

    const res = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            tenant_id: String(tenantId),
            ...(keyword ? { keyword } : {}),
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({
        ok: false,
        error: `GH dispatch failed: ${res.status}`,
        details: errText.slice(0, 500),
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      tenantId,
      tenantName: tenant.name,
      workflowUrl: `https://github.com/${ghRepo}/actions/workflows/${workflow}`,
      message: `${tenant.name} 즉시 발행 트리거 완료. 2~5분 후 검수 대기 큐에 등장 예정.`,
    }, { status: 202 });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
