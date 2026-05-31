/**
 * Round 37 C (2026-05-31) — 5-tier 분류 공용 모듈.
 *
 * 기존: citations/competitors route.ts 둘 다 Set<string> 하드코딩 + classify 함수 중복.
 * 새 패턴: domain_classifications 테이블에서 read-on-demand → classify 호출 시 set 전달.
 *
 * T1 = 메디맵 자체
 * T2 = 클라이언트 자체 (tenant.homepage + additional_domains, 동적)
 * T3 = 권위 / 학회 / 의료매체 / 의료장비 (DB 분류)
 * T4 = 의료 플랫폼 (DB 분류)
 * T5 = 기타 (default, 즉 T1~T4/NOISE 어디에도 안 잡힌 unknown 도메인)
 * NOISE = 검색/위키/블로그 본 도메인 등 (DB 분류, 카운트 제외)
 */
import { getServerClient } from '@/lib/supabase';

export type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'NOISE';

export type ClassifierSets = {
  medimap: Set<string>;
  authority: Set<string>;
  platform: Set<string>;
  noise: Set<string>;
};

const EMPTY_SETS: ClassifierSets = {
  medimap: new Set(),
  authority: new Set(),
  platform: new Set(),
  noise: new Set(),
};

// 메디맵 카카오 채널 path — pf.kakao.com 의 메디맵 path 만 T1 처리, 일반은 NOISE
export const MEDIMAP_KAKAO_PATHS = ['_xnWQkG'];

// Round 38 후보 — 모듈 캐시 (process 메모리). serverless cold start 마다 재로드.
let cachedSets: ClassifierSets | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

/**
 * DB 의 domain_classifications 에서 활성 분류만 로드하여 4 set 반환.
 * 5분 캐시 — 운영자 admin 편집 후 최대 5분 이내 반영.
 * 로드 실패 시 EMPTY_SETS — citations API 가 T5 default 만 분류 (안전).
 */
export async function loadClassifierSets(): Promise<ClassifierSets> {
  const now = Date.now();
  if (cachedSets && now - cachedAt < CACHE_TTL_MS) {
    return cachedSets;
  }

  const sb = getServerClient();
  if (!sb) return EMPTY_SETS;

  try {
    const { data } = await sb
      .from('domain_classifications')
      .select('domain, tier')
      .eq('is_active', true);
    if (!data) return EMPTY_SETS;

    const sets: ClassifierSets = {
      medimap: new Set(),
      authority: new Set(),
      platform: new Set(),
      noise: new Set(),
    };
    data.forEach((row: { domain: string; tier: string }) => {
      const d = row.domain.toLowerCase();
      if (row.tier === 'T1') sets.medimap.add(d);
      else if (row.tier === 'T3') sets.authority.add(d);
      else if (row.tier === 'T4') sets.platform.add(d);
      else if (row.tier === 'NOISE') sets.noise.add(d);
    });

    cachedSets = sets;
    cachedAt = now;
    return sets;
  } catch {
    return EMPTY_SETS;
  }
}

/** 캐시 강제 무효화 — admin 편집 직후 호출 권장 */
export function invalidateClassifierCache(): void {
  cachedSets = null;
  cachedAt = 0;
}

/**
 * 단일 도메인 분류 — 5-tier.
 * clientDomains 는 tenant.homepage + additional_domains 통합 set (T2 동적 매칭).
 */
export function classifyDomain(
  domain: string | null,
  finalUrl: string | null,
  clientDomains: Set<string> | null,
  sets: ClassifierSets
): Tier {
  if (!domain) return 'NOISE';
  const d = domain.toLowerCase();
  if (sets.medimap.has(d)) return 'T1';
  // pf.kakao.com 의 메디맵 path 는 T1, 그 외는 NOISE set 에 포함됨
  if (d === 'pf.kakao.com' && finalUrl) {
    if (MEDIMAP_KAKAO_PATHS.some((p) => finalUrl.includes(p))) return 'T1';
  }
  if (clientDomains && clientDomains.size > 0) {
    for (const cd of clientDomains) {
      if (d === cd || d.endsWith('.' + cd)) return 'T2';
    }
  }
  if (sets.authority.has(d)) return 'T3';
  if (sets.platform.has(d)) return 'T4';
  if (sets.noise.has(d)) return 'NOISE';
  return 'T5';
}
