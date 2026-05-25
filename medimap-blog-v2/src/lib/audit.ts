/**
 * Audit log helper — 모든 admin API 에서 사용.
 *
 * 사용 예:
 *   import { logAudit } from '@/lib/audit';
 *   await logAudit(req, sb, 'update_tenant', `tenants:${id}`, { before, after });
 *
 * 실패해도 메인 액션을 막지 않음 (fire-and-forget + try/catch).
 */
import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuditMeta {
  actor?: string;
  diff?: unknown;
}

/** admin cookie 에서 actor 추출 — 현재는 단일 ADMIN_PASSWORD 사용자라 'admin' 고정. */
function resolveActor(req: NextRequest | undefined, meta: AuditMeta | undefined): string {
  if (meta?.actor) return meta.actor;
  if (!req) return 'admin';
  // 향후 Supabase Auth 통합 시 req.cookies 에서 user email 추출
  return 'admin';
}

export async function logAudit(
  req: NextRequest | undefined,
  sb: SupabaseClient | null,
  action: string,
  resource: string | null,
  meta?: AuditMeta
): Promise<void> {
  if (!sb) return;
  try {
    const actor = resolveActor(req, meta);
    await sb.from('audit_logs').insert({
      actor,
      action,
      resource,
      diff: meta?.diff ?? null
    });
  } catch {
    // ignore — audit 실패는 main action 을 막지 않음
  }
}
