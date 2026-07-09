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

    // Round 132 (2026-07-09) — 중복 발행 가드.
    //   실사고: 즉시발행 3회 반복 → 모우림 "헤어라인교정" 3편 중복(#182/183/184, 2편 archive 처리).
    //   같은 키워드 published 존재(키워드 지정 시) 또는 24h 내 발행 존재(미지정 시) → 409.
    //   body.force === true 로 명시 확인 시에만 통과.
    const force = body.force === true;
    if (!force) {
      let dupQuery = sb
        .from('generated_contents')
        .select('id, keyword_text, created_at')
        .eq('tenant_id', tenantId)
        .eq('channel', 'blog_html')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1);
      dupQuery = keyword
        ? dupQuery.eq('keyword_text', keyword)
        : dupQuery.gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      const { data: dupRows } = await dupQuery;
      const dup = dupRows?.[0];
      if (dup) {
        return NextResponse.json({
          ok: false,
          duplicate: true,
          message: keyword
            ? `"${keyword}" 키워드로 이미 발행된 글이 있습니다 (#${dup.id}, ${String(dup.created_at).slice(0, 10)}). 같은 키워드 중복 발행은 SEO/AEO 에 불리합니다.`
            : `${tenant.name} 은(는) 최근 24시간 내 발행 글이 있습니다 (#${dup.id} "${dup.keyword_text}").`,
          existing: dup,
        }, { status: 409 });
      }
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
