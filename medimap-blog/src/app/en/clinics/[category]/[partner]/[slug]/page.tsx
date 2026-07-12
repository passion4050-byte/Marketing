import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClinicContent } from "@/lib/guides";
import { GuideArticle, type GuideLabels } from "@/components/GuideArticle";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string; slug: string }>;
}

const EN_LABELS: GuideLabels = {
  guides: "Clinics",
  faq: "Frequently asked questions",
  updated: "Updated",
  ctaTitle: "Want your clinic featured & cited by AI?",
  ctaBody:
    "This is the kind of content WECIRCLE publishes so ChatGPT, Perplexity and Gemini recommend partner clinics to foreign patients.",
  ctaBtn: "Talk to WECIRCLE →",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("en", partner, slug);
  if (!g) return { title: "Clinic — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: { canonical: `/en/clinics/${category}/${partner}/${slug}` },
  };
}

export default async function EnClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const guide = await getClinicContent("en", partner, slug);
  if (!guide) notFound();
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="en" />
      <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} />
    </>
  );
}
