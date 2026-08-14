import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide } from "@/lib/guides";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";

// 구 하드코딩 샘플 → DB 가이드(overseas en) 렌더로 통일. JA/ZH(/guides/[slug])와 일관 + 언어토글·커버.
export const revalidate = 60;

const SLUG = "best-skin-clinics-in-gangnam";

export async function generateMetadata(): Promise<Metadata> {
  const guide = await getGuide("en", SLUG);
  if (!guide) return { title: "Best Skin Clinics in Gangnam — WECIRCLE Global" };
  return {
    title: guide.title,
    description: guide.excerpt ?? undefined,
    alternates: {
      canonical: `/en/guides/${SLUG}`,
      languages: {
        en: `/en/guides/${SLUG}`,
        ja: `/ja/guides/${SLUG}`,
        "zh-Hans": `/zh/guides/${SLUG}`,
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
  ctaTitle: "Planning treatment in Korea?",
  ctaBody:
    "Message us with your questions. We help you compare clinics, get quotes and book. Free for you.",
  ctaBtn: "Chat on WhatsApp",
};

export default async function BestSkinClinicsGangnamPage() {
  const guide = await getGuide("en", SLUG);
  if (!guide) notFound();
  return <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} />;
}
