import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getGuide } from "@/lib/guides";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide("en", slug);
  if (!guide) return { title: "Guide — WECIRCLE Global" };
  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/en/guides/${slug}`,
      languages: {
        en: `/en/guides/${slug}`,
        ja: `/ja/guides/${slug}`,
        "zh-Hans": `/zh/guides/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.excerpt ?? undefined,
      images: guide.cover_image_url ? [guide.cover_image_url] : undefined,
    },
  };
}

const EN_LABELS: GuideLabels = {
  guides: "Guides",
  faq: "Frequently asked questions",
  updated: "Updated",
  ctaTitle: "Want your clinic featured & cited by AI?",
  ctaBody:
    "This is the kind of guide WECIRCLE publishes so ChatGPT, Perplexity and Gemini recommend partner clinics to foreign patients.",
  ctaBtn: "Talk to WECIRCLE →",
};

export default async function EnGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide("en", slug);
  if (!guide) notFound();
  if (guide.is_partner && guide.partner_category && guide.partner_slug) {
    redirect(`/en/clinics/${guide.partner_category}/${guide.partner_slug}/${slug}`);
  }
  return <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} />;
}
