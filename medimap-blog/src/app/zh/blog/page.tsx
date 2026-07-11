import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "博客 — WECIRCLE Global",
  description: "面向计划来韩国就诊的外国患者的项目指南与资讯。",
  alternates: {
    canonical: "/zh/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog" },
  },
};

export default async function ZhBlogPage() {
  const cards = await getOverseasCards("zh-Hans", { kind: "blog" });
  return (
    <OverseasListing
      title="博客"
      subtitle="面向计划来韩国就诊的外国患者的项目指南与资讯。"
      cards={cards}
      hrefFor={(c) => `/zh/guides/${c.slug}`}
      empty="暂无文章。"
    />
  );
}
