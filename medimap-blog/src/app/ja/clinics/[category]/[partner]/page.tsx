import type { Metadata } from "next";
import { getOverseasCards, getPartnerBySlug, overseasPartnerName } from "@/lib/guides";
import { OverseasListing } from "@/components/OverseasListing";
import { OverseasClinicSchema } from "@/components/OverseasClinicSchema";
import { ContactButtons } from "@/components/ContactButtons";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

interface Props {
  params: Promise<{ category: string; partner: string }>;
}

// Round 145d — 표시명 title + 콘텐츠 0 프로필 폴백 (감사 #8·#9)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner } = await params;
  const info = await getPartnerBySlug(partner);
  const name = overseasPartnerName(partner, "ja", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("ja", `/clinics/${category}/${partner}`),
  };
}

export default async function JaClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info] = await Promise.all([
    getOverseasCards("ja", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
  ]);
  const name = overseasPartnerName(partner, "ja", info?.name ?? partner);

  if (cards.length === 0) {
    return (
      <>
        <OverseasClinicSchema partnerSlug={partner} lang="ja" />
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h1 className="text-3xl font-black tracking-tight text-stone-950 md:text-4xl">{name}</h1>
          <p className="mt-3 text-stone-600">
            外国人患者を受け入れるWECIRCLE提携医療機関です。
          </p>
          <dl className="mt-8 space-y-3 rounded-2xl border border-stone-200 bg-white p-6 text-sm">
            {info?.address && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">住所</dt>
                <dd className="text-stone-600">{info.address}</dd>
              </div>
            )}
            {info?.homepage && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">サイト</dt>
                <dd>
                  <a
                    href={info.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1B68FF] hover:underline"
                  >
                    {info.homepage.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-8 rounded-2xl bg-stone-950 px-6 py-8 text-white">
            <h2 className="text-xl font-black">このクリニックが気になりますか？</h2>
            <p className="mt-2 text-sm text-stone-300">
              ガイドは準備中です。LINEでご連絡いただければ、空き状況や費用を無料でお調べします。
            </p>
            <ContactButtons lang="ja" waLabel="WhatsApp" lineLabel="LINEで無料見積もり" className="mt-5" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="ja" />
      <OverseasListing
        title={name}
        subtitle={`${name} を紹介する検証済みガイド — WECIRCLE発信。`}
        cards={cards}
        hrefFor={(c) => `/ja/clinics/${category}/${partner}/${c.slug}`}
        empty="クリニックのコンテンツはまだありません。"
      />
    </>
  );
}
