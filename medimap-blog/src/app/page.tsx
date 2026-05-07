import { Hero } from "@/components/Hero";
import { ArticleCard } from "@/components/ArticleCard";
import { CTABlock } from "@/components/CTABlock";
import { JsonLd } from "@/components/JsonLd";
import { organizationLd, websiteLd } from "@/lib/schema";
import { getAllPosts } from "@/lib/posts";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  FileText,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

// 60초 ISR — 홈 최신 글 4편이 자동 발행 시 1분 내 반영.
export const revalidate = 60;

export default async function HomePage() {
  const posts = await getAllPosts();
  const latest = posts.slice(0, 4);

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={websiteLd()} />

      <Hero />

      <section className="container-content py-20">
        <div className="mb-10 max-w-2xl">
          <span className="pill-label">왜 메디맵인가</span>
          <h2 className="mt-3 text-[28px] font-bold tracking-tight balance-text md:text-[32px]">
            의료 콘텐츠의 새로운 기준
          </h2>
          <p className="mt-3 text-ink-muted pretty-text">
            검색 트래픽을 받는 콘텐츠가 아니라, AI 검색이 인용하는 신뢰
            자산입니다.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            n="01"
            icon={<Search size={20} />}
            title="AI 검색 인용"
            desc="Perplexity·ChatGPT·Gemini·Claude가 인용할 수 있도록 Schema.org 구조화로 발행됩니다."
          />
          <FeatureCard
            n="02"
            icon={<ShieldCheck size={20} />}
            title="의료법 검수"
            desc="9개 의료광고 룰 자동 린트 + 전문의 검수. 환자가 안심하고 읽을 수 있는 콘텐츠."
            accent
          />
          <FeatureCard
            n="03"
            icon={<BarChart3 size={20} />}
            title="실시간 측정"
            desc="발행 URL의 AI 인용 빈도, 페이지뷰, 클릭 전환율을 한 화면에서 확인합니다."
          />
        </div>
      </section>

      <section className="container-content pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="pill-label">메디맵 인사이트</span>
            <h2 className="mt-3 text-[28px] font-bold tracking-tight md:text-[32px]">
              최신 콘텐츠
            </h2>
            <p className="mt-2 max-w-xl text-ink-muted">
              의료/안과 분야의 신뢰할 수 있는 가이드와 사례를 정기적으로 발행합니다.
            </p>
          </div>
          <Link href="/blog" className="hidden btn-ghost md:inline-flex">
            전체 보기 <ArrowRight size={16} />
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="mt-10 rounded-card border border-dashed border-line bg-white p-16 text-center">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-pill bg-brand-50 text-brand">
                <FileText size={20} />
              </div>
            </div>
            <p className="mt-4 text-ink-subtle">
              아직 발행된 글이 없습니다. <code>content/blog/</code>에 MDX를 추가하세요.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {latest.map((p) => (
              <ArticleCard key={p.slug} post={p} variant="compact" />
            ))}
          </div>
        )}

        <div className="mt-10 text-center md:hidden">
          <Link href="/blog" className="btn-secondary">
            전체 글 보기 <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="container-content pb-24">
        <CTABlock utmSource="home" utmCampaign="home_cta" />
      </section>
    </>
  );
}

function FeatureCard({
  n,
  icon,
  title,
  desc,
  accent,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border bg-white p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card ${
        accent
          ? "border-brand-200 ring-1 ring-brand-100"
          : "border-line/70 hover:border-brand-100"
      }`}
    >
      {accent && (
        <div
          className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-brand-100/80 to-accent-50/60 blur-xl"
          aria-hidden
        />
      )}
      <div className="relative flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-pill ${
            accent ? "bg-brand text-white shadow-cta" : "bg-brand-50 text-brand"
          }`}
        >
          {icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-subtle/60 num">
          {n}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-[1.7] text-ink-muted">{desc}</p>
    </div>
  );
}
