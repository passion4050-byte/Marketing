import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "博客 — WECIRCLE Global",
  description: "韩国美容与医疗的实力，以及面向计划来韩就诊的外国患者的就诊攻略。",
  alternates: {
    canonical: "/zh/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog", "zh-Hant": "/tw/blog" },
  },
};

export default async function ZhBlogPage() {
  const cards = await getOverseasCards("zh-Hans", { kind: "blog" });
  return (
    <OverseasBlogIndex
      lang="zh"
      title="博客"
      subtitle="韩国美容与医疗的实力，以及面向计划来韩就诊的外国患者的就诊攻略。"
      cards={cards}
      sectionsLabel="栏目"
      storiesLabel={(n) => `${n} 篇`}
    />
  );
}
