'use client';

/**
 * ScopeSelector — 어드민 전역 언어 스코프 셀렉터 (통합/국내/EN/JA/ZH).
 *
 * localStorage(wc_admin_scope) + CustomEvent(wc-scope) 로 페이지 이동에도 유지되며,
 * 스코프 인지 컴포넌트(CcsTrend 등)가 이벤트를 구독해 데이터를 언어별로 필터.
 * 예: EN 상품 병원 담당 시 EN 선택 → 어드민 지표가 EN 데이터만 표시.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

export const SCOPE_KEY = 'wc_admin_scope';
export const SCOPE_EVENT = 'wc-scope';

/**
 * Round 169 (2026-08-20) — 모바일: 스코프 목록/저장 로직을 export.
 * 모바일 헤더의 바텀시트 셀렉터(AdminShell)가 같은 정의·같은 저장 규칙을 쓰도록
 * 여기 한 곳에서만 관리한다. (중복 구현 시 cookie/localStorage 불일치 위험)
 */
export const SCOPES = [
  { key: 'all', label: '통합', short: '통합', desc: '전 언어 합산' },
  { key: 'ko', label: '🇰🇷 국내', short: 'KO', desc: '한국어 콘텐츠·키워드' },
  { key: 'en', label: 'EN', short: 'EN', desc: '영어 (English)' },
  { key: 'ja', label: 'JA', short: 'JA', desc: '일본어 (日本語)' },
  { key: 'zh', label: 'ZH', short: 'ZH', desc: '중국어 (中文)' },
] as const;

/** 좁은 헤더용 짧은 라벨 — 통합/KO/EN/JA/ZH */
export function scopeShortLabel(k: string): string {
  return SCOPES.find((s) => s.key === k)?.short ?? '통합';
}

/**
 * 스코프 저장 — localStorage + cookie(SSR 서버 컴포넌트용) + 동기화 이벤트.
 * router.refresh() 는 hook 이 필요하므로 호출부에서 이어서 실행할 것.
 */
export function persistScope(k: string): void {
  try {
    localStorage.setItem(SCOPE_KEY, k);
  } catch {
    /* ignore */
  }
  // 서버 컴포넌트가 스코프를 읽도록 쿠키에도 기록 → SSR 페이지 스코프 인지.
  try {
    document.cookie = `${SCOPE_KEY}=${k}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  // 클라이언트 스코프 컴포넌트(localStorage 구독) 동기화
  window.dispatchEvent(new CustomEvent(SCOPE_EVENT, { detail: k }));
}

/** 스코프 키 → keywords.lang 값 (null = 전체). 소비 컴포넌트 공용. */
export function scopeToLang(scope: string): string | null {
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

/**
 * 스코프 키 → generated_contents.lang 값 (null = 전체).
 * ⚠️ 콘텐츠는 zh 를 'zh-Hans' 로 저장(측정 keywords 는 'zh-Hant'). 콘텐츠 기반
 * 지표(콘텐츠 경쟁력·발행수 등)는 반드시 이 헬퍼를 써야 ZH 가 0으로 새지 않음.
 */
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

/** 현재 스코프 읽기 (localStorage, SSR 안전). */
export function readScope(): string {
  if (typeof window === 'undefined') return 'all';
  try {
    return localStorage.getItem(SCOPE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

export function ScopeSelector() {
  const [scope, setScope] = useState('all');
  const router = useRouter();

  useEffect(() => {
    setScope(readScope());
    // 다른 탭/컴포넌트에서 바뀌면 동기화
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setScope(detail);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  const pick = (k: string) => {
    setScope(k);
    persistScope(k);
    // SSR 데이터(쿠키 기반)를 새 스코프로 재요청
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
        <Globe className="h-3 w-3" />
        언어 스코프
      </span>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-base p-0.5">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => pick(s.key)}
            className={
              scope === s.key
                ? 'rounded-md bg-accent-deep px-2.5 py-1 text-[11px] font-bold text-white'
                : 'rounded-md px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition hover:text-ink'
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
