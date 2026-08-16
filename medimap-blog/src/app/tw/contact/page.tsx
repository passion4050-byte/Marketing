import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";
import { overseasAlternates } from "@/lib/hreflang";

export const metadata: Metadata = {
  title: "聯絡 WECIRCLE",
  description:
    "20分鐘通話，我們將展示目前哪些競爭對手正被AI引用。為韓國診所提供英語、日語、中文的 GEO/AEO。",
  alternates: overseasAlternates("tw", "/contact"),
};

const STEPS = [
  { n: "01", t: "與我們聯絡", d: "透過 WhatsApp 或 LINE 傳送您的診所名稱與主要施術項目。無需表單，無需承諾。" },
  { n: "02", t: "即時AI引用診斷", d: "針對您的施術，查看 ChatGPT、Perplexity、Gemini 目前以英語、日語、中文引用了哪些競爭對手。" },
  { n: "03", t: "為您呈現方案", d: "20分鐘通話：差距在哪、用什麼內容填補，以及此後如何計量每一次AI引用。" },
];

export default function TwContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/tw`,
    email: siteConfig.contact.email,
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={contactLd} />

      {/* 환자/병원 듀얼 패스 (Round 145c 미러) */}
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <h1 className="max-w-3xl text-4xl font-black leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          請選擇您的諮詢類型
        </h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-none border-2 border-stone-300 bg-white p-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">患者諮詢</div>
            <h2 className="mt-2 text-xl font-bold text-stone-950">正在考慮赴韓就醫</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              關於診所、費用或預約的問題，歡迎隨時諮詢。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["免費", "中文可溝通", "1個工作天內回覆"].map((c) => (
                <span key={c} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-700">
                  {c}
                </span>
              ))}
            </div>
            <ContactButtons lang="tw" waLabel="免費取得報價" lineLabel="LINE" className="mt-5" />
          </div>
          <div className="rounded-none border border-stone-200 bg-white p-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">診所合作</div>
            <h2 className="mt-2 text-xl font-bold text-stone-950">您在韓國經營診所嗎？</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              20分鐘通話，我們將展示AI目前為您的施術引用了哪些競爭對手。
            </p>
            <ContactButtons lang="tw" waLabel="預約通話" lineLabel="LINE" className="mt-5" />
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">接下來的流程</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-none border border-stone-200 bg-[#FAFAF7] p-6">
                <div className="text-sm font-black text-stone-900">{s.n}</div>
                <div className="mt-2 text-lg font-bold text-stone-900">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 rounded-none border border-stone-200 bg-white p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-950">WECIRCLE</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              讓韓國診所在外國患者的AI檢索中被引用的可計量、合規、多語言 GEO/AEO 內容發布。
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
                <dt className="w-24 shrink-0 font-semibold text-stone-800">營業執照號</dt>
                <dd>798-67-00527</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Email</dt>
                <dd>
                  <a className="text-stone-900 hover:underline" href={`mailto:${siteConfig.contact.email}`}>
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-none bg-stone-950 p-8 text-white">
            <div className="text-lg font-bold">最快的聯絡方式</div>
            <p className="text-sm text-stone-300">我們在韓國工作時間（KST）透過 WhatsApp、LINE 回覆。</p>
            <ContactButtons lang="tw" waLabel="WhatsApp" lineLabel="LINE" />
          </div>
        </div>
      </section>
    </>
  );
}
