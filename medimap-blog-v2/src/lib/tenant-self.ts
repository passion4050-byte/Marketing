/**
 * Round 203 (2026-09-14) — 자사(self) tenant 판정 정본.
 *
 * 🔴 리브랜드(메디맵→위서클)로 자사 tenant 의 partner_slug 가 'medimap-self' → 'wecircle-self'
 *   로 바뀌었는데, 어드민 API 들은 `partner_slug === 'medimap-self'` 를 그대로 검사했다.
 *   위서클(12)의 business_model 은 '모발이식' 이라 그 검사도 안 걸려 **is_self=false**.
 *   결과: /admin/competitors 에서 위서클을 고르면 own 키워드 29개 대신
 *   competitor_landscape 키워드 1개만 분석됐다.
 *   파이썬 스케줄러는 Round 189 에서 접미사 판정으로 고쳤고, 어드민만 남아 있었다.
 *
 * 규칙은 scheduler.py Round 189 와 동일: 다음 리브랜드에도 안 깨지게 접미사로 판정한다.
 */
export function isSelfTenant(t: {
  business_model?: string | null;
  partner_slug?: string | null;
}): boolean {
  const bm = (t.business_model ?? '').trim().toLowerCase();
  const ps = (t.partner_slug ?? '').trim().toLowerCase();
  return bm === 'self' || ps === 'self' || ps.endsWith('-self');
}
