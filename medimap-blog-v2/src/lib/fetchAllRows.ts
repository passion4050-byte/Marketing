/**
 * Round 163b (2026-08-17) — supabase-js 1,000행 캡 대응 공용 페이지네이션 헬퍼.
 *
 * 배경: Supabase PostgREST 의 max-rows(1,000)는 서버측 하드 캡이라
 * `.limit(20000)` 을 줘도 1,000행에서 **에러 없이 조용히 잘린다**.
 * 실사고: /admin/citations 집계가 잘린 데이터로 계산되고 있었음 (Round 163).
 *
 * 사용법 — 페이지마다 쿼리를 새로 빌드하는 콜백을 넘긴다 (builder 재사용 불가):
 *   const rows = await fetchAllRows<{ id: number }>((from, to) =>
 *     sb.from('responses').select('id').gte('created_at', cutoff)
 *       .order('id').range(from, to));
 *
 * ⚠ 반드시 .order() 를 포함할 것 — 정렬 없는 .range() 페이지네이션은
 *   페이지 간 중복/누락이 생길 수 있다.
 * ⚠ 대량(만 단위) 집계가 반복 호출되는 핫패스는 이 헬퍼 대신 RPC(jsonb 단일값)
 *   로 옮길 것 (citations_dashboard 패턴) — 헬퍼는 왕복이 페이지 수만큼 늘어난다.
 */

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts: { pageSize?: number; maxRows?: number } = {}
): Promise<T[]> {
  const pageSize = opts.pageSize ?? 1000;
  const maxRows = opts.maxRows ?? 50000; // 폭주 방지 상한
  const out: T[] = [];
  for (let from = 0; out.length < maxRows; from += pageSize) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) break; // 부분 결과라도 반환 (기존 단발 쿼리와 동일한 관용성)
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** `.in()` 대상 id 가 많을 때 URL 길이·캡 양쪽을 피하는 청크 수집. */
export async function fetchByIdChunks<T, K>(
  ids: K[],
  buildChunk: (chunk: K[]) => PromiseLike<PageResult<T>>,
  chunkSize = 500
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { data, error } = await buildChunk(ids.slice(i, i + chunkSize));
    if (error) continue;
    out.push(...(data ?? []));
  }
  return out;
}
