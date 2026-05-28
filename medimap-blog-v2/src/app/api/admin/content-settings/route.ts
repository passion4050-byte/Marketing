/**
 * /api/admin/content-settings — Supabase content_settings key-value 테이블 CRUD
 *
 * 2026-05-28 Phase 3 — Round 22
 * - GET: 모든 설정 + 설명 반환 (UI 폼 렌더)
 * - PATCH: { key, value } 1건 업데이트 (UI 인라인 저장)
 *
 * Migration 022 (db/migrations/022_content_settings_table.sql) 가 선행되어야 함.
 * generator.py + image_picker.py 가 매 발행 시 이 테이블을 읽어 prompt 빌드.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 운영자가 수정 허용된 setting_key 화이트리스트 (악의적 key 삽입 방어)
const ALLOWED_KEYS = new Set([
  'tone',
  'length_min',
  'length_max',
  'cta_target',
  'keyword_seed_mode',
  'disclaimer_style',
  'image_count_total',
  'image_style',
  'image_realistic_only_for',
  'publish_schedule',
  'content_pattern_pool',
  'lead_pattern_pool',
]);

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { data, error } = await sb
    .from('content_settings')
    .select('id, setting_key, setting_value, description, updated_at')
    .order('id', { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = typeof body.setting_key === 'string' ? body.setting_key : '';
  const value = typeof body.setting_value === 'string' ? body.setting_value : '';
  if (!key) return NextResponse.json({ ok: false, error: 'setting_key required' }, { status: 400 });
  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ ok: false, error: `key not allowed: ${key}` }, { status: 400 });
  }

  // 숫자 필드 가벼운 검증 (length_min/max, image_count_total)
  if (key === 'length_min' || key === 'length_max' || key === 'image_count_total') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ ok: false, error: `${key} must be a non-negative number` }, { status: 400 });
    }
  }

  const { data, error } = await sb
    .from('content_settings')
    .update({ setting_value: value, updated_at: new Date().toISOString() })
    .eq('setting_key', key)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'update_content_setting', `content_settings:${key}`, {
    diff: { setting_key: key, setting_value: value },
  });
  return NextResponse.json({ ok: true, setting: data });
}
