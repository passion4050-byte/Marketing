import type { Metadata } from "next";
import { overseasAlternates } from "@/lib/hreflang";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "韓国 施術ガイド・費用（外国人患者向け）",
  description:
    "韓国で施術を受ける方向けのガイド。江南の皮膚科、スマイルラシック、植毛の費用の目安と、予約までの進め方をまとめています。",
  alternates: overseasAlternates("ja", "/blog", "/blog"),
};

export default async function JaBlogPage() {
  const cards = await getOverseasCards("ja", { kind: "blog" });
  return (
    <OverseasBlogIndex
      lang="ja"
      title="ブログ"
      subtitle="K-ビューティー・K-医療の実力、そして韓国での施術を検討する外国人患者向けの活用のコツ。"
      cards={cards}
      sectionsLabel="セクション"
      storiesLabel={(n) => `${n} 記事`}
    />
  );
}
