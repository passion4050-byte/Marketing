import type { Metadata } from "next";
import { overseasAlternates } from "@/lib/hreflang";
import { getOverseasCards } from "@/lib/guides";
import { OverseasBlogIndex } from "@/components/OverseasBlogIndex";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Korea Treatment Guides & Costs for Foreign Patients",
  description:
    "Guides for foreign patients treated in Korea — skin clinics in Gangnam, LASIK and SMILE surgery, hair transplant, what each procedure costs and how to book.",
  alternates: overseasAlternates("en", "/blog", "/blog"),
};

export default async function EnBlogPage() {
  const cards = await getOverseasCards("en", { kind: "blog" });
  return (
    <OverseasBlogIndex
      lang="en"
      title="Blog"
      subtitle="K-beauty, K-medical excellence and insider tips for foreign patients considering care in Korea."
      cards={cards}
      sectionsLabel="Sections"
      storiesLabel={(n) => `${n} stories`}
    />
  );
}
