import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

const CAT_LABELS: Record<string, string> = {
  derma: "Dermatology",
  eyeclinic: "Eye Care",
  plastic: "Plastic Surgery",
  dental: "Dental",
  hair: "Hair Restoration",
  oriental: "Korean Medicine",
  internal: "Internal Medicine",
};

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = CAT_LABELS[category] ?? category;
  return {
    title: `${label} Clinics in Korea — WECIRCLE Global`,
    alternates: overseasAlternates("en", `/clinics/${category}`),
  };
}

export default async function EnClinicCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!CAT_LABELS[category]) notFound();
  const label = CAT_LABELS[category];
  const all = await getOverseasPartners("en");
  const partners = all.filter((p) => p.partner_category === category);
  const cards = partners.map((p) => ({
    slug: p.partner_slug,
    title: p.name,
    excerpt: `${p.count} guide${p.count === 1 ? "" : "s"}`,
    cover_image_url: p.cover_image_url,
    partner_category: p.partner_category,
    partner_slug: p.partner_slug,
    is_partner: true,
  }));
  return (
    <OverseasListing
      title={`${label} clinics in Korea`}
      subtitle="Korean clinics we publish AI-cited, foreigner-ready content for."
      cards={cards}
      hrefFor={(c) => `/en/clinics/${category}/${c.partner_slug}`}
      empty="We're onboarding partner clinics in this specialty — check back soon."
    />
  );
}
