import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

const CAT_LABELS: Record<string, string> = {
  derma: "皮膚科",
  eyeclinic: "眼科",
  plastic: "美容外科",
  dental: "歯科",
  hair: "植毛",
  oriental: "韓方医学",
  internal: "内科",
};

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = CAT_LABELS[category] ?? category;
  return {
    title: `韓国の${label}クリニック — WECIRCLE Global`,
    alternates: overseasAlternates("ja", `/clinics/${category}`),
  };
}

export default async function JaClinicCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!CAT_LABELS[category]) notFound();
  const label = CAT_LABELS[category];
  const all = await getOverseasPartners("ja");
  const partners = all.filter((p) => p.partner_category === category);
  const cards = partners.map((p) => ({
    slug: p.partner_slug,
    title: p.name,
    excerpt: `${p.count}件のガイド`,
    cover_image_url: p.cover_image_url,
    partner_category: p.partner_category,
    partner_slug: p.partner_slug,
    is_partner: true,
  }));
  return (
    <OverseasListing
      title={`韓国の${label}クリニック`}
      subtitle="AIに引用される外国人向けコンテンツを発信している韓国のクリニック。"
      cards={cards}
      hrefFor={(c) => `/ja/clinics/${category}/${c.partner_slug}`}
      empty="現在、この診療科の提携クリニックを準備中です。"
    />
  );
}
