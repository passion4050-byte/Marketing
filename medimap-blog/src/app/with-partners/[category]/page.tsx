import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  PARTNER_CATEGORIES,
  getCategoryMeta,
  getPartnerPostsByCategory,
  getPartnersInCategory,
} from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial category page. Off-white, hairline dividers.
// Round 129 — SEO/CWV: force-dynamic → ISR 60s
export const revalidate = 60;

const CATEGORY_OVERLINE: Record<string, string> = {
  eyeclinic: "Ophthalmology",
  derma: "Dermatology",
  plastic: "Plastic Surgery",
  dental: "Dental",
  internal: "Internal Medicine",
  hair: "Hair Transplant",
  oriental: "Oriental Medicine",
};

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) return { title: "카테고리 — 위서클" };
  const title = `${meta.ko} 파트너 콘텐츠 — 위서클`;
  const description = `위서클과 함께하는 ${meta.ko} 파트너 병원의 검증된 콘텐츠. ${meta.description}.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/with-partners/${category}`) },
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

  const posts = await getPartnerPostsByCategory(meta.slug);
  const partners = await getPartnersInCategory(meta.slug);
  const overline = CATEGORY_OVERLINE[meta.slug] ?? meta.slug;

  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      {/* Masthead */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-20 md:pb-16 lg:px-10">
          <nav className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
            <span className="inline-block h-px w-6 bg-stone-400" />
            <Link href="/with-partners" className="hover:text-stone-900">
              Partners
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900">{overline}</span>
          </nav>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                {overline}
              </div>
              <h1 className="mt-4 text-[42px] font-black leading-[1.05] tracking-[-0.025em] text-stone-950 md:text-[60px]">
                {meta.ko} 아카이브
              </h1>
            </div>
            <p className="max-w-md text-[15px] leading-[1.75] text-stone-600 lg:pb-4">
              {meta.description}. 위서클과 함께하는 {meta.ko} 파트너 병원의 콘텐츠를 한 자리에서.
            </p>
          </div>
        </div>
      </section>

      {/* Category chips */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Directory
            </span>
            {PARTNER_CATEGORIES.map((cat) => {
              const active = cat.slug === meta.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/with-partners/${cat.slug}`}
                  className={`inline-flex items-center border px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300/80 bg-white text-stone-800 hover:border-stone-900"
                  }`}
                >
                  {cat.ko}
                </Link>
              );
            })}
            <Link
              href="/with-partners"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-900"
            >
              All partners
              <ArrowUpRight size={12} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* Partners list */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-20 lg:px-10">
          <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
              Partner Clinics
            </h2>
            <span className="text-xs tabular-nums text-stone-500">{partners.length} 개</span>
          </div>

          {partners.length === 0 ? (
            <div className="border border-dashed border-stone-200 bg-white p-16 text-center text-sm text-stone-500">
              아직 등록된 파트너 병원이 없습니다.
            </div>
          ) : (
            <ol className="divide-y divide-stone-200/70">
              {partners.map((p, i) => (
                <li key={p.partner_slug}>
                  <Link
                    href={`/with-partners/${meta.slug}/${p.partner_slug}`}
                    className="group grid grid-cols-[56px_1fr_auto] items-center gap-6 py-8 md:grid-cols-[88px_minmax(0,1fr)_auto] md:gap-10"
                  >
                    <span className="font-serif text-3xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-4xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                        {overline}
                      </div>
                      <h3 className="mt-1.5 text-xl font-bold tracking-tight text-stone-950 md:text-2xl">
                        {p.tenant_name}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black tabular-nums leading-none text-stone-950">
                          {p.postCount}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          posts
                        </span>
                      </div>
                      <ArrowUpRight
                        size={18}
                        strokeWidth={1.5}
                        className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Latest posts grid */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-20 lg:px-10">
        <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
            Latest
          </h2>
          <span className="text-xs tabular-nums text-stone-500">{posts.length} 편</span>
        </div>

        {posts.length === 0 ? (
          <div className="border border-dashed border-stone-200 bg-white p-16 text-center text-sm text-stone-500">
            아직 발행된 글이 없습니다.
          </div>
        ) : (
          <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:grid-cols-3">
            {posts.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
                className="group flex flex-col gap-4"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200">
                  {p.cover_image_url ? (
                    <Image
                      src={p.cover_image_url}
                      alt={p.cover_image_alt ?? p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover grayscale transition duration-[900ms] ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-300">
                      <span className="font-serif text-lg italic">WECIRCLE</span>
                    </div>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-stone-900" />
                  {p.tenant_name}
                </div>
                <h3 className="text-[19px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[21px]">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="line-clamp-2 text-[14px] leading-relaxed text-stone-600">
                    {p.excerpt}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3 border-t border-stone-200/70 pt-3 text-[11px] tabular-nums text-stone-500">
                  <time>{p.published_at}</time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
