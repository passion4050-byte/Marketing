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
  const name = overseasPartnerName(partner, "zh-Hans", info?.name ?? partner);
  return {
    title: `${name} — WECIRCLE Global`,
    alternates: overseasAlternates("zh", `/clinics/${category}/${partner}`),
  };
}

export default async function ZhClinicPartnerPage({ params }: Props) {
  const { category, partner } = await params;
  const [cards, info] = await Promise.all([
    getOverseasCards("zh-Hans", { kind: "clinic", category, partner }),
    getPartnerBySlug(partner),
  ]);
  const name = overseasPartnerName(partner, "zh-Hans", info?.name ?? partner);

  if (cards.length === 0) {
    return (
      <>
        <OverseasClinicSchema partnerSlug={partner} lang="zh" />
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h1 className="text-3xl font-black tracking-tight text-stone-950 md:text-4xl">{name}</h1>
          <p className="mt-3 text-stone-600">接待外国患者的 WECIRCLE 合作医疗机构。</p>
          <dl className="mt-8 space-y-3 rounded-none border border-stone-200 bg-white p-6 text-sm">
            {info?.address && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">地址</dt>
                <dd className="text-stone-600">{info.address}</dd>
              </div>
            )}
            {info?.homepage && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">官网</dt>
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
            <h2 className="text-xl font-black">对这家诊所感兴趣吗？</h2>
            <p className="mt-2 text-sm text-stone-300">
              指南正在准备中。欢迎联系我们，免费为您查询档期与费用。
            </p>
            <ContactButtons lang="zh" waLabel="获取免费报价" className="mt-5" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OverseasClinicSchema partnerSlug={partner} lang="zh" />
      <OverseasListing
        title={name}
        subtitle={`介绍 ${name} 的经审核指南 — 由 WECIRCLE 发布。`}
        cards={cards}
        hrefFor={(c) => `/zh/clinics/${category}/${partner}/${c.slug}`}
        empty="暂无诊所内容。"
      />
    </>
  );
}
