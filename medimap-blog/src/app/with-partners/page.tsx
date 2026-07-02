import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles, ShieldCheck, Stethoscope } from "lucide-react";
import { PARTNER_CATEGORIES, getAllPartnerPosts } from "@/lib/partners";
import { getPartnerVisual } from "@/lib/partner-visual";
import { siteConfig, absoluteUrl } from "@/lib/site";

// Round 12: force-dynamic으로 빌드 시점 prerender 회피, runtime에 모듈 캐시(60s)로 cost 절감
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "파트너 병원 콘텐츠 — 위서클",
  description:
    "위서클과 함께하는 안과·피부과·성형외과·치과·내과·모발이식·한방 파트너 병원의 검증된 의료 콘텐츠.",
  alternates: { canonical: absoluteUrl("/with-partners") },
  openGraph: {
    title: "파트너 병원 콘텐츠 — 위서클",
    description:
      "위서클과 함께하는 7개 진료과 파트너 병원의 검증된 의료 콘텐츠 모음.",
    url: absoluteUrl("/with-partners"),
    siteName: siteConfig.name,
    type: "website",
  },
};

export default async function WithPartnersHubPage() {
  const all = await getAllPartnerPosts();
  const countByCategory = new Map<string, number>();
  for (const p of all) {
    countByCategory.set(
      p.partner_category,
      (countByCategory.get(p.partner_category) ?? 0) + 1,
    );
  }

  const totalPosts = all.length;
  const activeCategories = Array.from(countByCategory.keys()).length;

  return (
    <main className="relative overflow-hidden">
      {/* === Editorial Hero === */}
      <section className="relative border-b border-slate-100">
        {/* Ambient gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 500px at 20% -10%, rgba(27,104,255,0.09), transparent 55%), radial-gradient(900px 400px at 100% 0%, rgba(26,210,164,0.09), transparent 55%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-brand-50/40 via-white/0 to-white" aria-hidden />

        <div className="container-content relative pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand backdrop-blur">
              <Sparkles size={12} />
              With Partners
            </div>
            <h1 className="mt-5 text-[40px] font-black leading-[1.05] tracking-[-0.03em] text-ink md:text-[64px]">
              같이 걷는 병원들.
              <br />
              <span className="bg-gradient-to-r from-brand via-accent to-brand-600 bg-clip-text text-transparent">
                검증된 의료 콘텐츠
              </span>
              를 한곳에서.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              안과·피부과·성형외과·치과·내과·모발이식·한방 <strong>7개 진료과</strong> 파트너 병원이 위서클과 함께 만드는 콘텐츠 — 의료법 가이드를 통과한 정직한 정보만 모았습니다.
            </p>

            {/* Stat strip */}
            <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
              <StatCard
                icon={<Stethoscope size={16} />}
                label="진료과"
                value={String(PARTNER_CATEGORIES.length)}
                sub={`활성 ${activeCategories}개`}
              />
              <StatCard
                icon={<Sparkles size={16} />}
                label="발행 콘텐츠"
                value={totalPosts.toLocaleString()}
                sub="누적"
              />
              <StatCard
                icon={<ShieldCheck size={16} />}
                label="의료법 통과"
                value="100%"
                sub="컴플라이언스"
              />
            </div>
          </div>
        </div>
      </section>

      {/* === Category grid === */}
      <section className="container-content py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-700">
              Categories
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink md:text-3xl">
              진료과별로 골라보세요
            </h2>
          </div>
          <div className="hidden text-sm text-ink-muted md:block">
            각 진료과의 파트너 병원 콘텐츠로 이동
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_CATEGORIES.map((cat, idx) => {
            const count = countByCategory.get(cat.slug) ?? 0;
            const v = getPartnerVisual(cat.slug);
            const Icon = v.icon;
            const isEmpty = count === 0;
            return (
              <Link
                key={cat.slug}
                href={`/with-partners/${cat.slug}`}
                className={`group relative overflow-hidden rounded-3xl border ${v.border} ${v.softBg} p-6 shadow-sm transition-all duration-300 ${v.borderHover} hover:-translate-y-1.5 ${v.aura} hover:shadow-xl`}
              >
                {/* Rank stripe */}
                <span
                  aria-hidden
                  className="absolute right-6 top-6 text-[64px] font-black leading-none tracking-tighter text-slate-900/[0.04]"
                >
                  0{idx + 1}
                </span>

                {/* Icon block */}
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${v.gradient} text-white shadow-lg`}>
                  <Icon size={26} strokeWidth={1.75} />
                </div>

                {/* Title + description */}
                <h3 className={`relative mt-5 text-2xl font-black tracking-tight text-ink transition group-hover:${v.accent}`}>
                  {cat.ko}
                </h3>
                <p className={`relative mt-1 text-[13px] font-bold uppercase tracking-widest ${v.accent}`}>
                  {v.tagline}
                </p>
                <p className="relative mt-3 text-sm leading-relaxed text-ink-soft">
                  {cat.description}
                </p>

                {/* Chip wall */}
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {cat.exampleKeywords.slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className={`rounded-full ${v.chipBg} px-2.5 py-0.5 text-[11px] font-bold ${v.chipText}`}
                    >
                      #{k}
                    </span>
                  ))}
                </div>

                {/* Footer bar */}
                <div className="relative mt-6 flex items-center justify-between border-t border-white/60 pt-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink-subtle">
                      Published
                    </div>
                    <div className={`text-2xl font-black leading-none tracking-tight ${isEmpty ? 'text-slate-400' : 'text-ink'} num`}>
                      {count}
                      <span className="ml-0.5 text-xs font-bold text-ink-muted">편</span>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full ${v.chipBg} px-3 py-1.5 text-xs font-bold ${v.chipText} transition group-hover:translate-x-0.5`}>
                    {isEmpty ? '준비 중' : '카테고리 열기'}
                    <ArrowUpRight size={14} strokeWidth={2.5} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* === Partner CTA === */}
      <section className="border-t border-slate-100 bg-slate-50/60">
        <div className="container-content py-14 md:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles size={12} />
              Partner with Us
            </div>
            <h3 className="text-3xl font-black tracking-tight text-ink md:text-4xl">
              당신의 병원 이야기,
              <br className="md:hidden" />{" "}
              <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">AI 검색 시대의 자산</span>이 됩니다.
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-ink-soft md:text-base">
              위서클은 병원의 진료 철학·시술 근거·환자 사례를 의료법을 통과한 콘텐츠 자산으로 재편집합니다. AI 검색엔진에 인용되는 진짜 데이터로 만들어 드립니다.
            </p>
            <a
              href={siteConfig.contact.kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-2xl bg-[#FEE500] px-6 py-3 text-sm font-black text-[#3C1E1E] shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              카카오톡으로 상담받기
              <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-3xl font-black tracking-tight text-ink num">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold text-ink-muted">{sub}</div>
    </div>
  );
}
