import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles, BookOpen, Compass, Layers } from "lucide-react";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts, BLOG_CATEGORIES } from "@/lib/posts";

// Round 16 (2026-05-27): force-dynamic + middleware no-store — ISR 60초 캐싱 stuck fix.
// Round 111 (2026-07-02): taste-skill 원리 적용. asymmetric bento, magazine feel, anti-slop.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "위서클 인사이트",
  description:
    "위서클이 발행하는 병원 마케팅 인사이트. AI 검색 시대에 병원이 어떻게 살아남는지 다룹니다.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "위서클 인사이트", type: "website" },
};

const CATEGORY_META: Record<
  string,
  { icon: typeof BookOpen; tagline: string; gradient: string; softBg: string; accent: string; border: string }
> = {
  content_marketing: {
    icon: BookOpen,
    tagline: "쓰는 힘, 발견되는 콘텐츠",
    gradient: "from-sky-500 via-blue-600 to-indigo-700",
    softBg: "bg-sky-50/70",
    accent: "text-sky-700",
    border: "border-sky-100",
  },
  ai_trend: {
    icon: Compass,
    tagline: "AI 가 바꾸는 검색 지형",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-700",
    softBg: "bg-violet-50/70",
    accent: "text-violet-700",
    border: "border-violet-100",
  },
  hospital_marketing: {
    icon: Layers,
    tagline: "현장의 마케터를 위한 실전",
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    softBg: "bg-emerald-50/70",
    accent: "text-emerald-700",
    border: "border-emerald-100",
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  const total = posts.length;
  const [featured, ...rest] = posts;
  const restToShow = rest.slice(0, 8);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
        ])}
      />

      {/* === Editorial Hero — asymmetric split === */}
      <section className="relative border-b border-slate-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(1100px 480px at 12% 0%, rgba(27,104,255,0.08), transparent 55%), radial-gradient(900px 360px at 100% 10%, rgba(26,210,164,0.08), transparent 55%)",
          }}
        />
        <div className="container-content relative pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand backdrop-blur">
                <Sparkles size={12} />
                Wecircle Insights
              </div>
              <h1 className="mt-6 text-[40px] font-black leading-[1.02] tracking-[-0.035em] text-ink md:text-[68px]">
                병원 마케팅을,
                <br />
                <span className="bg-gradient-to-r from-brand via-brand-600 to-accent bg-clip-text text-transparent">
                  다시 쓰는 시간
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">
                검색이 검색을 벗어나고, 광고가 광고를 벗어나는 시대. 병원이 살아남기 위해 무엇을 써야 하는지, 위서클 팀이 매일 기록합니다.
              </p>
            </div>

            {/* Right column — stat + featured spotlight */}
            {featured ? (
              <Link
                href={`/blog/${featured.slug}`}
                className="group relative block overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)] transition hover:-translate-y-1 hover:border-brand-200"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-brand">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  Featured
                </div>
                <h2 className="mt-3 line-clamp-3 text-2xl font-black leading-tight tracking-tight text-ink transition group-hover:text-brand">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {featured.description}
                  </p>
                )}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-ink-muted">
                  <span className="num">
                    {new Date(featured.date).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-brand-700 transition group-hover:translate-x-0.5">
                    이어 읽기 <ArrowUpRight size={13} strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-ink-muted">
                신규 인사이트가 곧 발행됩니다.
              </div>
            )}
          </div>

          {/* Stat strip */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="발행 인사이트" value={total.toLocaleString()} unit="편" />
            <MiniStat label="카테고리" value={String(BLOG_CATEGORIES.length)} unit="개" />
            <MiniStat label="발행 주기" value="매일" unit="1편" />
            <MiniStat label="AI 인용" value="누적" unit="추적" muted />
          </div>
        </div>
      </section>

      {/* === Category rail — asymmetric with icon + gradient chip === */}
      <section className="container-content py-16 md:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-700">
              Categories
            </div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-ink md:text-4xl">
              세 갈래로 나뉜 인사이트
            </h2>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {BLOG_CATEGORIES.map((cat) => {
            const m = CATEGORY_META[cat.slug] ?? CATEGORY_META.content_marketing;
            const Icon = m.icon;
            return (
              <Link
                key={cat.slug}
                href={`/blog/category/${cat.slug}`}
                className={`group relative overflow-hidden rounded-[2rem] border ${m.border} ${m.softBg} p-7 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.2)]`}
              >
                {/* Rank stripe */}
                <span
                  aria-hidden
                  className="absolute -right-2 top-2 text-[80px] font-black leading-none tracking-tighter text-slate-900/[0.04]"
                >
                  {cat.slug === "content_marketing" ? "01" : cat.slug === "ai_trend" ? "02" : "03"}
                </span>

                <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-lg`}>
                  <Icon size={26} strokeWidth={1.75} />
                </div>
                <h3 className={`relative mt-5 text-2xl font-black tracking-tight text-ink transition group-hover:${m.accent}`}>
                  {cat.ko}
                </h3>
                <p className={`relative mt-1 text-[13px] font-bold uppercase tracking-widest ${m.accent}`}>
                  {m.tagline}
                </p>
                <p className="relative mt-3 text-sm leading-relaxed text-ink-soft">
                  {cat.description}
                </p>
                <div className={`relative mt-6 inline-flex items-center gap-1 text-sm font-bold ${m.accent}`}>
                  카테고리 열기
                  <ArrowUpRight size={15} strokeWidth={2.5} className="transition group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* === Recent posts === */}
      {restToShow.length > 0 && (
        <section className="container-content pb-20 md:pb-24">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-700">
                Latest
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-ink md:text-4xl">
                최근에 발행한 글
              </h2>
            </div>
            <span className="text-sm text-ink-muted num">
              총 {total.toLocaleString()}편
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restToShow.map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <section className="container-content pb-24">
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-16 text-center">
            <p className="text-ink-subtle">
              새로운 인사이트가 곧 발행됩니다. 매일 아침 새 글이 업데이트됩니다.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

function MiniStat({
  label,
  value,
  unit,
  muted,
}: {
  label: string;
  value: string;
  unit: string;
  muted?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${muted ? "border-dashed border-slate-200 bg-white/40" : "border-slate-100 bg-white/80 backdrop-blur"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`text-2xl font-black tracking-tight ${muted ? "text-ink-muted" : "text-ink"} num`}>
          {value}
        </span>
        <span className="text-[11px] font-bold text-ink-muted">{unit}</span>
      </div>
    </div>
  );
}
