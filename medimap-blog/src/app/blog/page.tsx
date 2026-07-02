import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts, BLOG_CATEGORIES } from "@/lib/posts";

// Round 16 (2026-05-27): force-dynamic + middleware no-store —
// ISR 60초 캐싱 + 8초 timeout fallback이 빈 결과를 stuck시키던 with-partners
// 와 동일한 문제 재발. 일관된 fix 적용.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "위서클 인사이트",
  description:
    "위서클이 발행하는 의료/안과 가이드. 라식·스마일·백내장 등 시술 정보부터 병원 선택 기준까지.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "위서클 인사이트", type: "website" },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

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
            <span className="pill-label">위서클 인사이트</span>
            <h1 className="mt-4 text-[40px] font-extrabold tracking-[-0.025em] balance-text md:text-[48px]">
              병원 마케팅을 바꾸는 인사이트
            </h1>
            <p className="mt-4 text-base text-ink-soft">
              위서클이 운영하는 마케팅 에이전시 관점의 콘텐츠 — AI 검색 시대의
              병원 마케팅 전략을 다룹니다.
            </p>
          </header>

          {/* Round 16 — 자사 인사이트 카테고리 3종 카드 (색상 분리, 이모지 제거, 제목 강조) */}
          <section className="mt-12 grid gap-5 sm:grid-cols-3">
            {BLOG_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog/category/${cat.slug}`}
                className={`group rounded-2xl border-2 border-transparent ${cat.style.bg} p-7 shadow-sm transition hover:-translate-y-1 ${cat.style.border} hover:shadow-lg`}
              >
                <span
                  className={`inline-block rounded-full ${cat.style.pillBg} ${cat.style.pillText} px-3 py-1 text-xs font-bold uppercase tracking-wider`}
                >
                  Category
                </span>
                <h2
                  className={`mt-4 text-2xl font-extrabold leading-tight text-ink ${cat.style.accent} tracking-tight`}
                >
                  {cat.ko}
                </h2>
                <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                  {cat.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-muted group-hover:text-ink">
                  글 보기 →
                </span>
              </Link>
            ))}
          </section>

          {/* Round 16 — 최근 발행 인사이트 리스트 (ArticleCard 그리드, hover 가능) */}
          {posts.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 flex items-baseline justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-ink">
                  최근 발행 인사이트
                </h2>
                <span className="text-sm text-ink-muted">
                  총 {posts.length}편
                </span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <ArticleCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          )}

          {posts.length === 0 && (
            <div className="mt-16 rounded-2xl border border-dashed border-line bg-white p-16 text-center">
              <p className="text-ink-subtle">
                새로운 인사이트가 곧 발행됩니다. 매일 아침 새 글이 업데이트됩니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
