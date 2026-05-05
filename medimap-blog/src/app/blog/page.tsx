import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import { ShieldCheck, FileText, Sparkles, ArrowUpRight } from "lucide-react";

export const revalidate = false;

export const metadata: Metadata = {
  title: "메디맵 인사이트",
  description:
    "메디맵이 발행하는 의료/안과 가이드. 라식·스마일·백내장 등 시술 정보부터 병원 선택 기준까지.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "메디맵 인사이트", type: "website" },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  const categories = Array.from(
    new Set(posts.map((p) => p.category).filter(Boolean) as string[]),
  );
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
        ])}
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dots opacity-30" aria-hidden />
        <div
          className="absolute inset-x-0 top-0 h-[280px] bg-gradient-to-b from-brand-50/50 via-white/0 to-white"
          aria-hidden
        />
        <div className="container-content relative py-16 md:py-24">
          <header className="mx-auto max-w-3xl text-center">
            <span className="pill-label">메디맵 인사이트</span>
            <h1 className="mt-4 text-[40px] font-extrabold tracking-[-0.025em] balance-text md:text-[48px]">
              신뢰할 수 있는 의료 가이드
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-ink-muted pretty-text">
              의료법 검수를 마친 콘텐츠만 발행합니다. AI 검색에서 인용 가능한
              형식(Article + FAQ + MedicalWebPage Schema)으로 구조화되어 있습니다.
            </p>
            <div className="mt-7 inline-flex flex-wrap items-center justify-center gap-2 rounded-pill border border-line/80 bg-white/80 px-3 py-1.5 text-xs text-ink-muted backdrop-blur">
              <span className="inline-flex items-center gap-1 num">
                <FileText size={12} className="text-brand" /> {posts.length}편 발행
              </span>
              <span className="meta-divider" />
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} className="text-brand" /> 의료법 9룰 검수
              </span>
              <span className="meta-divider" />
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-accent" /> AI 인용 최적화
              </span>
            </div>
          </header>

          {categories.length > 0 && (
            <div className="mt-10 flex flex-wrap justify-center gap-1.5">
              <span className="pill-tag border-brand-100 bg-brand-50 text-brand-700">
                전체
              </span>
              {categories.map((c) => (
                <span key={c} className="pill-tag">
                  {c}
                </span>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="mt-16 rounded-card border border-dashed border-line bg-white p-16 text-center">
              <div className="text-3xl">📝</div>
              <p className="mt-3 text-ink-subtle">
                아직 발행된 글이 없습니다.
              </p>
            </div>
          ) : (
            <>
              {featured && (
                <a
                  href={`/blog/${featured.slug}`}
                  className="group mt-12 grid gap-6 overflow-hidden rounded-card border border-line/70 bg-white p-6 shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card md:grid-cols-[1.4fr_1fr] md:p-8"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="pill-label">최신 발행</span>
                      {featured.reviewedBy && (
                        <span className="pill-tag border-brand-100 text-brand-700">
                          의료진 검수: {featured.reviewedBy}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-[24px] font-bold tracking-tight transition-colors group-hover:text-brand md:text-[30px]">
                      {featured.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 leading-relaxed text-ink-muted">
                      {featured.description}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {(featured.tags ?? []).slice(0, 4).map((t) => (
                        <span key={t} className="pill-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition-transform group-hover:translate-x-0.5">
                      가이드 읽기 <ArrowUpRight size={14} />
                    </div>
                  </div>
                  <div className="relative hidden items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-brand-50 via-white to-accent-50 md:flex">
                    <div className="absolute inset-6 rounded-card border border-brand-100/40" />
                    <div
                      className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl"
                      aria-hidden
                    />
                    <div className="relative px-6 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">
                        FEATURED
                      </div>
                      <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink balance-text md:text-4xl">
                        {featured.category ?? "메디컬"}
                      </div>
                    </div>
                  </div>
                </a>
              )}

              {rest.length > 0 && (
                <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <ArticleCard key={p.slug} post={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
