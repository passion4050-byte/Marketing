import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";
import { overseasAlternates } from "@/lib/hreflang";
import {
  OVERSEAS_BLOG_CATEGORIES,
  OVERSEAS_BLOG_LABELS,
  isOverseasBlogCategory,
} from "@/lib/overseasBlog";

export const revalidate = 60;

export function generateStaticParams() {
  return OVERSEAS_BLOG_CATEGORIES.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isOverseasBlogCategory(slug)) return { title: "博客 — WECIRCLE Global" };
  const meta = OVERSEAS_BLOG_LABELS.zh[slug];
  return {
    title: `${meta.label} — WECIRCLE Global`,
    description: meta.desc,
    alternates: overseasAlternates("zh", `/blog/category/${slug}`),
  };
}

export default async function ZhBlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  if (!isOverseasBlogCategory(slug)) notFound();
  const meta = OVERSEAS_BLOG_LABELS.zh[slug];
  const cards = await getOverseasCards("zh-Hans", { kind: "blog", blogCategory: slug });
  return (
    <OverseasBlogIndex
      lang="zh"
      title={meta.label}
      subtitle={meta.desc}
      cards={cards}
      sectionsLabel="栏目"
      storiesLabel={(n) => `${n} 篇`}
      activeCat={slug}
    />
  );
}
