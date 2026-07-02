import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategoryMeta,
  getPartnerPostsByPartner,
} from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

// Round 12: force-dynamic 으로 빌드 시점 prerender 회피
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ category: string; partner: string }>;
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
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
    alternates: {
      canonical: absoluteUrl(`/with-partners/${category}/${partner}`),
    },
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

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:py-14">
      <nav className="mb-6 text-xs text-ink-muted">
        <Link href="/with-partners" className="hover:text-brand">
          파트너 콘텐츠
        </Link>{" "}
        /{" "}
        <Link
          href={`/with-partners/${meta.slug}`}
          className="hover:text-brand"
        >
          {meta.ko}
        </Link>{" "}
        / <span className="font-semibold text-ink">{tenantName}</span>
      </nav>

      <header className="mb-10 rounded-2xl bg-slate-50 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          Partner
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink">
          {tenantName}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {meta.ko} 분야 위서클 파트너 병원. 총 {posts.length} 개의 검증된
          의료 콘텐츠.
        </p>
      </header>

      <section>
        <h2 className="mb-6 text-lg font-bold text-ink">전체 글</h2>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
              className="group flex items-start gap-5 p-5 transition hover:bg-emerald-50/40"
            >
              {p.cover_image_url && (
                <div className="relative hidden shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block sm:w-36 sm:aspect-[16/10]">
                  <img
                    src={p.cover_image_url}
                    alt={p.cover_image_alt ?? p.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {p.published_at}
                </div>
                <h3 className="mt-1 text-base font-bold leading-snug text-ink transition-colors group-hover:text-emerald-700 sm:text-lg">
                  {p.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
                  {p.excerpt}
                </p>
              </div>
              <span className="hidden shrink-0 self-center sm:inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white transition-all group-hover:border-emerald-500 group-hover:bg-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-slate-500 transition-colors group-hover:text-white"
                >
                  <path stroke="currentColor" d="M7 17L17 7" />
                  <path stroke="currentColor" d="M7 7h10v10" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 rounded-2xl bg-brand/5 p-6">
        <h3 className="text-sm font-bold text-ink">{tenantName} 문의</h3>
        <p className="mt-1 text-sm text-ink-soft">
          진료 상담은 위서클 카카오 채널을 통해 연결됩니다.
        </p>
        <a
          href={siteConfig.contact.kakao}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FEE500] px-4 py-2 text-sm font-bold text-[#3C1E1E]"
        >
          카카오톡으로 상담받기
        </a>
      </footer>
    </main>
  );
}
