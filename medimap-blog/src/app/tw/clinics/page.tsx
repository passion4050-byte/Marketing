import type { Metadata } from "next";
import Link from "next/link";
import { getOverseasClinicDirectory } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "合作診所 — WECIRCLE Global",
  description: "按科別瀏覽韓國合作診所。閱讀經審核的攻略，取得免費報價。",
  alternates: overseasAlternates("tw", "/clinics"),
};

// Round 159b — zh 미러 (진료과 → 병원 → 콘텐츠), 대만 용어(雷射·植牙·健檢·植髮)
const CATS: { slug: string; over: string; label: string; sub: string }[] = [
  { slug: "eyeclinic", over: "Ophthalmology", label: "眼科", sub: "近視雷射·SMILE·白內障" },
  { slug: "derma", over: "Dermatology", label: "皮膚科", sub: "痘疤·雷射·拉提·水光" },
  { slug: "plastic", over: "Plastic Surgery", label: "整形外科", sub: "隆鼻·雙眼皮·輪廓" },
  { slug: "dental", over: "Dentistry", label: "牙科", sub: "植牙·陶瓷貼片" },
  { slug: "hair", over: "Hair Transplant", label: "植髮", sub: "FUE·髮際線" },
  { slug: "oriental", over: "Korean Medicine", label: "韓醫", sub: "傳統韓醫療程" },
  { slug: "internal", over: "Internal Medicine", label: "健檢·內科", sub: "健康檢查·內科" },
];

export default async function TwClinicsIndex() {
  const dir = await getOverseasClinicDirectory("tw");
  const sections = CATS.map((c) => {
    const clinics = dir.filter((d) => d.category === c.slug);
    return { ...c, clinics, guides: clinics.reduce((a, b) => a + b.guides, 0) };
  }).filter((s) => s.clinics.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        合作診所
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        WECIRCLE 合作網絡中的韓國診所，按科別分類。所有攻略均按韓國醫療廣告規範審核。
      </p>

      <ol className="mt-10 divide-y divide-stone-200">
        {sections.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/tw/clinics/${s.slug}`}
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
                  家
                </div>
                {s.guides > 0 && (
                  <div className="mt-0.5 text-[11px] text-stone-400">攻略 {s.guides}篇</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
