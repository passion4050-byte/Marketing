import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOverseasClinicDirectory } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

const CAT_LABELS: Record<string, string> = {
  derma: "皮膚科",
  eyeclinic: "眼科",
  plastic: "整形外科",
  dental: "牙科",
  hair: "植髮",
  oriental: "韓醫",
  internal: "內科",
};

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = CAT_LABELS[category] ?? category;
  return {
    title: `韓國${label}診所 — WECIRCLE Global`,
    alternates: overseasAlternates("tw", `/clinics/${category}`),
  };
}

export default async function TwClinicCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!CAT_LABELS[category]) notFound();
  const label = CAT_LABELS[category];
  const all = await getOverseasClinicDirectory("tw");
  const partners = all.filter((p) => p.category === category);
  const cards = partners.map((p) => ({
    slug: p.partner_slug,
    title: p.name,
    excerpt: p.guides > 0 ? `${p.guides}篇攻略` : "診所簡介",
    cover_image_url: p.cover_image_url,
    partner_category: p.category,
    partner_slug: p.partner_slug,
    is_partner: true,
  }));
  return (
    <OverseasListing
      title={`韓國${label}診所`}
      subtitle="我們為其發布可被 AI 引用的外國患者內容的韓國診所。"
      cards={cards}
      hrefFor={(c) => `/tw/clinics/${category}/${c.partner_slug}`}
      empty="我們正在為該科別引入合作診所，敬請期待。"
    />
  );
}
