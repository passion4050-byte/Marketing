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
const SPECIALTY_CATS = ["derma", "plastic", "eyeclinic", "hair", "dental", "internal"];

export default function ZhHome() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
            <span className="h-1.5 w-1.5 bg-stone-900" />
            医疗旅游的 GEO / AEO
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            当外国患者问AI<span className="underline decoration-2 underline-offset-8">「韩国最好的诊所」</span>时，它会提到您吗？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            患者不再翻十条链接，而是询问ChatGPT、Perplexity和Gemini。WECIRCLE发布英语、日语、中文内容，让您在Google排名靠前，并<strong className="text-stone-900">被AI引用</strong>——而且我们计量每一次引用。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons lang="zh" waLabel="预约咨询" />
            <Link href="/zh/guides/smile-lasik-in-korea" className="rounded-none border border-stone-900 px-6 py-3 text-sm font-bold text-stone-900 transition hover:bg-stone-900 hover:text-white">
              查看样本
            </Link>
          </div>
        </div>
      </section>

      {/* Round 145c — 환자 분기 배너 */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <Link
          href="/zh/blog"
          className="flex items-center justify-between gap-4 border-y border-stone-300/70 px-1 py-4 transition hover:bg-white"
        >
          <span className="text-sm font-semibold text-stone-800">
            正在了解赴韩就医？浏览患者指南
          </span>
          <span className="shrink-0 text-sm font-bold text-stone-900">→</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div><div className="text-3xl font-black text-stone-950">AI优先</div><p className="mt-2 text-sm leading-relaxed text-stone-600">外国患者在打开地图之前，先在 ChatGPT、Perplexity 上做功课。</p></div>
          <div><div className="text-3xl font-black text-stone-950">看不见＝不存在</div><p className="mt-2 text-sm leading-relaxed text-stone-600">如果AI不提及您的诊所，对那位患者而言您就不存在——无论您多优秀。</p></div>
          <div><div className="text-3xl font-black text-stone-950">可被引用者胜出</div><p className="mt-2 text-sm leading-relaxed text-stone-600">AI引用结构化的事实——价格、对比、FAQ。这正是我们所构建的。</p></div>
        </div>
      </section>

      <section id="how" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div><div className="text-lg font-bold text-stone-900">① 分析与定位</div><p className="mt-2 text-sm text-stone-600">梳理外国患者向AI提出的问题，以及已被引用的竞争对手。</p></div>
          <div><div className="text-lg font-bold text-stone-900">② 发布AEO内容</div><p className="mt-2 text-sm text-stone-600">价格、对比表、FAQ、schema markup——Google与AI引用的结构，多语言发布。</p></div>
          <div><div className="text-lg font-bold text-stone-900">③ 计量AI引用</div><p className="mt-2 text-sm text-stone-600">在仪表盘中可视化ChatGPT、Perplexity、Gemini实际提及您诊所的次数。</p></div>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950">为您的科室量身打造</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s, i) => (
            <Link key={s} href={`/zh/clinics/${SPECIALTY_CATS[i]}`} className="block border-t border-stone-300/70 py-4 font-bold text-stone-900 transition hover:bg-white">{s}</Link>
          ))}
        </div>
      </section>

      <section id="proof" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">与普通代理商的不同</h2>
          <p className="mt-3 max-w-2xl text-stone-600">大多数代理商发完内容就只能祈祷。我们已经在为韩国诊所运行实时的AI引用计量系统——同一套引擎，现在对准您的外国患者漏斗。</p>
          <div className="mt-8 overflow-x-auto border-t-2 border-stone-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-300 text-[12px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold"> </th>
                  <th className="px-4 py-3 font-semibold">普通代理商</th>
                  <th className="px-4 py-3 font-semibold text-stone-900">WECIRCLE Global</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["语言", "通常仅英语", "英语・日语・中文（母语）"],
                  ["成效证明", "没有——只有「我们发布了」", "实时AI引用仪表盘"],
                  ["内容引擎", "手动、缓慢", "自动发布流水线"],
                  ["结构", "博客文章", "AEO优化：schema・价格指南・FAQ・表格"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-semibold text-stone-800">{row[0]}</td>
                    <td className="px-4 py-3 text-stone-500">{row[1]}</td>
                    <td className="px-4 py-3 font-medium text-stone-900">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-16">
        <div className="bg-stone-950 px-8 py-14 text-center text-white md:px-16">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">成为AI推荐的诊所。</h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">20分钟通话，我们将展示目前哪些竞争对手正被AI引用。</p>
          <ContactButtons waLabel="预约咨询" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
