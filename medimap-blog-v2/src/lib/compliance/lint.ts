/**
 * 의료법 린터 — 본문 1건을 룰 풀에 대조.
 */

import { LINTER_VERSION, RULES, type ComplianceSeverity } from './rules';
import { getServerClient } from '../supabase';

export interface ComplianceViolation {
  ruleId: string;
  kind: string;
  severity: ComplianceSeverity;
  message: string;
  suggestion?: string;
  matches: string[];      // 매칭된 텍스트 (UI 하이라이트용)
}

export interface ComplianceReport {
  status: 'pass' | 'warn' | 'fail';
  violations: ComplianceViolation[];
  linterVersion: string;
  scannedAt: string;
}

export function lintForCompliance(text: string): ComplianceReport {
  const violations: ComplianceViolation[] = [];

  for (const rule of RULES) {
    const matches = text.match(rule.pattern);
    if (!matches || matches.length === 0) continue;
    violations.push({
      ruleId: rule.id,
      kind: rule.kind,
      severity: rule.severity,
      message: rule.message,
      suggestion: rule.suggestion,
      // 중복 제거
      matches: Array.from(new Set(matches))
    });
  }

  const hasFail = violations.some((v) => v.severity === 'fail');
  const hasWarn = violations.some((v) => v.severity === 'warn');
  const status = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

  return {
    status,
    violations,
    linterVersion: LINTER_VERSION,
    scannedAt: new Date().toISOString()
  };
}

/** 채널별 추가 규제 (예: 인스타그램은 가격 광고 추가 제한) */
export function lintForChannel(text: string, channel: 'blog' | 'naver' | 'instagram' | 'video' | 'faq'): ComplianceReport {
  const base = lintForCompliance(text);
  if (channel === 'instagram' || channel === 'video') {
    // 30초 미만 영상/짧은 캡션에서 가격 광고는 항목 명시 어려움 → warn → fail 승격
    base.violations = base.violations.map((v) =>
      v.ruleId === 'PRICE_WARN_001' ? { ...v, severity: 'fail' as const } : v
    );
    if (base.violations.some((v) => v.severity === 'fail')) base.status = 'fail';
  }
  return base;
}

/** DB에 린터 결과 기록 — 추적/감사용 */
export async function recordComplianceResult(
  tenantId: string,
  targetType: 'blog_post' | 'faq' | 'video_script',
  targetId: string,
  report: ComplianceReport
): Promise<void> {
  const client = getServerClient();
  if (!client) return;
  await client.from('compliance_lints').insert({
    tenant_id: tenantId,
    target_type: targetType,
    target_id: targetId,
    status: report.status,
    violations: report.violations,
    lint_version: report.linterVersion
  });
}
