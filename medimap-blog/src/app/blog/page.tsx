import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogIndex } from "@/components/BlogIndex";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import { ShieldCheck, FileText, Sparkles } from "lucide-react";

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

          {posts.length === 0 ? (
            <div className="mt-16 rounded-card border border-dashed border-line bg-white p-16 text-center">
              <div className="text-3xl">📝</div>
              <p className="mt-3 text-ink-subtle">
                아직 발행된 글이 없습니다.
              </p>
            </div>
          ) : (
            <Suspense fallback={<BlogIndexFallback count={posts.length - 1} />}>
              <BlogIndex posts={posts} categories={categories} />
            </Suspense>
          )}
        </div>
      </section>
    </>
  );
}

function BlogIndexFallback({ count }: { count: number }) {
  return (
    <div
      className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      aria-busy
      aria-label="콘텐츠를 불러오는 중"
    >
      {Array.from({ length: Math.min(6, Math.max(3, count)) }).map((_, i) => (
        <div
          key={i}
          className="card-base h-56 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
