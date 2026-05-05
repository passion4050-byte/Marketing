/**
 * 한국 시간(KST, UTC+9) 포맷팅 helper.
 *
 * Vercel function 은 UTC timezone 에서 실행되므로 server component 에서
 * `new Date(iso).getHours()` 같은 호출은 KST 가 아닌 UTC 를 반환한다.
 * 이 모듈은 timezone 환경에 무관하게 +9h 직접 가산해 KST 를 일관 출력한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

interface KstParts {
  Y: number;
  M: number;
  D: number;
  h: number;
  m: number;
  s: number;
}

function toKstParts(iso: string): KstParts | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    Y: kst.getUTCFullYear(),
    M: kst.getUTCMonth() + 1,
    D: kst.getUTCDate(),
    h: kst.getUTCHours(),
    m: kst.getUTCMinutes(),
    s: kst.getUTCSeconds(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-05-05 23:32" — KST 분 단위. */
export function formatKstDateTime(iso: string): string {
  const p = toKstParts(iso);
  if (!p) return iso;
  return `${p.Y}-${pad(p.M)}-${pad(p.D)} ${pad(p.h)}:${pad(p.m)}`;
}

/** "2026-05-05" — KST 날짜. */
export function formatKstDate(iso: string): string {
  const p = toKstParts(iso);
  if (!p) return iso;
  return `${p.Y}-${pad(p.M)}-${pad(p.D)}`;
}

/** 상대 시간 — "방금 전" / "N분 전" / "N시간 전" / "N일 전" / 7일 이상은 KST 날짜. */
export function formatKstRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.round(h / 24);
  if (day < 7) return `${day}일 전`;
  return formatKstDate(iso);
}
