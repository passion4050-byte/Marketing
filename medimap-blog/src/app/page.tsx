import { Hero } from "@/components/Hero";
import { ArticleCard } from "@/components/ArticleCard";
import { CTABlock } from "@/components/CTABlock";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import Link from "next/link";

export const revalidate = false;

export default async function HomePage() {
  const posts = await getAllPosts();
  const latest = posts.slice(0, 4);

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />

      <Hero />

      <section className="container-content py-20">
        <div className="text-center">
          <span className="pill-label">메디맵 인사이트</span>
          <h2 className="mt-4 text-headline">최신 콘텐츠</h2>
          <p className="mt-3 text-ink-muted">
            의료/안과 분야의 신뢰할 수 있는 가이드와 사례를 정기적으로 발행합니다.
          </p>
        </div>

        {latest.length === 0 ? (
          <p className="mt-10 text-center text-ink-subtle">
            아직 발행된 글이 없습니다. <code>content/blog/</code>에 MDX를 추가하세요.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {latest.map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/blog" className="btn-secondary">
            전체 글 보기
          </Link>
        </div>
      </section>

      <section className="container-content pb-20">
        <CTABlock utmSource="home" utmCampaign="home_cta" />
      </section>
    </>
  );
}
