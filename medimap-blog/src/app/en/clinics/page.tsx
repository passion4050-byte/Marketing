import type { Metadata } from "next";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Partner clinics — WECIRCLE Global",
  alternates: overseasAlternates("en", "/clinics"),
};

export default async function EnClinicsIndex() {
  const partners = await getOverseasPartners("en");
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
      title="Partner clinics"
      subtitle="Korean clinics we publish AI-cited, foreigner-ready content for."
      cards={cards}
      hrefFor={(c) => `/en/clinics/${c.partner_category}/${c.partner_slug}`}
      empty="No partner clinics yet."
    />
  );
}
