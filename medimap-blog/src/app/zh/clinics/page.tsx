import type { Metadata } from "next";
import { getOverseasPartners } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "合作诊所 — WECIRCLE Global",
  alternates: { canonical: "/zh/clinics" },
};

export default async function ZhClinicsIndex() {
  const partners = await getOverseasPartners("zh-Hans");
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
      title="合作诊所"
      subtitle="我们为其发布可被 AI 引用的外国患者内容的韩国诊所。"
      cards={cards}
      hrefFor={(c) => `/zh/clinics/${c.partner_category}/${c.partner_slug}`}
      empty="暂无合作诊所。"
    />
  );
}
