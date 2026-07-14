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
  if (!isOverseasBlogCategory(slug)) return { title: "Blog — WECIRCLE Global" };
  const meta = OVERSEAS_BLOG_LABELS.en[slug];
  return {
    title: `${meta.label} — WECIRCLE Global`,
    description: meta.desc,
    alternates: overseasAlternates("en", `/blog/category/${slug}`),
  };
}

export default async function EnBlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  if (!isOverseasBlogCategory(slug)) notFound();
  const meta = OVERSEAS_BLOG_LABELS.en[slug];
  const all = await getOverseasCards("en", { kind: "blog" });
  const counts = all.reduce<Record<string, number>>((a, c) => {
    if (c.blog_category) a[c.blog_category] = (a[c.blog_category] ?? 0) + 1;
    return a;
  }, {});
  const cards = all.filter((c) => c.blog_category === slug);
  return (
    <OverseasBlogIndex
      lang="en"
      title={meta.label}
      subtitle={meta.desc}
      cards={cards}
      counts={counts}
      sectionsLabel="Sections"
      storiesLabel={(n) => `${n} stories`}
      activeCat={slug}
    />
  );
}
