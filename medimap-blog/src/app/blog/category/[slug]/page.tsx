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
        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 pt-16 pb-14 md:pt-20 md:pb-16 lg:px-10">
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
                {overli