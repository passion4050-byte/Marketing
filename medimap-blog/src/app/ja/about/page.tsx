import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "WECIRCLEについて",
  description:
    "WECIRCLEはクリニックの診療哲学を、医療法を通過したAI引用可能なコンテンツ資産へと再編集します。編集・医療法コンプライアンス・引用計測を一つのパイプラインで。",
  alternates: {
    canonical: "/ja/about",
    languages: { en: "/en/about", ja: "/ja/about", "zh-Hans": "/zh/about", ko: "/about" },
  },
};

const PRINCIPLES = [
  {
    n: "01",
    over: "Editorial",
    t: "広告ではなく、編集。",
    d: "クリニックの診療哲学・施術の根拠・患者コンテキストを編集します。露出を買うのではなく、AIが引用できる文章を残します。",
  },
  {
    n: "02",
    over: "Compliance",
    t: "まず、韓国医療法。",
    d: "すべての原稿を韓国の医療広告ルールで自動リントし、発信前に検収します。クリニックが自らの名前を掛けられる文章だけを発信します。",
  },
  {
    n: "03",
    over: "AI Citation",
    t: "AIが引用できるように。",
    d: "Schema.org構造・FAQ・比較表で発信し、ChatGPT・Perplexity・Gemini・Claudeがあなたのクリニックをそのまま引用できるようにします。",
  },
  {
    n: "04",
    over: "Measurement",
    t: "発信のあとを計測します。",
    d: "AI引用頻度・ページビュー・クリック転換率を一つの画面で。勘ではなくデータで次のコンテンツを決めます。",
  },
];

const TIMELINE = [
  { y: "2024", t: "WECIRCLE編集チーム始動", d: "医療コンテンツ編集・医療法検収・AEO方法論の確立。" },
  { y: "2025", t: "AI引用計測システム", d: "4大AIエンジンのgroundingデータをリアルタイム収集するインフラ。" },
  { y: "2026", t: "パートナークリニックネットワーク", d: "各診療科のパートナークリニックのアーカイブを公開。WECIRCLE Insightsを定期発信。" },
];

export default function JaAboutPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/ja`,
    description:
      "韓国クリニックを外国人患者のAI検索で引用させる、多言語GEO/AEOコンテンツ発信。",
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
            検索がAIの中へ移る時代、クリニックが残す<span className="text-stone-900">文章</span>を編集します。
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            WECIRCLEはクリニックの診療哲学と根拠を、医療法を通過したコンテンツ資産へと再編集します。AI検索の時代に、クリニックが信頼される方法を書き換えます。
          </p>
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">私たちの原則</h2>
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
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">沿革</h2>
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
            「クリニックの物語を、AIが引用できる資産へ。」
          </blockquote>
          <p className="mt-6 text-sm text-stone-400">WECIRCLE編集チーム、2026</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="相談する" />
            <Link
              href="/ja/clinics"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white"
            >
              パートナークリニックを見る
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
