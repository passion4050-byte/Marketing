/**
 * Round 144 (2026-08-02) — 클라이언트 공개 보고서 링크 토큰.
 *
 * 배경: 기존 월간 보고서 이메일의 CTA 는 `/admin/reports/{tenantId}` 를 가리켰는데
 *   middleware 가 `/admin/*` 전체를 admin 쿠키로 막고 있어 **클라이언트는 로그인
 *   화면으로 튕겼음**. 그렇다고 admin 비밀번호를 알려주면 13개 테넌트 전체 데이터가
 *   노출됨. → 로그인 없이 자기 것만 보는 서명 링크가 필요.
 *
 * 설계:
 *   - HMAC-SHA256(`${tenantId}:${period}`, REPORT_TOKEN_SECRET) 앞 20자(base64url)
 *   - DB 테이블 불필요(무상태). 시크릿을 바꾸면 기존 링크가 일괄 무효화됨.
 *   - period 가 서명에 포함되므로 한 링크로 다른 달을 볼 수 없음.
 *   - tenantId 가 서명에 포함되므로 링크를 고쳐 남의 병원 보고서를 볼 수 없음.
 *
 * 한계(의도적):
 *   - 링크를 받은 사람이 전달하면 그 사람도 볼 수 있음(공유 링크 모델).
 *     의료 개인정보가 아니라 자사 마케팅 집계치라 이 수준으로 충분하다고 판단.
 *   - 만료 없음. 필요해지면 secret rotation 으로 일괄 무효화.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/** yyyy-MM 형식 검증. */
export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

function secret(): string {
  // ADMIN_SESSION_SECRET 를 fallback 으로 씀 — 이미 32자 이상으로 설정돼 있어
  // 신규 env 없이도 동작. 별도 관리하려면 REPORT_TOKEN_SECRET 를 설정.
  const s = process.env.REPORT_TOKEN_SECRET || process.env.ADMIN_SESSION_SECRET || '';
  return s;
}

/** 토큰 생성. 시크릿 미설정 시 null (호출부가 링크 발급을 포기해야 함). */
export function makeReportToken(tenantId: number | string, period: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac('sha256', s)
    .update(`${tenantId}:${period}`)
    .digest('base64url')
    .slice(0, 20);
}

/** 토큰 검증 — 타이밍 안전 비교. */
export function verifyReportToken(
  tenantId: number | string,
  period: string,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  const expected = makeReportToken(tenantId, period);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * 이메일/공유용 절대 URL. 시크릿 미설정 시 null.
 *
 * ⚠️ 경로는 `/report/...` — `/r/` 는 이미 ShortLink(`/r/[slug]`)가 쓰고 있다.
 *   Next.js 는 같은 depth 에 서로 다른 동적 세그먼트명을 허용하지 않아
 *   (`'slug' !== 'tenantId'`) 빌드가 통째로 실패한다. (Round 144 실사고)
 */
export function buildReportUrl(
  origin: string,
  tenantId: number | string,
  period: string,
): string | null {
  const t = makeReportToken(tenantId, period);
  if (!t) return null;
  return `${origin}/report/${tenantId}/${period}?t=${t}`;
}

/** 'YYYY년 M월 (최근 30일 기준)' 같은 라벨에서 yyyy-MM 추출. 실패 시 이번 달. */
export function periodKeyFromLabel(label: string | undefined): string {
  const m = (label ?? '').match(/(\d{4})\D+(\d{1,2})/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`;
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
