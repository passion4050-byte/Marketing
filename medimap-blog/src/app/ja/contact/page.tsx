import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "WECIRCLEに相談する",
  description:
    "20分の相談で、今どの競合がAIに引用されているかをお見せします。韓国クリニックのための英語・日本語・中国語GEO/AEO。",
  alternates: {
    canonical: "/ja/contact",
    languages: { en: "/en/contact", ja: "/ja/contact", "zh-Hans": "/zh/contact", ko: "/contact" },
  },
};

const STEPS = [
  { n: "01", t: "ご連絡ください", d: "WhatsAppまたはLINEでクリニック名と主な施術をお送りください。フォームも契約も不要です。" },
  { n: "02", t: "AI引用を即時診断", d: "あなたの施術について、ChatGPT・Perplexity・Geminiが今どの競合を挙げているかを英語・日本語・中国語で確認します。" },
  { n: "03", t: "プランをご提示", d: "20分の相談で、ギャップ・それを埋めるコンテンツ・その後のAI引用の計測方法をお見せします。" },
];

export default function JaContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/ja`,
    email: siteConfig.contact.email,
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={contactLd} />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
          相談する
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          あなたの施術で、AIが今どのクリニックを勧めているか<span className="text-[#1B68FF]">お見せします</span>。
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
          20分の相談で、外国人患者の検索であなたの診療科の競合をChatGPT・Perplexity・Geminiがどう引用しているかをお見せし、それをあなたのクリニックに変える方法をご説明します。
        </p>
        <ContactButtons waLabel="相談する" lineLabel="LINE" size="lg" className="mt-8" />
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">次の流れ</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-stone-200 bg-[#FAFAF7] p-6">
                <div className="text-sm font-black text-[#1B68FF]">{s.n}</div>
                <div className="mt-2 text-lg font-bold text-stone-900">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-950">WECIRCLE</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              韓国クリニックを外国人患者のAI検索で引用させる、計測可能・医療法準拠・多言語のGEO/AEOコンテンツ発信。
            </p>
            <dl className="mt-6 space-y-2 text-sm text-stone-600">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">会社</dt>
                <dd>주식회사 위서클 (WECIRCLE Inc.)</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">所在地</dt>
                <dd>Seoul, Korea</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">事業者番号</dt>
                <dd>798-67-00527</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Email</dt>
                <dd>
                  <a className="text-[#1B68FF] hover:underline" href={`mailto:${siteConfig.contact.email}`}>
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-2xl bg-stone-950 p-8 text-white">
            <div className="text-lg font-bold">最も早い連絡方法</div>
            <p className="text-sm text-stone-300">韓国営業時間（KST）内にWhatsApp・LINEで返信します。</p>
            <ContactButtons waLabel="WhatsApp" lineLabel="LINE" />
          </div>
        </div>
      </section>
    </>
  );
}
