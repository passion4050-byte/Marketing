import type { Metadata } from "next";
import Link from "next/link";
import { ContactButtons } from "@/components/ContactButtons";

export const metadata: Metadata = {
  title: "韓国クリニックをChatGPT・Perplexity・Geminiに引用させる",
  description:
    "外国人患者はAIで韓国のクリニックを探します。WECIRCLEは英語・日本語・中国語のGEO/AEOコンテンツを発信し、Googleで上位表示され、AIに引用される仕組みを作ります。",
  alternates: { canonical: "/ja" },
};

const SPECIALTIES = ["皮膚科・美容皮膚", "美容外科（鼻・目・輪郭）", "視力矯正（SMILE・LASIK）", "植毛（FUE）", "歯科（インプラント）", "健康診断・アンチエイジング"];

export default function JaHome() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
            医療ツーリングのためのGEO / AEO
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            外国人患者がAIに<span className="text-[#1B68FF]">「韓国で一番のクリニック」</span>を尋ねたとき、あなたの名前は挙がりますか？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            患者はもう10件のリンクをスクロールしません。ChatGPT・Perplexity・Geminiに聞きます。WECIRCLEは英語・日本語・中国語のコンテンツを発信し、Googleで上位表示され、<strong className="text-stone-900">AIに引用される</strong>ようにします。そして、その引用を計測します。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="相談する" />
            <Link href="/ja/guides/smile-lasik-in-korea" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900">
              サンプルを見る
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div><div className="text-lg font-bold text-stone-900">① 分析・ターゲティング</div><p className="mt-2 text-sm text-stone-600">外国人患者がAIに尋ねる質問と、すでに引用されている競合を洗い出します。</p></div>
          <div><div className="text-lg font-bold text-stone-900">② AEOコンテンツ発信</div><p className="mt-2 text-sm text-stone-600">価格・比較表・FAQ・schema markup — GoogleとAIが引用する構造で多言語発信。</p></div>
          <div><div className="text-lg font-bold text-[#1B68FF]">③ AI引用を計測</div><p className="mt-2 text-sm text-stone-600">ChatGPT・Perplexity・Geminiが実際に何回あなたのクリニックを挙げたかをダッシュボードで可視化。</p></div>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950">診療科に合わせて</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s) => (
            <div key={s} className="rounded-2xl border border-stone-200 bg-white p-5 font-bold text-stone-900 transition hover:border-[#1B68FF]">{s}</div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl bg-stone-950 px-8 py-14 text-center text-white md:px-16">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">AIに選ばれるクリニックへ。</h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">20分の相談で、今どの競合がAIに引用されているかをお見せします。</p>
          <ContactButtons waLabel="相談する" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
