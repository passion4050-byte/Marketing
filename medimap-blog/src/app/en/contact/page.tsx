import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { ContactButtons } from "@/components/ContactButtons";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Talk to WECIRCLE",
  description:
    "Book a 20-minute call. We'll show you which competitors AI cites today for your treatments — and how we make it your clinic. English, Japanese & Chinese GEO/AEO for Korean clinics.",
  alternates: {
    canonical: "/en/contact",
    languages: { en: "/en/contact", ja: "/ja/contact", "zh-Hans": "/zh/contact", ko: "/contact" },
  },
};

const STEPS = [
  { n: "01", t: "You reach out", d: "Message us on WhatsApp or LINE with your clinic name and main treatments. No form, no commitment." },
  { n: "02", t: "We run a live AI audit", d: "We check which competitors ChatGPT, Perplexity and Gemini name today for your treatments in English, Japanese and Chinese." },
  { n: "03", t: "You see the plan", d: "A 20-minute call: the gap, the content that closes it, and how we measure every AI citation afterward." },
];

export default function EnContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WECIRCLE",
    legalName: "주식회사 위서클",
    url: `${siteConfig.url}/en`,
    email: siteConfig.contact.email,
    address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" },
  };

  return (
    <>
      <JsonLd data={contactLd} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16 md:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B68FF]" />
          Talk to us
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-stone-950 md:text-6xl">
          See which clinics AI recommends for your treatments — <span className="text-[#1B68FF]">today</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
          Book a 20-minute call. We&apos;ll show you exactly which competitors ChatGPT, Perplexity and
          Gemini cite for foreign-patient searches in your specialty — and how we make it your clinic.
        </p>
        <ContactButtons waLabel="Book a call" lineLabel="LINE" size="lg" className="mt-8" />
      </section>

      {/* What happens next */}
      <section className="border-y border-stone-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">What happens next</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-stone-200 bg-[#FAFAF7] p-6">
                <div className="text-sm font-black text-[#1B68FF]">{s.n}</div>
                <div className="mt-2 text-lg font-bold text-stone-900">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business info */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-950">WECIRCLE</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              GEO/AEO content publishing that gets Korean clinics cited by AI search for foreign
              patients — measured, compliant, multilingual.
            </p>
            <dl className="mt-6 space-y-2 text-sm text-stone-600">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Company</dt>
                <dd>주식회사 위서클 (WECIRCLE Inc.)</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Location</dt>
                <dd>Seoul, Korea</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Business No.</dt>
                <dd>798-67-00527</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-semibold text-stone-800">Email</dt>
                <dd>
                  <a className="text-[#1B68FF] hover:underline" href={`mailto:${siteConfig.contact.email}`}>
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-2xl bg-stone-950 p-8 text-white">
            <div className="text-lg font-bold">Fastest way to reach us</div>
            <p className="text-sm text-stone-300">
              We reply on WhatsApp and LINE during Korean business hours (KST).
            </p>
            <ContactButtons waLabel="WhatsApp" lineLabel="LINE" />
          </div>
        </div>
      </section>
    </>
  );
}
