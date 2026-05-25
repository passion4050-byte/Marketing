import type { Metadata } from "next";
import Link from "next/link";
import { PARTNER_CATEGORIES, getAllPartnerPosts } from "@/lib/partners";
import { siteConfig, absoluteUrl } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "파트너 병원 콘텐츠 — 메디맵",
  description:
    "메디맵과 함께하는 안과·피부과·성형외과·치과·내과·모발이식 파트너 병원의 검증된 의료 콘텐츠.",
  alternates: { canonical: absoluteUrl("/with-partners") },
  openGraph: {
    title: "파트너 병원 콘텐츠 — 메디맵",
    description:
      "메디맵과 함께하는 6개 진료과 파트너 병원의 검증된 의료 콘텐츠 모음.",
    url: absoluteUrl("/with-partners"),
    siteName: siteConfig.name,
    type: "website",
  },
};

export default async function WithPartnersHubPage() {
  const all = await getAllPartnerPosts();
  const countByCategory = new Map<string, number>();
  for (const p of all) {
    countByCategory.set(
      p.partner_category,
      (countByCategory.get(p.partner_category) ?? 0) + 1,
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-14">
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          With Partners
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-ink sm:text-4xl">
          메디맵과 함께하는 파트너 병원 콘텐츠
        </h1>
        <p className="mt-4 max-w-2xl text-base text-ink-soft">
          안과·피부과·성형외과·치과·내과·모발이식 6개 진료과 파트너 병원의 의료법
          가이드를 통과한 검증된 콘텐츠를 한곳에서 만나보세요.
        </p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNER_CATEGORIES.map((cat) => {
          const count = countByCategory.get(cat.slug) ?? 0;
          return (
            <Link
              key={cat.slug}
              href={`/with-partners/${cat.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold text-ink group-hover:text-brand">
                  {cat.ko}
                </h2>
                <span className="text-xs font-semibold text-ink-muted">
                  {count} 개 글
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{cat.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {cat.exampleKeywords.slice(0, 4).map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-ink-soft"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-12 rounded-2xl bg-slate-50 p-6">
        <h3 className="text-sm font-bold text-ink">파트너 입점 문의</h3>
        <p className="mt-1 text-sm text-ink-soft">
          메디맵의 GEO/AEO 콘텐츠 운영에 관심 있으신 병원/의원은 카카오 채널로
          문의해주세요.
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
