import type { Metadata } from "next";
import Link from "next/link";
import { getOverseasClinicDirectory } from "@/lib/guides";
import { overseasAlternates } from "@/lib/hreflang";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "合作诊所 — WECIRCLE Global",
  description: "按科室浏览韩国合作诊所。阅读经审核的指南，获取免费报价。",
  alternates: overseasAlternates("zh", "/clinics"),
};

// Round 145d — KR /with-partners 미러 (진료과 → 병원 → 콘텐츠)
const CATS: { slug: string; over: string; label: string; sub: string }[] = [
  { slug: "eyeclinic", over: "Ophthalmology", label: "眼科", sub: "近视激光·SMILE·白内障" },
  { slug: "derma", over: "Dermatology", label: "皮肤科", sub: "祛痘·激光·提升·水光" },
  { slug: "plastic", over: "Plastic Surgery", label: "整形外科", sub: "隆鼻·双眼皮·轮廓" },
  { slug: "dental", over: "Dentistry", label: "牙科", sub: "种植牙·贴面" },
  { slug: "hair", over: "Hair Transplant", label: "植发", sub: "FUE·发际线" },
  { slug: "oriental", over: "Korean Medicine", label: "韩医", sub: "传统韩医项目" },
  { slug: "internal", over: "Internal Medicine", label: "体检·内科", sub: "健康体检·内科" },
];

export default async function ZhClinicsIndex() {
  const dir = await getOverseasClinicDirectory("zh");
  const sections = CATS.map((c) => {
    const clinics = dir.filter((d) => d.category === c.slug);
    return { ...c, clinics, guides: clinics.reduce((a, b) => a + b.guides, 0) };
  }).filter((s) => s.clinics.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-stone-950 md:text-4xl">
        合作诊所
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        WECIRCLE 合作网络中的韩国诊所，按科室分类。所有指南均按韩国医疗广告规范审核。
      </p>

      <ol className="mt-10 divide-y divide-stone-200">
        {sections.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/zh/clinics/${s.slug}`}
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
                  家
                </div>
                {s.guides > 0 && (
                  <div className="mt-0.5 text-[11px] text-stone-400">指南 {s.guides}篇</div>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
