import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于 WECIRCLE",
  description:
    "WECIRCLE 将诊所的诊疗理念，重新编辑为通过医疗法、可被AI引用的内容资产。编辑、医疗法合规、引用计量在同一条流水线完成。",
  alternates: {
    canonical: "/zh/about",
    languages: { en: "/en/about", ja: "/ja/about", "zh-Hans": "/zh/about", "zh-Hant": "/tw/about", ko: "/about" },
  },
};

const PRINCIPLES = [
  {
    n: "01",
    over: "Editorial",
    t: "是编辑，而非广告。",
    d: "我们编辑诊所的诊疗理念、施术依据与患者情境。不是购买曝光，而是留下AI可以引用的文字。",
  },
  {
    n: "02",
    over: "Compliance",
    t: "医疗法优先。",
    d: "每一篇稿件都按韩国医疗广告规则自动检查，并在发布前经过审核。只有诊所敢署名的内容才会发布。",
  },
  {
    n: "03",
    over: "AI Citation",
    t: "让AI能够引用。",
    d: "以 Schema.org 结构、FAQ 与对比表发布，让 ChatGPT、Perplexity、Gemini 与 Claude 能原样引用您的诊所。",
  },
  {
    n: "04",
    over: "Measurement",
    t: "我们计量发布之后。",
    d: "在同一个界面查看AI引用频率、页面浏览与点击转化率。以数据而非直觉决定下一篇内容。",
  },
];

const TIMELINE = [
  { y: "2024", t: "WECIRCLE 编辑团队启动", d: "确立医疗内容编辑、医疗法审核与AEO方法论。" },
  { y: "2025", t: "AI引用计量系统", d: "实时采集四大AI引擎 grounding 数据的基础设施。" },
  { y: "2026", t: "合作诊所网络", d: "各科室合作诊所的内容库上线，WECIRCLE Insights 定期发布。" },
];

export default function ZhAboutPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/zh`,
    description: "让韩国诊所在外国患者的AI检索中被引用的多语言 GEO/AEO 内容发布。",
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={orgLd} />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-900" />
          About WECIRCLE
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            当检索移入AI，我们编辑诊所留下的<span className="text-stone-900">文字</span>。
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            WECIRCLE 把诊所的诊疗理念与依据，重新编辑为通过医疗法的内容资产。在AI检索时代，重写诊所赢得信任的方式。
          </p>
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">我们的原则</h2>
            <span className="text-xs uppercase tracking-[0.28em] text-stone-500">Four commitments</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.n} className="rounded-none border border-stone-200 bg-[#FAFAF7] p-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-stone-900">{p.n}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                    {p.over}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-stone-950">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">发展历程</h2>
          <span className="text-xs uppercase tracking-[0.28em] text-stone-500">Since 2024</span>
        </div>
        <ol className="divide-y divide-stone-200/70">
          {TIMELINE.map((t) => (
            <li
              key={t.y}
              className="grid grid-cols-[64px_1fr] items-baseline gap-6 py-7 md:grid-cols-[120px_minmax(0,3fr)_minmax(0,5fr)] md:gap-10"
            >
              <span className="text-2xl font-black tabular-nums text-stone-900 md:text-3xl">{t.y}</span>
              <h3 className="text-lg font-bold tracking-tight text-stone-950 md:text-xl">{t.t}</h3>
              <p className="col-start-2 mt-1 max-w-md text-sm leading-relaxed text-stone-600 md:col-start-3 md:mt-0">
                {t.d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-none bg-stone-950 px-8 py-14 text-white md:px-16">
          <blockquote
            className="max-w-2xl text-2xl italic leading-tight md:text-4xl"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            「把诊所的故事，变成AI可以引用的资产。」
          </blockquote>
          <p className="mt-6 text-sm text-stone-400">WECIRCLE 编辑团队，2026</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="预约咨询" />
            <Link
              href="/zh/clinics"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white"
            >
              查看合作诊所
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
