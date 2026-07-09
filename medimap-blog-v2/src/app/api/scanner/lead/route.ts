/**
 * POST /api/scanner/lead
 *
 * 무료 GEO Scanner — 상세 리포트 언락 게이트.
 *   body: { url, domain, overallScore, grade, complianceStatus, name, org, email, phone, message }
 *   → scanner_leads 에 연락처 포함 리드 저장(lead_captured=true) → { ok }
 *
 * 이 폼을 제출해야 상세 항목 점수·개선안이 프론트에서 공개된다(리드 확보).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  url?: string;
  domain?: string;
  overallScore?: number;
  grade?: string;
  complianceStatus?: string;
  name?: string;
  org?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b?.name?.trim() || !b?.email?.trim() || !b?.phone?.trim()) {
    return NextResponse.json({ ok: false, error: '담당자·이메일·전화번호는 필수입니다.' }, { status: 400 });
  }

  try {
    const client = getServerClient();
    if (client) {
      await client.from('scanner_leads').insert({
        url: b.url || null,
        domain: b.domain || null,
        overall_score: typeof b.overallScore === 'number' ? b.overallScore : null,
        compliance_status: b.complianceStatus || null,
        name: b.name.trim(),
        org: b.org?.trim() || null,
        email: b.email.trim(),
        phone: b.phone.trim(),
        message: b.message?.trim() || null,
        lead_captured: true,
        source: 'scanner_lead'
      });
    }
  } catch {
    // 저장 실패해도 사용자 경험 우선 — 언락은 진행
  }

  return NextResponse.json({ ok: true });
}
