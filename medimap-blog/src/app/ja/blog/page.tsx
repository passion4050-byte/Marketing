import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ブログ — WECIRCLE Global",
  description: "K-ビューティー・K-医療の実力、そして韓国での施術を検討する外国人患者向けの活用のコツ。",
  alternates: {
    canonical: "/ja/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog", "zh-Hant": "/tw/blog" },
  },
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
