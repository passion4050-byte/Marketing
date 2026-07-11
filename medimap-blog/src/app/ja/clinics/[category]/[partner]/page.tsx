import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { partner } = await params;
  return { title: `${partner} — クリニックコンテンツ · WECIRCLE Global` };
}

export default async function JaClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const cards = await getOverseasCards("ja", { kind: "clinic", category, partner });
  return (
    <OverseasListing
      title="提携クリニックのコンテンツ"
      subtitle={`${partner} を紹介するガイド — WECIRCLE が発信する、AIに引用される外国人向けコンテンツ。`}
      cards={cards}
      hrefFor={(c) => `/ja/guides/${c.slug}`}
      empty="クリニックのコンテンツはまだありません。"
    />
  );
}
