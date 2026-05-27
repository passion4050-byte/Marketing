import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryMeta,
  getPartnerPostsByCategory,
  getPartnersInCategory,
} from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

// Round 13 (2026-05-27): 강한 cache busting — force-dynamic만으론 부족했음.
//   debug API 는 3 rows 정확히 반환하는데 같은 partners.ts 를 호출하는 이 페이지는
//   0개로 stuck. 원인 추정: Vercel edge cache 또는 build-time prerender 잔존.
//   fetchCache + revalidate=0 으로 모든 캐시 경로 차단.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { category } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) return { title: "카테고리 — 메디맵" };
  const title = `${meta.ko} 파트너 콘텐츠 — 메디맵`;
  const description = `메디맵과 함께하는 ${meta.ko} 파트너 병원의 검증된 의료 콘텐츠. ${meta.description}.`;
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/with-partners/${category}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/with-partners/${category}`),
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) notFound();

  // Round 13: sequential await (Promise.all → 모듈 캐시 race condition 제거)
  // 두 함수 모두 내부적으로 getAllPartnerPosts() 호출. sequential 로 첫 호출이
  // 캐시를 채우고 두 번째 호출이 캐시 hit → 결과 일관성 보장.
  const posts = await getPartnerPostsByCategory(meta.slug);
  const partners = await getPartnersInCategory(meta.slug);

  // Round 13 debug: Vercel runtime logs 확인용 (진단 끝나면 제거)
  console.log(
    `[category page] slug=${meta.slug}, posts=${posts.length}, partners=${partners.length}`,
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-14">
      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/with-partners" className="hover:text-brand">
          파트너 콘텐츠
        </Link>{" "}
        / <span className="font-semibold text-ink">{meta.ko}</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {meta.ko} 파트너 콘텐츠
        </h1>
        <p className="mt-3 text-base text-ink-soft">{meta.description}</p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold text-ink">파트너 병원</h2>
        {partners.length === 0 ? (
          <p className="text-sm text-ink-muted">
            아직 등록된 파트너 병원이 없습니다.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((p) => (
              <Link
                key={p.partner_slug}
                href={`/with-partners/${meta.slug}/${p.partner_slug}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow-md"
              >
                <h3 className="text-base font-bold text-ink">{p.tenant_name}</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {p.postCount} 개 글
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-6 text-lg font-bold text-ink">최근 글</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-ink-muted">아직 게시된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 20).map((p) => (
              <Link
                key={p.id}
                href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
              >
                {p.cover_image_url && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={p.cover_image_url}
                      alt={p.cover_image_alt ?? p.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* 파트너 콘텐츠 인디케이터 — 우상단 pill */}
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      Partner
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    {p.tenant_name}
                  </div>
                  <h3 className="mt-2 text-base font-bold leading-snug text-ink transition-colors group-hover:text-emerald-700">
                    {p.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">
                    {p.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-muted">
                    <span>{p.published_at}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white transition-all group-hover:border-emerald-500 group-hover:bg-emerald-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="text-slate-500 transition-colors group-hover:text-white"
                      >
                        <path stroke="currentColor" d="M7 17L17 7" />
                        <path stroke="currentColor" d="M7 7h10v10" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
