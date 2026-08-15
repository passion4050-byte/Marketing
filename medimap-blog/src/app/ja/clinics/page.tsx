import type { Metadata } from "next";
import Link from "next/link";
import { getOverseasClinicDirectory } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "提携クリニック — WECIRCLE Global",
  description: "診療科別の韓国提携クリニック。検証済みガイドを読み、無料見積もりを受け取れます。",
  alternates: overseasAlternates("ja", "/clinics"),
};

// Round 145d — KR /with-partners 미러 (진료과 → 병원 → 콘텐츠)
const CATS: { slug: string; over: string; label: string; sub: string }[] = [
  { slug: "eyeclinic", over: "Ophthalmology", label: "眼科", sub: "レーシック・スマイル・白内障" },
  { slug: "derma", over: "Dermatology", label: "皮膚科", sub: "ニキビ・レーザー・リフティング" },
  { slug: "plastic", over: "Plastic Surgery", label: "美容外科", sub: "鼻・目・輪郭" },
  { slug: "dental", over: "Dentistry", label: "歯科", sub: "インプラント・ラミネート" },
  { slug: "hair", over: "Hair Transplant", label: "植毛", sub: "FUE・ヘアライン" },
  { slug: "oriental", over: "Korean Medicine", label: "韓方医学", sub: "伝統医学プログラム" },
  { slug: "internal", over: "Internal Medicine", label: "健診・内科", sub: "健康診断・内科" },
];

export default async function JaClinicsIndex() {
  const dir = await getOverseasClinicDirectory("ja");
  const sections = CATS.map((c) => {
    const clinics = dir.filter((d) => d.category === c.slug);
    return { ...c, clinics, guides: clinics.reduce((a, b) => a + b.guides, 0) };
  }).filter((s) => s.clinics.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        提携クリニック
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        WECIRCLE提携ネットワークの韓国クリニックを診療科別に。全ガイドは韓国医療広告ガイドラインに基づき検収しています。
      </p>

      <ol className="mt-10 divide-y divide-stone-200">
        {sections.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/ja/clinics/${s.slug}`}
              className="group grid grid-cols-[56px_1fr_auto] items-center gap-5 py-8 md:grid-cols-[80px_1fr_auto] md:gap-8"
            >
              <span className="text-3xl font-black tabular-nums text-stone-300 transition group-hover:text-stone-900 md:text-4xl">
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
                  院
                </div>
                {s.guides > 0 && (
                  <div className="mt-0.5 text-[11px] text-stone-400">ガイド {s.guides}件</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
