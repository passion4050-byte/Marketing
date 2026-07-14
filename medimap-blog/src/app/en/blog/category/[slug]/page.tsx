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
  const cards = await getOverseasCards("en", { kind: "blog", blogCategory: slug });
  return (
    <OverseasBlogIndex
      lang="en"
      title={meta.label}
      subtitle={meta.desc}
      cards={cards}
      sectionsLabel="Sections"
      storiesLabel={(n) => `${n} stories`}
      activeCat={slug}
    />
  );
}
