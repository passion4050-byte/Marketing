import type { Metadata } from "next";
import { overseasAlternates } from "@/lib/hreflang";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "韩国就诊指南与费用（外国患者）",
  description:
    "面向来韩就诊患者的指南。江南皮肤科、SMILE激光近视手术、植发的费用参考，以及预约流程说明。",
  alternates: overseasAlternates("zh", "/blog", "/blog"),
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
