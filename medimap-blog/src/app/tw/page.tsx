import type { Metadata } from "next";
import { overseasAlternates } from "@/lib/hreflang";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { OverseasHomeShowcase } from "@/components/OverseasHomeShowcase";
import { siteConfig } from "@/lib/site";

// Round 159b — 대만(번체) 홈. zh 미러 + 무신사 이미지 밀도 섹션. ISR 60s.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "讓ChatGPT、Perplexity、Gemini引用您的韓國診所",
  description:
    "外國患者透過AI尋找韓國診所。WECIRCLE發布英語、日語、中文的GEO/AEO內容，讓您在Google排名靠前並被AI引用。",
  alternates: overseasAlternates("tw", "", "/"),
};

const SPECIALTIES = ["皮膚科・醫美", "整形外科（鼻・眼・輪廓）", "視力矯正（SMILE・LASIK）", "植髮（FUE）", "牙科（植牙）", "健檢・抗老"];
const SPECIALTY_CATS = ["derma", "plastic", "eyeclinic", "hair", "dental", "internal"];

export default async function TwHome() {
  // Round 199 (2026-09-11) — en 홈에만 있던 Service 구조화 데이터를 ja/zh/tw 에도 넣는다.
  //   이 세 로케일 홈은 JSON-LD 를 하나도 내보내지 않고 있었다.
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "WECIRCLE Global — 面向韓國診所的 GEO/AEO",
    serviceType: "AI search optimization (GEO/AEO) for medical tourism",
    provider: {
      "@type": "Organization",
      name: "WECIRCLE",
      legalName: "주식회사 위서클",
      url: `${siteConfig.url}/tw`,
      address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
    },
    areaServed: "Global",
    description: "發布英語、日語、中文的 GEO/AEO 內容，讓韓國診所在 Google 排名靠前，並被 ChatGPT、Perplexity、Gemini 引用。",
  };
  return (
    <>
      <JsonLd data={serviceLd} />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
            <span className="h-1.5 w-1.5 bg-stone-900" />
            醫療旅遊的 GEO / AEO
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            當外國患者問AI<span className="underline decoration-2 underline-offset-8">「韓國最好的診所」</span>時，它會提到您嗎？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            患者不再翻十條連結，而是詢問ChatGPT、Perplexity和Gemini。WECIRCLE發布英語、日語、中文內容，讓您在Google排名靠前，並<strong className="text-stone-900">被AI引用</strong>——而且我們計量每一次引用。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons lang="tw" waLabel="預約諮詢" />
            <Link href="/tw/blog" className="rounded-none border border-stone-900 px-6 py-3 text-sm font-bold text-stone-900 transition hover:bg-stone-900 hover:text-white">
              查看攻略
            </Link>
          </div>
        </div>
      </section>

      {/* 환자 분기 배너 (Round 145c 미러) */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <Link
          href="/tw/blog"
          className="flex items-center justify-between gap-4 border-y border-stone-300/70 px-1 py-4 transition hover:bg-white"
        >
          <span className="text-sm font-semibold text-stone-800">
            正在考慮赴韓就醫嗎？瀏覽患者攻略
          </span>
          <span className="shrink-0 text-sm font-bold text-stone-900">→</span>
        </Link>
      </section>

      {/* Round 159b — 무신사 이미지 밀도 */}
      <OverseasHomeShowcase
        lang="tw"
        labels={{
          latestOverline: "Latest Stories",
          latestTitle: "韓國醫療·醫美攻略",
          viewAll: "查看全部",
          clinicsOverline: "Partner Clinics",
          clinicsTitle: "合作診所",
          guidesCount: (n) => `${n}篇攻略`,
        }}
      />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div><div className="text-3xl font-black text-stone-950">AI優先</div><p className="mt-2 text-sm leading-relaxed text-stone-600">外國患者在打開地圖之前，先在 ChatGPT、Perplexity 上做功課。</p></div>
          <div><div className="text-3xl font-black text-stone-950">看不見＝不存在</div><p className="mt-2 text-sm leading-relaxed text-stone-600">如果AI不提及您的診所，對那位患者而言您就不存在——無論您多優秀。</p></div>
          <div><div className="text-3xl font-black text-stone-950">可被引用者勝出</div><p className="mt-2 text-sm leading-relaxed text-stone-600">AI引用結構化的事實——價格、比較、FAQ。這正是我們所建構的。</p></div>
        </div>
      </section>

      <section id="how" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div><div className="text-lg font-bold text-stone-900">① 分析與定位</div><p className="mt-2 text-sm text-stone-600">梳理外國患者向AI提出的問題，以及已被引用的競爭對手。</p></div>
          <div><div className="text-lg font-bold text-stone-900">② 發布AEO內容</div><p className="mt-2 text-sm text-stone-600">價格、比較表、FAQ、schema markup——Google與AI引用的結構，多語言發布。</p></div>
          <div><div className="text-lg font-bold text-stone-900">③ 計量AI引用</div><p className="mt-2 text-sm text-stone-600">在儀表板中可視化ChatGPT、Perplexity、Gemini實際提及您診所的次數。</p></div>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950">為您的科別量身打造</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s, i) => (
            <Link key={s} href={`/tw/clinics/${SPECIALTY_CATS[i]}`} className="block border-t border-stone-300/70 py-4 font-bold text-stone-900 transition hover:bg-white">{s}</Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 pt-16">
        <div className="bg-stone-950 px-8 py-14 text-center text-white md:px-16">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">成為AI推薦的診所。</h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">20分鐘通話，我們將展示目前哪些競爭對手正被AI引用。</p>
          <ContactButtons waLabel="預約諮詢" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
