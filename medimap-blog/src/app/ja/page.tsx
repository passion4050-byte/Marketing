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
const SPECIALTY_CATS = ["derma", "plastic", "eyeclinic", "hair", "dental", "internal"];

export default function JaHome() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
            <span className="h-1.5 w-1.5 bg-stone-900" />
            医療ツーリングのためのGEO / AEO
          </div>
          <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
            外国人患者がAIに<span className="underline decoration-2 underline-offset-8">「韓国で一番のクリニック」</span>を尋ねたとき、あなたの名前は挙がりますか？
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            患者はもう10件のリンクをスクロールしません。ChatGPT・Perplexity・Geminiに聞きます。WECIRCLEは英語・日本語・中国語のコンテンツを発信し、Googleで上位表示され、<strong className="text-stone-900">AIに引用される</strong>ようにします。そして、その引用を計測します。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons lang="ja" waLabel="WhatsApp" lineLabel="LINEで相談" />
            <Link href="/ja/guides/smile-lasik-in-korea" className="rounded-none border border-stone-900 px-6 py-3 text-sm font-bold text-stone-900 transition hover:bg-stone-900 hover:text-white">
              サンプルを見る
            </Link>
          </div>
        </div>
      </section>

      {/* Round 145c — 환자 분기 배너 */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <Link
          href="/ja/blog"
          className="flex items-center justify-between gap-4 border-y border-stone-300/70 px-1 py-4 transition hover:bg-white"
        >
          <span className="text-sm font-semibold text-stone-800">
            韓国での施術をお探しですか？患者向けガイドはこちら
          </span>
          <span className="shrink-0 text-sm font-bold text-stone-900">→</span>
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <div><div className="text-3xl font-black text-stone-950">AIファースト</div><p className="mt-2 text-sm leading-relaxed text-stone-600">外国人患者は地図を開く前に、ChatGPT・Perplexityで調べます。</p></div>
          <div><div className="text-3xl font-black text-stone-950">見えない＝いない</div><p className="mt-2 text-sm leading-relaxed text-stone-600">AIがあなたのクリニックを挙げなければ、その患者にとっては存在しません——どれだけ優れていても。</p></div>
          <div><div className="text-3xl font-black text-stone-950">引用される側へ</div><p className="mt-2 text-sm leading-relaxed text-stone-600">AIは構造化された事実——価格・比較・FAQ——を引用します。私たちが作るのはまさにそれです。</p></div>
        </div>
      </section>

      <section id="how" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div><div className="text-lg font-bold text-stone-900">① 分析・ターゲティング</div><p className="mt-2 text-sm text-stone-600">外国人患者がAIに尋ねる質問と、すでに引用されている競合を洗い出します。</p></div>
          <div><div className="text-lg font-bold text-stone-900">② AEOコンテンツ発信</div><p className="mt-2 text-sm text-stone-600">価格・比較表・FAQ・schema markup — GoogleとAIが引用する構造で多言語発信。</p></div>
          <div><div className="text-lg font-bold text-stone-900">③ AI引用を計測</div><p className="mt-2 text-sm text-stone-600">ChatGPT・Perplexity・Geminiが実際に何回あなたのクリニックを挙げたかをダッシュボードで可視化。</p></div>
        </div>
      </section>

      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950">診療科に合わせて</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s, i) => (
            <Link key={s} href={`/ja/clinics/${SPECIALTY_CATS[i]}`} className="block border-t border-stone-300/70 py-4 font-bold text-stone-900 transition hover:bg-white">{s}</Link>
          ))}
        </div>
      </section>

      <section id="proof" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">一般的な代理店との違い</h2>
          <p className="mt-3 max-w-2xl text-stone-600">多くの代理店は投稿して祈るだけ。私たちはすでに韓国クリニック向けにライブのAI引用計測システムを運用しています——その同じエンジンを、あなたの外国人患者ファネルに向けます。</p>
          <div className="mt-8 overflow-x-auto border-t-2 border-stone-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-300 text-[12px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold"> </th>
                  <th className="px-4 py-3 font-semibold">一般的な代理店</th>
                  <th className="px-4 py-3 font-semibold text-stone-900">WECIRCLE Global</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["言語", "英語のみ（多くの場合）", "英語・日本語・中国語（ネイティブ）"],
                  ["成果の証明", "なし——「投稿しました」だけ", "ライブAI引用ダッシュボード"],
                  ["コンテンツエンジン", "手動・遅い", "自動発信パイプライン"],
                  ["構造", "ブログ記事", "AEO最適化：schema・価格ガイド・FAQ・表"],
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
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">AIに選ばれるクリニックへ。</h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">20分の相談で、今どの競合がAIに引用されているかをお見せします。</p>
          <ContactButtons waLabel="相談する" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
