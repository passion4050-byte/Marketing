import { format, formatDistanceToNowStrict } from 'date-fns';
import { ko } from 'date-fns/locale';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKst(date: Date | string | number): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utc + KST_OFFSET_MS);
}

export function formatNumber(value: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('ko-KR', opts).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatKstDateTime(date: Date | string | number): string {
  return format(toKst(date), 'yyyy-MM-dd HH:mm', { locale: ko });
}

export function formatKstDate(date: Date | string | number): string {
  return format(toKst(date), 'yyyy-MM-dd', { locale: ko });
}

export function formatRelative(date: Date | string | number): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale: ko });
}

export function deltaSign(value: number): '+' | '-' | '' {
  if (value > 0) return '+';
  if (value < 0) return '-';
  return '';
}
