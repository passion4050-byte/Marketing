import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "About WECIRCLE",
  description:
    "WECIRCLE turns a Korean clinic's clinical philosophy into compliant, AI-citeable content assets — editorial, medical-law compliance and citation measurement in one pipeline.",
  alternates: {
    canonical: "/en/about",
    languages: { en: "/en/about", ja: "/ja/about", "zh-Hans": "/zh/about", "zh-Hant": "/tw/about", ko: "/about" },
  },
};

const PRINCIPLES = [
  {
    n: "01",
    over: "Editorial",
    t: "Editorial, not advertising.",
    d: "We edit a clinic's clinical philosophy, treatment rationale and patient context. Instead of buying impressions, we leave sentences AI can quote.",
  },
  {
    n: "02",
    over: "Compliance",
    t: "Korean medical law first.",
    d: "Every draft is auto-linted against Korean medical-advertising rules and reviewed before it ships. Only content a clinic can put its name on gets published.",
  },
  {
    n: "03",
    over: "AI Citation",
    t: "Built to be cited by AI.",
    d: "We publish with Schema.org structure, FAQs and comparison tables so ChatGPT, Perplexity, Gemini and Claude can quote your clinic verbatim.",
  },
  {
    n: "04",
    over: "Measurement",
    t: "We measure what happens after publishing.",
    d: "AI-citation frequency, pageviews and click-through in one dashboard. The next piece of content is decided by data, not by guessing.",
  },
];

const TIMELINE = [
  { y: "2024", t: "WECIRCLE editorial team", d: "Medical content editing, medical-law review and the AEO methodology take shape." },
  { y: "2025", t: "AI-citation measurement system", d: "Real-time grounding-data collection across the four major AI engines." },
  { y: "2026", t: "Partner clinic network", d: "Partner-clinic archives across specialties open. WECIRCLE Insights publishes on a regular cadence." },
];

export default function EnAboutPage() {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/en`,
    description:
      "Multilingual GEO/AEO content publishing that gets Korean clinics cited by AI search for foreign-patient queries.",
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={orgLd} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-900" />
          About WECIRCLE
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-stone-950 md:text-6xl">
            When search moves inside AI, we edit the{" "}
            <span className="italic" style={{ fontFamily: "Fraunces, serif" }}>
              sentences
            </span>{" "}
            a clinic leaves behind.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            WECIRCLE re-edits a clinic&apos;s clinical philosophy and evidence into content assets
            that pass Korean medical law — rewriting how clinics earn trust in the age of AI search.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">Principles</h2>
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

      {/* Chronology */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 flex items-baseline justify-between border-b border-stone-200 pb-4">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">Chronology</h2>
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

      {/* Manifesto + CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-none bg-stone-950 px-8 py-14 text-white md:px-16">
          <blockquote
            className="max-w-2xl text-2xl italic leading-tight md:text-4xl"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            &ldquo;A clinic&apos;s story — turned into an asset AI can cite.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-stone-400">WECIRCLE editorial team, 2026</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="Talk to us" />
            <Link
              href="/en/clinics"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:border-white"
            >
              See partner clinics
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
