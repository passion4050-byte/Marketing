import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";

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
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "블로그", href: "/blog" },
        ])}
      />
      <section className="container-content py-16 md:py-24">
        <header className="text-center">
          <span className="pill-label">메디맵 인사이트</span>
          <h1 className="mt-4 text-display-md">신뢰할 수 있는 의료 가이드</h1>
          <p className="mx-auto mt-3 max-w-2xl text-ink-muted">
            의료법 검수를 마친 콘텐츠만 발행합니다. AI 검색에서 인용 가능한 형식(Article + FAQ +
            MedicalWebPage Schema)으로 구조화되어 있습니다.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-center text-ink-subtle">
            아직 발행된 글이 없습니다.
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
