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
  if (!meta) return { title: "파트너 — 메디맵" };
  const posts = await getPartnerPostsByPartner(meta.slug, partner);
  const tenantName = posts[0]?.tenant_name || partner;
  const title = `${tenantName} — ${meta.ko} 파트너 콘텐츠 | 메디맵`;
  const description = `${tenantName} 의 ${meta.ko} 의료 콘텐츠 모음. 메디맵 의료법 가이드 통과.`;
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
          {meta.ko} 분야 메디맵 파트너 병원. 총 {posts.length} 개의 검증된
          의료 콘텐츠.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">전체 글</h2>
        <ul className="divide-y divide-slate-200">
          {posts.map((p) => (
            <li key={p.id} className="py-4">
              <Link
                href={`/with-partners/${meta.slug}/${p.partner_slug}/${p.slug}`}
                className="block hover:text-brand"
              >
                <div className="text-xs text-ink-muted">{p.published_at}</div>
                <div className="mt-1 text-base font-bold text-ink">
                  {p.title}
                </div>
                <p className="mt-1 text-sm text-ink-soft line-clamp-2">
                  {p.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 rounded-2xl bg-brand/5 p-6">
        <h3 className="text-sm font-bold text-ink">{tenantName} 문의</h3>
        <p className="mt-1 text-sm text-ink-soft">
          진료 상담은 메디맵 카카오 채널을 통해 연결됩니다.
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
