/**
 * Round 147 — 병원 클라이언트 포털: 발행 콘텐츠 전체 목록.
 * 자기 테넌트 발행분만 (세션 tenant 스코프 fail-closed).
 */
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BLOG_BASE = 'https://wecircle.co.kr';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default async function ClientContentsPage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null;

  const [tenantRow, listRes] = await Promise.all([
    sb.from('tenants').select('partner_slug').eq('id', session.tenantId).maybeSingle(),
    sb
      .from('generated_contents')
      .select('title, slug, published_at, is_partner_content, partner_category')
      .eq('tenant_id', session.tenantId)
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .order('published_at', { ascending: false })
      .limit(300),
  ]);

  const partnerSlug = (tenantRow.data as { partner_slug?: string | null } | null)?.partner_slug ?? null;
  const list = (listRes.data ?? []) as Array<{
    title: string | null;
    slug: string | null;
    published_at: string | null;
    is_partner_content: boolean | null;
    partner_category: string | null;
  }>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">발행 콘텐츠</h1>
        <p className="mt-1 text-sm text-stone-500">
          위서클이 우리 병원 이름으로 발행한 콘텐츠 전체 목록입니다. 총{' '}
          <span className="font-semibold tabular-nums text-stone-700">{list.length}</span>편.
        </p>
      </div>

      <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {list.length === 0 ? (
          <p className="p-5 text-sm text-stone-400">아직 발행된 콘텐츠가 없습니다.</p>
        ) : (
          list.map((c, i) => {
            const url = c.slug
              ? c.is_partner_content && c.partner_category && partnerSlug
                ? `${BLOG_BASE}/with-partners/${c.partner_category}/${partnerSlug}/${c.slug}`
                : `${BLOG_BASE}/blog/${c.slug}`
              : null;
            return (
              <div key={`${c.slug}-${i}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className="w-8 shrink-0 text-sm font-bold tabular-nums text-stone-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">
                    {c.title ?? '(제목 없음)'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-400">{fmtDate(c.published_at)}</p>
                </div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-900 hover:text-stone-900"
                  >
                    글 보기
                  </a>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
