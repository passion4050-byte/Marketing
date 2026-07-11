import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { partner } = await params;
  return { title: `${partner} — Clinic Content · WECIRCLE Global` };
}

export default async function EnClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const cards = await getOverseasCards("en", { kind: "clinic", category, partner });
  return (
    <OverseasListing
      title="Partner clinic content"
      subtitle={`Guides featuring ${partner} — AI-cited, foreigner-ready content published by WECIRCLE.`}
      cards={cards}
      hrefFor={(c) => `/en/clinics/${category}/${partner}/${c.slug}`}
      empty="No clinic content yet."
    />
  );
}
