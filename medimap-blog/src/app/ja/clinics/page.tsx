import type { Metadata } from "next";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "提携クリニック — WECIRCLE Global",
  alternates: overseasAlternates("ja", "/clinics"),
};

export default async function JaClinicsIndex() {
  const partners = await getOverseasPartners("ja");
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
      title="提携クリニック"
      subtitle="AIに引用される外国人向けコンテンツを発信している韓国のクリニック。"
      cards={cards}
      hrefFor={(c) => `/ja/clinics/${c.partner_category}/${c.partner_slug}`}
      empty="提携クリニックはまだありません。"
    />
  );
}
