import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

const CAT_LABELS: Record<string, string> = {
  derma: "皮肤科",
  eyeclinic: "眼科",
  plastic: "整形外科",
  dental: "牙科",
  hair: "植发",
  oriental: "韩医",
  internal: "内科",
};

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = CAT_LABELS[category] ?? category;
  return {
    title: `韩国${label}诊所 — WECIRCLE Global`,
    alternates: { canonical: `/zh/clinics/${category}` },
  };
}

export default async function ZhClinicCategoryPage({ params }: Props) {
  const { category } = await params;
  const all = await getOverseasPartners("zh-Hans");
  const partners = all.filter((p) => p.partner_category === category);
  if (partners.length === 0) notFound();
  const label = CAT_LABELS[category] ?? category;
  const cards = partners.map((p) => ({
    slug: p.partner_slug,
    title: p.name,
    excerpt: `${p.count}篇指南`,
    cover_image_url: p.cover_image_url,
    partner_category: p.partner_category,
    partner_slug: p.partner_slug,
    is_partner: true,
  }));
  return (
    <OverseasListing
      title={`韩国${label}诊所`}
      subtitle="我们为其发布可被 AI 引用的外国患者内容的韩国诊所。"
      cards={cards}
      hrefFor={(c) => `/zh/clinics/${category}/${c.partner_slug}`}
      empty="暂无诊所。"
    />
  );
}
