/**
 * 어드민 언어 스코프 — 서버(SSR) 측 헬퍼.
 *
 * ScopeSelector(client)가 쿠키 `wc_admin_scope` 에 스코프를 기록하고 router.refresh()
 * 하면, 서버 컴포넌트가 이 헬퍼로 스코프를 읽어 쿼리를 언어별로 필터한다.
 *
 * ⚠️ zh 값 이원화: 측정(keywords)=`zh-Hant`, 콘텐츠(generated_contents)=`zh-Hans`.
 *    대상 테이블에 맞는 매퍼를 반드시 골라 쓸 것.
 */
import { cookies } from 'next/headers';

export const SCOPE_KEY = 'wc_admin_scope';

/** 서버에서 현재 스코프 읽기 (쿠키). 없으면 'all'. */
export function getScopeServer(): string {
  try {
    return cookies().get(SCOPE_KEY)?.value || 'all';
  } catch {
    return 'all';
  }
}

/** 스코프 → keywords.lang (측정 계열). zh=zh-Hant. null=전체(통합). */
export function scopeToKeywordLang(scope: string): string | null {
  switch (scope) {
    case 'ko':
      return 'ko';
    case 'en':
      return 'en';
    case 'ja':
      return 'ja';
    case 'zh':
      return 'zh-Hant';
    default:
      return null;
  }
}

/** 스코프 → generated_contents.lang (콘텐츠 계열). zh=zh-Hans. null=전체(통합). */
export function scopeToContentLang(scope: string): string | null {
  switch (scope) {
    case 'ko':
      return 'ko';
    case 'en':
      return 'en';
    case 'ja':
      return 'ja';
    case 'zh':
      return 'zh-Hans';
    default:
      return null;
  }
}

/** 스코프 라벨 (UI 표기용). */
export function scopeLabel(scope: string): string {
  switch (scope) {
    case 'ko':
      return '국내';
    case 'en':
      return 'EN';
    case 'ja':
      return 'JA';
    case 'zh':
      return 'ZH';
    default:
      return '통합';
  }
}
