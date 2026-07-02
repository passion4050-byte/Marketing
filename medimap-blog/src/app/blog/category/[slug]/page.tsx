import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import {
  BLOG_CATEGORIES,
  BLOG_CATEGORY_SLUGS,
  getBlogCategoryMeta,
  getPostsByBlogCategory,
  type BlogCategorySlug,
} from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

// Round 111 v3 (2026-07-02) — Editorial category index.
export const dynamic = "force-dynamic";

const CATEGORY_OVERLINE: Record<string, string> = {
  content_marketing: "Content Marketing",
  ai_trend: "AI & Search",
  hospital_marketing: "Hospital Marketing",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const meta = getBlogCategoryMeta(slug);
  if (!meta) return { title: "카테고리 — 위서클 인사이트" };
  const title = `${meta.ko} — 위서클 인사이트`;
  return {
    title,
    description: `${meta.description}. 위서클이 발행하는 자사 마케팅 인사이트.`,
    alternates: { canonical: absoluteUrl(`/blog/category/${slug}`) },
    openGraph: { title, description: meta.description, type: "website" },
  };
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const meta = getBlogCategoryMeta(slug);
  if (!meta) notFound();

  const posts = await getPostsByBlogCategory(meta.slug as BlogCategorySlug);
  const overline = CATEGORY_OVERLINE[meta.slug] ?? meta.slug;

  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-20 md:pb-16 lg:px-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
            <span className="inline-block h-px w-6 bg-stone-400" />
            <Link href="/blog" className="hover:text-stone-900">
              Insights
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900">{overline}</span>
          </nav>

          {/* Masthead */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                {overline}
              </div>
              <h1 className="mt-4 text-[42px] font-black leading-[1.05] tracking-[-0.025em] text-stone-950 md:text-[60px]">
                {meta.ko}
              </h1>
            </div>
            <p className="max-w-md text-[15px] leading-[1.75] text-stone-600 lg:pb-4">
              {meta.description}
            </p>
          </div>
        </div>
      </section>

      {/* Section chips (all categories) */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Sections
            </span>
            {BLOG_CATEGORIES.map((cat) => {
              const active = cat.slug === meta.slug;
              return (
                <Link
                  key={cat.slug}
                  href={`/blog/category/${cat.slug}`}
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
              href="/blog"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-500 hover:text-stone-900"
            >
              All insights
              <ArrowUpRight size={12} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-20 lg:px-10">
        <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
            Archive
          </h2>
          <span className="text-xs tabular-nums text-stone-500">
            {posts.length} stories
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="border border-dashed border-stone-200 bg-white p-16 text-center text-sm text-stone-500">
            아직 발행된 글이 없습니다.
          </div>
        ) : (
          <ol className="divide-y divide-stone-200/70">
            {posts.map((p, i) => (
              <li key={p.slug}>
                <ArticleCard post={p} variant="index" index={i} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
