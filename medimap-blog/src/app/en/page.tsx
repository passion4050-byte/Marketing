import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get Your Korean Clinic Cited by ChatGPT, Perplexity & Gemini",
  description:
    "Foreign patients now ask AI for the best clinics in Korea. WECIRCLE publishes English, Japanese & Chinese GEO/AEO content that ranks on Google and gets your clinic cited by AI — measured, not guessed.",
  alternates: { canonical: "/en" },
};

const STEPS = [
  {
    n: "01",
    t: "Analyze & target",
    d: "We map the exact questions foreign patients ask AI — \"best skin clinic in Gangnam,\" \"smile LASIK in Korea cost\" — and the competitors already being cited.",
  },
  {
    n: "02",
    t: "Publish AEO content",
    d: "Structured guides in English, Japanese & Chinese — price ranges, comparison tables, FAQs, schema markup — the format Google ranks and AI quotes verbatim.",
  },
  {
    n: "03",
    t: "Measure AI citations",
    d: "We track how often ChatGPT, Perplexity & Gemini actually name your clinic and cite your content — a live dashboard, not a monthly PDF of guesses.",
  },
];

const SPECIALTIES = [
  { t: "Dermatology & Skin", ex: "acne scars · melasma · laser toning · skin boosters" },
  { t: "Plastic Surgery", ex: "rhinoplasty · double eyelid · V-line · facial contouring" },
  { t: "Vision Correction", ex: "SMILE LASIK · LASIK · LASEK · ICL" },
  { t: "Hair Transplant", ex: "FUE · hairline design · crown restoration" },
  { t: "Dental", ex: "implants · veneers · full-mouth rehabilitation" },
  { t: "Health Screening", ex: "premium checkups · anti-aging · IV therapy" },
];

// 진료항목 → 클리닉 카테고리 슬러그(순서 동일). 홈 카드 클릭 → /en/clinics/{cat} 리스트.
const SPECIALTY_CATS = ["derma", "plastic", "eyeclinic", "hair", "dental", "internal"];

const COMPARE = [
  ["Languages", "English only (usually)", "English · Japanese · Chinese (native)"],
  ["Proof of results", "None — just \"we posted content\"", "Live AI-citation dashboard"],
  ["Content engine", "Manual, slow", "Automated publishing pipeline"],
  ["Structure", "Blog posts", "AEO-optimized: schema, price guides, FAQ, tables"],
];

export default function EnHomePage() {
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "WECIRCLE Global — GEO/AEO for Korean Clinics",
    serviceType: "AI search optimization (GEO/AEO) for medical tourism",
    provider: {
      "@type": "Organization",
      name: "WECIRCLE",
      legalName: "주식회사 위서클",
      url: `${siteConfig.url}/en`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Seoul",
        addressCountry: "KR",
      },
    },
    areaServed: "Global",
    description:
      "Multilingual GEO/AEO content publishing that gets Korean clinics ranked on Google and cited by ChatGPT, Perplexity and Gemini for foreign-patient search.",
  };

  return (
    <>
      <JsonLd data={serviceLd} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 md:pt-24">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
            GEO / AEO for medical tourism
          </div>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-stone-950 md:text-6xl">
            When a foreign patient asks AI for the{" "}
            <span className="text-[#1B68FF]">best clinic in Korea</span>, does it name{" "}
            <span className="italic" style={{ fontFamily: "Fraunces, serif" }}>
              yours
            </span>
            ?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            Patients no longer scroll ten blue links — they ask ChatGPT, Perplexity and Gemini.
            We publish English, Japanese and Chinese content that ranks on Google{" "}
            <strong className="text-stone-900">and gets your clinic cited by AI</strong> — and we
            measure every mention.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ContactButtons waLabel="Book a call" />
            <Link
              href="/en/guides/best-skin-clinics-in-gangnam"
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900"
            >
              See a live sample
            </Link>
          </div>
        </div>
      </section>

      {/* Round 145c — 환자 분기 배너 (감사 #11: 이 홈은 B2B, 환자 유입 시 길 안내) */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <Link
          href="/en/blog"
          className="flex items-center justify-between gap-4 rounded-2xl border border-[#1B68FF]/25 bg-[#1B68FF]/5 px-6 py-4 transition hover:border-[#1B68FF]/50"
        >
          <span className="text-sm font-semibold text-stone-800">
            Looking for treatment in Korea? Browse our patient guides
          </span>
          <span className="shrink-0 text-sm font-bold text-[#1B68FF]">→</span>
        </Link>
      </section>

      {/* The shift */}
      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div>
            <div className="text-3xl font-black text-stone-950">AI-first</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Foreign patients research on ChatGPT & Perplexity before they ever open a map.
            </p>
          </div>
          <div>
            <div className="text-3xl font-black text-stone-950">Invisible = lost</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              If AI doesn&apos;t cite your clinic, you don&apos;t exist for that patient — no matter
              how good you are.
            </p>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1B68FF]">Citeable wins</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              AI quotes structured, factual content — prices, comparisons, FAQs. That&apos;s exactly
              what we build.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
          How it works
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="text-sm font-black text-[#1B68FF]">{s.n}</div>
              <div className="mt-2 text-lg font-bold text-stone-900">{s.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why different */}
      <section id="proof" className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
            Why WECIRCLE, not a typical agency
          </h2>
          <p className="mt-3 max-w-2xl text-stone-600">
            Most agencies post content and hope. We already run a live AI-citation measurement
            system for Korean clinics — the same engine now points at your foreign-patient funnel.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-[12px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold"> </th>
                  <th className="px-4 py-3 font-semibold">Typical agency</th>
                  <th className="px-4 py-3 font-semibold text-[#1B68FF]">WECIRCLE Global</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
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

      {/* Specialties */}
      <section id="specialties" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
          Built for your specialty
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTIES.map((s, i) => (
            <Link
              key={s.t}
              href={`/en/clinics/${SPECIALTY_CATS[i]}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-[#1B68FF] hover:shadow-sm"
            >
              <div className="font-bold text-stone-900">{s.t}</div>
              <div className="mt-1 text-[13px] text-stone-500">{s.ex}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl bg-stone-950 px-8 py-14 text-center text-white md:px-16">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">
            Be the clinic AI recommends.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-300">
            Book a 20-minute call. We&apos;ll show you which competitors AI cites today for your
            treatments — and how we make it you.
          </p>
          <ContactButtons waLabel="Book a call" size="lg" className="mt-8 justify-center" />
        </div>
      </section>
    </>
  );
}
