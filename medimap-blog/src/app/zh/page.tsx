import type { Metadata } from "next";
import Link from "next/link";
import { ContactButtons } from "@/components/ContactButtons";

export const metadata: Metadata = {
  title: "让ChatGPT、Perplexity、Gemini引用您的韩国诊所",
  description:
    "外国患者通过AI寻找韩国诊所。WECIRCLE发布英语、日语、中文的GEO/AEO内容，让您在Google排名靠前并被AI引用。",
  alternates: { canonical: "/zh" },
};

const SPECIALTIES = ["皮肤科・医美", "整形外科（鼻・眼・轮廓）", "视力矫正（SMILE・LASIK）", "植发（FUE）", "牙科（种植牙）", "体检・抗衰老"];

export default function ZhHome() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
            医疗旅游的 GEO / AEO
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            当外国患者问AI<span className="text-[#1B68FF]">「韩国最好的诊所」</span>时，它会提到您吗？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            患者不再翻十条链接，而是询问ChatGPT、Perplexity和Gemini。WECIRCLE发布英语、日语、中文内容，让您在Google排名靠前，并<strong className="text-stone-900">被AI引用</strong>——而且我们计量每一次引用。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="预约咨询" />
            <Link href="/zh/guides/smile-lasik-in-korea" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900">
              查看样本
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div><div className="text-lg font-bold text-stone-900">① 分析与定位</div><p className="mt-2 text-sm text-stone-600">梳理外国患者向AI提出的问题，以及已被引用的竞争对手。</p></div>
          <div><div className="text-lg font-bold text-stone-900">② 发布AEO内容</div><p className="mt-2 text-sm text-stone-600">价格、对比表、FAQ、schema markup——Google与AI引用的结构，多语言发布。</p></div>
          <div><div className="text-lg font-bold text-[#1B68FF]">③ 计量AI引用</div><p className="mt-2 text-sm text-stone-600">在仪表盘中可视化ChatGPT、Perplexity、Gemini实际提及您诊所的次数。</p></div>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950">为您的科室量身打造</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <div key={s} className="rounded-2xl border border-stone-200 bg-white p-5 font-bold text-stone-900 transition hover:border-[#1B68FF]">{s}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl bg-stone-950 px-8 py-14 text-center text-white md:px-16">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">成为AI推荐的诊所。</h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">20分钟通话，我们将展示目前哪些竞争对手正被AI引用。</p>
          <ContactButtons waLabel="预约咨询" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
