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

// Round 145d — 표시명 title (감사 #9: "dear — Clinic Content · ... · ..." raw slug 수정)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, partner } = await params;
  const info = await getPartnerBySlug(partner);
  const name = overseasPartnerName(partner, "en", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("en", `/clinics/${category}/${partner}`),
  };
}

export default async function EnClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info] = await Promise.all([
    getOverseasCards("en", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
  ]);
  const name = overseasPartnerName(partner, "en", info?.name ?? partner);

  // Round 145d — 콘텐츠 0 이어도 엔티티 프로필 렌더 (감사 #8: 여정 단절 해소)
  if (cards.length === 0) {
    return (
      <>
        <OverseasClinicSchema partnerSlug={partner} lang="en" />
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h1 className="text-3xl font-black tracking-tight text-stone-950 md:text-4xl">{name}</h1>
          <p className="mt-3 text-stone-600">
            A WECIRCLE partner medical institution accepting international patients.
          </p>
          <dl className="mt-8 space-y-3 rounded-none border border-stone-200 bg-white p-6 text-sm">
            {info?.address && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Address</dt>
                <dd className="text-stone-600">{info.address}</dd>
              </div>
            )}
            {info?.homepage && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Website</dt>
                <dd>
                  <a
                    href={info.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-900 hover:underline"
                  >
                    {info.homepage.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-8 rounded-none bg-stone-950 px-6 py-8 text-white">
            <h2 className="text-xl font-black">Interested in this clinic?</h2>
            <p className="mt-2 text-sm text-stone-300">
              Guides are on the way. Meanwhile, message us and we check availability and pricing
              for you. Free for you.
            </p>
            <ContactButtons lang="en" waLabel="Get my free quote" className="mt-5" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="en" />
      <OverseasListing
        title={name}
        subtitle={`Verified guides featuring ${name}, published by WECIRCLE.`}
        cards={cards}
        hrefFor={(c) => `/en/clinics/${category}/${partner}/${c.slug}`}
        empty="No clinic content yet."
      />
    </>
  );
}
