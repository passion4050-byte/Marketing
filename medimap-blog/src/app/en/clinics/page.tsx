import type { Metadata } from "next";
import Link from "next/link";
import { getOverseasClinicDirectory } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Partner clinics — WECIRCLE Global",
  description:
    "Korean partner clinics by specialty. Compare, read verified guides, and get a free quote.",
  alternates: overseasAlternates("en", "/clinics"),
};

/**
 * Round 145d (2026-08-15) — KR /with-partners 미러: 진료과 → 병원 → 콘텐츠 3단 구조 (감사 #8).
 *   기존: 발행 콘텐츠 있는 파트너만 평면 나열(EN=청담디어 1곳) → 엔티티 디렉토리로 전환.
 */
const CATS: { slug: string; over: string; label: string; sub: string }[] = [
  { slug: "eyeclinic", over: "Ophthalmology", label: "Eye Care", sub: "LASIK · SMILE · cataract" },
  { slug: "derma", over: "Dermatology", label: "Skin", sub: "acne · laser · lifting · skin boosters" },
  { slug: "plastic", over: "Plastic Surgery", label: "Plastic Surgery", sub: "rhinoplasty · eyelid · contouring" },
  { slug: "dental", over: "Dentistry", label: "Dental", sub: "implants · veneers" },
  { slug: "hair", over: "Hair Transplant", label: "Hair", sub: "FUE · hairline design" },
  { slug: "oriental", over: "Korean Medicine", label: "Korean Medicine", sub: "traditional treatment programs" },
  { slug: "internal", over: "Internal Medicine", label: "Checkups & More", sub: "health screening · internal medicine" },
];

export default async function EnClinicsIndex() {
  const dir = await getOverseasClinicDirectory("en");
  const sections = CATS.map((c) => {
    const clinics = dir.filter((d) => d.category === c.slug);
    return { ...c, clinics, guides: clinics.reduce((a, b) => a + b.guides, 0) };
  }).filter((s) => s.clinics.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        Partner clinics
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        Korean clinics in the WECIRCLE partner network, by specialty. Every guide is reviewed
        under Korean medical advertising rules.
      </p>

      <ol className="mt-10 divide-y divide-stone-200">
        {sections.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/en/clinics/${s.slug}`}
              className="group grid grid-cols-[56px_1fr_auto] items-center gap-5 py-8 md:grid-cols-[80px_1fr_auto] md:gap-8"
            >
              <span className="text-3xl font-black tabular-nums text-stone-300 transition group-hover:text-[#1B68FF] md:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {s.over}
                </div>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-stone-950 md:text-2xl">
                  {s.label}
                </h2>
                <p className="mt-1 text-sm text-stone-500">{s.sub}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black tabular-nums text-stone-900">
                  {s.clinics.length}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  clinic{s.clinics.length === 1 ? "" : "s"}
                </div>
                {s.guides > 0 && (
                  <div className="mt-0.5 text-[11px] text-stone-400">{s.guides} guides</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
