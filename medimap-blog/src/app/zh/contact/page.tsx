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

      {/* Round 145c — 환자/병원 듀얼 패스 (감사 #4) */}
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <h1 className="max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          请选择您的咨询类型
        </h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[#1B68FF]/30 bg-white p-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1B68FF]">患者咨询</div>
            <h2 className="mt-2 text-xl font-bold text-stone-950">正在考虑赴韩就医</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              关于诊所、费用或预约的问题，欢迎随时咨询。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["免费", "中文可沟通", "1个工作日内回复"].map((c) => (
                <span key={c} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-700">
                  {c}
                </span>
              ))}
            </div>
            <ContactButtons lang="zh" waLabel="立即咨询" lineLabel="LINE" className="mt-5" />
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">诊所合作</div>
            <h2 className="mt-2 text-xl font-bold text-stone-950">您在韩国经营诊所吗？</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              20分钟通话，我们将展示AI目前为您的施术引用了哪些竞争对手。
            </p>
            <ContactButtons lang="zh" waLabel="预约通话" lineLabel="LINE" className="mt-5" />
          </div>
        </div>
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
