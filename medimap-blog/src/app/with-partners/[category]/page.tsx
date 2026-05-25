import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PARTNER_CATEGORY_SLUGS,
  getCategoryMeta,
  getPartnerPostsByCategory,
  getPartnersInCategory,
} from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return PARTNER_CATEGORY_SLUGS.map((category) => ({ category }));
}

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

  const [posts, partners] = await Promise.all([
    getPartnerPostsByCategory(meta.slug),
    getPartnersInCategory(meta.slug),
  ]);

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
        <h2 className="mb-4 text-lg font-bold text-ink">최근 글</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-ink-muted">아직 게시된 글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {posts.slice(0, 20).map((p) => (
              <li key={p.id} className="py-4">
                <Link
                  href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
                  className="block hover:text-brand"
                >
                  <div className="text-xs text-ink-muted">
                    {p.tenant_name} · {p.published_at}
                  </div>
                  <div className="mt-1 text-base font-bold text-ink">
                    {p.title}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft line-clamp-2">
                    {p.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
