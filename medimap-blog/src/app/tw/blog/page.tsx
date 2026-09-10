import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "韓國就診攻略與費用（外國患者）",
  description:
    "給來韓就診患者的攻略。江南皮膚科、SMILE近視雷射、植髮的費用參考，以及預約流程說明。",
  alternates: overseasAlternates("tw", "/blog", "/blog"),
};

export default async function TwBlogPage() {
  const cards = await getOverseasCards("zh-Hant", { kind: "blog" });
  return (
    <OverseasBlogIndex
      lang="tw"
      title="部落格"
      subtitle="韓國醫美與醫療的實力，以及給計畫來韓就診的外國患者的就診攻略。"
      cards={cards}
      sectionsLabel="欄目"
      storiesLabel={(n) => `${n} 篇`}
    />
  );
}
