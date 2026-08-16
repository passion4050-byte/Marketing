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

// 위서클 카카오 채널 path — pf.kakao.com 중 자사 path 만 T1, 그 외는 NOISE.
// 🔴 Round 151 — '_xnWQkG' 는 전 직장(메디맵) 채널 → 절대 추가 금지 (자사 점유율 오염).
// Round 159 (2026-08-16) — 카카오 정본 = 신규 비즈니스채널 pf.kakao.com/_xouLiX/chat
//   (구 정본 open.kakao.com/o/spyAz9Bi 오픈채팅에서 이전. shortlinks 257행 DB 교체 완료.)
export const MEDIMAP_KAKAO_PATHS: string[] = ['_xouLiX'];

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

/**
 * URL → 호스트명(소문자, www 제거). Round 144 — citations/route.ts 로컬 구현을
 * 공용으로 승격. tenant.homepage / additional_domains 파싱에 사용.
 */
export function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** 캐시 강제 무효화 — admin 편집 직후 호출 권장 */
export function invalidateClassifierCache(): void {
  cachedSets = null;
  cachedAt = 0;
}

/**
 * set 매칭 — exact + 서브도메인(endsWith '.'+등록도메인).
 * Round 143d(2026-07-18) SEO/GEO 감사: 이전엔 `set.has(d)` exact 만 해
 *   `xxx.tistory.com`(NOISE 등록된 tistory.com 서브) 75+개가 전부 T5(경쟁사)로
 *   오집계됐음. 리딩 닷('.'+e)이라 notgoogle.com 같은 false match 없음.
 */
function inSetWithSub(d: string, set: Set<string>): boolean {
  if (set.has(d)) return true;
  for (const e of set) {
    if (d.endsWith("." + e)) return true;
  }
  return false;
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
  if (inSetWithSub(d, sets.medimap)) return 'T1';
  // pf.kakao.com 의 메디맵 path 는 T1, 그 외는 NOISE set 에 포함됨
  if (d === 'pf.kakao.com' && finalUrl) {
    if (MEDIMAP_KAKAO_PATHS.some((p) => finalUrl.includes(p))) return 'T1';
  }
  if (clientDomains && clientDomains.size > 0) {
    for (const cd of clientDomains) {
      if (d === cd || d.endsWith('.' + cd)) return 'T2';
    }
  }
  if (inSetWithSub(d, sets.authority)) return 'T3';
  if (inSetWithSub(d, sets.platform)) return 'T4';
  if (inSetWithSub(d, sets.noise)) return 'NOISE';
  return 'T5';
}
