import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  getCategoryMeta,
  getPartnerPostsByPartner,
} from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { kakaoTrackHref } from "@/lib/ctaLink";

// Round 111 v3 (2026-07-02) — Editorial partner page.
// Round 129 — SEO/CWV: force-dynamic → ISR 60s
export const revalidate = 60;

const CATEGORY_OVERLINE: Record<string, string> = {
  eyeclinic: "Ophthalmology",
  derma: "Dermatology",
  plastic: "Plastic Surgery",
  dental: "Dental",
  internal: "Internal Medicine",
  hair: "Hair Transplant",
  oriental: "Oriental Medicine",
};

interface PageProps {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, partner } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) return { title: "파트너 — 위서클" };
  const posts = await getPartnerPostsByPartner(meta.slug, partner);
  const tenantName = posts[0]?.tenant_name || partner;
  const title = `${tenantName} — ${meta.ko} 파트너 콘텐츠 | 위서클`;
  const description = `${tenantName} 의 ${meta.ko} 의료 콘텐츠 모음. 위서클 의료법 가이드 통과.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/with-partners/${category}/${partner}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/with-partners/${category}/${partner}`),
      siteName: siteConfig.name,
      type: "website",
    },
  };
}

export default async function PartnerListPage({ params }: PageProps) {
  const { category, partner } = await params;
  const meta = getCategoryMeta(category);
  if (!meta) notFound();
  const posts = await getPartnerPostsByPartner(meta.slug, partner);
  if (posts.length === 0) notFound();
  const tenantName = posts[0].tenant_name;
  const overline = CATEGORY_OVERLINE[meta.slug] ?? meta.slug;

  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      {/* Masthead */}
      <section className="border-b border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 pt-16 pb-14 md:pt-20 md:pb-16 lg:px-10">
          <nav className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
            <span className="inline-block h-px w-6 bg-stone-400" />
            <Link href="/with-partners" className="hover:text-stone-900">
              Partners
            </Link>
            <span className="text-stone-300">/</span>
            <Link href={`/with-partners/${meta.slug}`} className="hover:text-stone-900">
              {overline}
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-900">{tenantName}</span>
          </nav>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                {overline} · Partner Clinic
              </div>
              <h1 className="mt-4 text-[42px] font-black leading-[1.05] tracking-[-0.025em] text-stone-950 md:text-[60px]">
                {tenantName}
              </h1>
            </div>
            <div className="max-w-md space-y-3 lg:pb-4">
              <p className="text-[15px] leading-[1.75] text-stone-600">
                {meta.ko} 분야 위서클 파트너 병원. 아래는 위서클 편집팀이 발행한 검증된 콘텐츠 아카이브입니다.
              </p>
              <div className="flex items-baseline gap-3 border-t border-stone-200/70 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Published
                </span>
                <span className="font-serif text-2xl tabular-nums text-stone-950">
                  {String(posts.length).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                  posts
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Posts — TOC index */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-20 lg:px-10">
        <div className="mb-8 flex items-baseline justify-between border-b border-stone-300 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.35em] text-stone-700">
            Archive
          </h2>
          <span className="text-xs tabular-nums text-stone-500">{posts.length} stories</span>
        </div>

        <ol className="divide-y divide-stone-200/70">
          {posts.map((p, i) => {
            const num = String(i + 1).padStart(2, "0");
            return (
              <li key={p.id}>
                <Link
                  href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
                  className="group grid grid-cols-[48px_1fr_auto] items-center gap-6 py-8 md:grid-cols-[64px_minmax(0,3fr)_minmax(0,180px)_auto] md:gap-10 md:py-10"
                >
                  <span className="font-serif text-3xl font-light tabular-nums leading-none text-stone-400 transition group-hover:text-stone-900 md:text-4xl">
                    {num}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                      {overline}
                    </div>
                    <h3 className="mt-1.5 text-[17px] font-bold leading-snug tracking-tight text-stone-950 transition group-hover:text-stone-700 md:text-[20px]">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-1.5 line-clamp-1 text-sm text-stone-500">
                        {p.excerpt}
                      </p>
                    )}
                  </div>
                  {/* Cover preview — desktop */}
                  <div className="hidden md:block">
                    {p.cover_image_url ? (
                      <div className="relative aspect-[3/2] w-full overflow-hidden bg-stone-100 transition duration-500 group-hover:scale-[1.02]">
                        <Image
                          src={p.cover_image_url}
                          alt={p.cover_image_alt ?? p.title}
                          fill
                          sizes="180px"
                          className="object-cover transition duration-700 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[3/2] w-full items-center justify-center border border-dashed border-stone-200 bg-stone-50 text-[9px] font-semibold uppercase tracking-widest text-stone-400">
                        <span className="font-serif text-sm italic normal-case tracking-normal text-stone-300">WECIRCLE</span>
                      </div>
                    )}
                  </div>
                  <ArrowUpRight
                    size={20}
                    strokeWidth={1.5}
                    className="text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-900"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Contact */}
      <section className="border-t border-stone-200/70">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:py-24 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
                Consultation
              </div>
              <h2 className="mt-4 font-serif text-3xl italic leading-tight text-stone-900 md:text-[40px]">
                &ldquo;{tenantName}, 상담부터 시작하세요.&rdquo;
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-[1.75] text-stone-600">
                진료 상담은 위서클 카카오 채널을 통해 연결됩니다.
              </p>
            </div>
            {/* Round 145c — 파트너 스코프 추적 링크 (/r/k-{partner}) 로 계측 통일 (감사 #14) */}
            <a
              href={kakaoTrackHref(partner)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
            >
              <span className="text-sm font-bold tracking-tight">카카오톡으로 무료 상담받기</span>
              <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
