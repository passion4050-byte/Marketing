import type { Metadata } from "next";
import { getOverseasCards } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — WECIRCLE Global",
  description: "Treatment guides and insights for foreign patients considering medical care in Korea.",
  alternates: {
    canonical: "/en/blog",
    languages: { en: "/en/blog", ja: "/ja/blog", "zh-Hans": "/zh/blog" },
  },
};

export default async function EnBlogPage() {
  const cards = await getOverseasCards("en", { kind: "blog" });
  return (
    <OverseasListing
      title="Blog"
      subtitle="Treatment guides and insights for foreign patients considering care in Korea."
      cards={cards}
      hrefFor={(c) => `/en/guides/${c.slug}`}
    />
  );
}
