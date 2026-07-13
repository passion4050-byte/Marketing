import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "联系 WECIRCLE",
  description:
    "20分钟通话，我们将展示目前哪些竞争对手正被AI引用。为韩国诊所提供英语、日语、中文的 GEO/AEO。",
  alternates: {
    canonical: "/zh/contact",
    languages: { en: "/en/contact", ja: "/ja/contact", "zh-Hans": "/zh/contact", ko: "/contact" },
  },
};

const STEPS = [
  { n: "01", t: "与我们联系", d: "通过 WhatsApp 或 LINE 发送您的诊所名称与主要施术项目。无需表单，无需承诺。" },
  { n: "02", t: "即时AI引用诊断", d: "针对您的施术，查看 ChatGPT、Perplexity、Gemini 目前以英语、日语、中文引用了哪些竞争对手。" },
  { n: "03", t: "为您呈现方案", d: "20分钟通话：差距在哪、用什么内容填补，以及此后如何计量每一次AI引用。" },
];

export default function ZhContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/zh`,
    email: siteConfig.contact.email,
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={contactLd} />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
          预约咨询
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          针对您的施术，AI目前推荐哪些诊所，我们<span className="text-[#1B68FF]">直接展示</span>。
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
          20分钟通话，我们将展示在外国患者检索中，ChatGPT、Perplexity、Gemini 如何引用您科室的竞争对手，以及如何让它变成您的诊所。
        </p>
        <ContactButtons waLabel="预约咨询" lineLabel="LINE" size="lg" className="mt-8" />
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">接下来的流程</h2>
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
              让韩国诊所在外国患者的AI检索中被引用的可计量、合规、多语言 GEO/AEO 内容发布。
            </p>
            <dl className="mt-6 space-y-2 text-sm text-stone-600">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">公司</dt>
                <dd>주식회사 위서클 (WECIRCLE Inc.)</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">所在地</dt>
                <dd>Seoul, Korea</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">营业执照号</dt>
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
            <div className="text-lg font-bold">最快的联系方式</div>
            <p className="text-sm text-stone-300">我们在韩国工作时间（KST）通过 WhatsApp、LINE 回复。</p>
            <ContactButtons waLabel="WhatsApp" lineLabel="LINE" />
          </div>
        </div>
      </section>
    </>
  );
}
