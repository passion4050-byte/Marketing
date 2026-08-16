import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";
import { overseasAlternates } from "@/lib/hreflang";

export const metadata: Metadata = {
  title: "關於 WECIRCLE",
  description:
    "WECIRCLE 將診所的診療理念，重新編輯為通過醫療法、可被AI引用的內容資產。編輯、醫療法合規、引用計量在同一條流水線完成。",
  alternates: overseasAlternates("tw", "/about"),
};

const PRINCIPLES = [
  {
    n: "01",
    over: "Editorial",
    t: "是編輯，而非廣告。",
    d: "我們編輯診所的診療理念、施術依據與患者情境。不是購買曝光，而是留下AI可以引用的文字。",
  },
  {
    n: "02",
    over: "Compliance",
    t: "醫療法優先。",
    d: "每一篇稿件都按韓國醫療廣告規則自動檢查，並在發布前經過審核。只有診所敢署名的內容才會發布。",
  },
  {
    n: "03",
    over: "AI Citation",
    t: "讓AI能夠引用。",
    d: "以 Schema.org 結構、FAQ 與比較表發布，讓 ChatGPT、Perplexity、Gemini 與 Claude 能原樣引用您的診所。",
  },
  {
    n: "04",
    over: "Measurement",
    t: "我們計量發布之後。",
    d: "在同一個介面查看AI引用頻率、頁面瀏覽與點擊轉換率。以數據而非直覺決定下一篇內容。",
  },
];

const TIMELINE = [
  { y: "2024", t: "WECIRCLE 編輯團隊啟動", d: "確立醫療內容編輯、醫療法審核與AEO方法論。" },
  { y: "2025", t: "AI引用計量系統", d: "即時採集四大AI引擎 grounding 資料的基礎設施。" },
  { y: "2026", t: "合作診所網絡", d: "各科別合作診所的內容庫上線，WECIRCLE Insights 定期發布。" },
];

export default function TwAboutPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/tw`,
    description: "讓韓國診所在外國患者的AI檢索中被引用的多語言 GEO/AEO 內容發布。",
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
            當檢索移入AI，我們編輯診所留下的<span className="text-stone-900">文字</span>。
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            WECIRCLE 把診所的診療理念與依據，重新編輯為通過醫療法的內容資產。在AI檢索時代，重寫診所贏得信任的方式。
          </p>
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">我們的原則</h2>
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
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">發展歷程</h2>
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
            「把診所的故事，變成AI可以引用的資產。」
          </blockquote>
          <p className="mt-6 text-sm text-stone-400">WECIRCLE 編輯團隊，2026</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons lang="tw" waLabel="預約諮詢" />
            <Link
              href="/tw/clinics"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white"
            >
              查看合作診所
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
