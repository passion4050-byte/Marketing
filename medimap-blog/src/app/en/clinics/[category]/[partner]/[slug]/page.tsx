import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClinicContent } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";
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
  ctaTitle: "Interested in this clinic?",
  ctaBody:
    "Message us with your questions. We help you check availability, get a quote and book. Free for you.",
  ctaBtn: "Get my free quote",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner, slug } = await params;
  const g = await getClinicContent("en", partner, slug);
  if (!g) return { title: "Clinic — WECIRCLE Global" };
  return {
    title: g.title,
    description: g.excerpt ?? undefined,
    alternates: overseasAlternates("en", `/clinics/${category}/${partner}/${slug}`),
  };
}

export default async function EnClinicDetailPage({ params }: Props) {
  const { partner, slug } = await params;
  const guide = await getClinicContent("en", partner, slug);
  if (!guide) redirect(`/en/guides/${slug}`);
  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="en" />
      <GuideArticle guide={guide} langPath="en" inLang="en" labels={EN_LABELS} />
    </>
  );
}
