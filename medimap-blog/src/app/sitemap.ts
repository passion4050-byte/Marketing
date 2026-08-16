import type { MetadataRoute } from "next";
import { getAllPostsIncludingLegacy as getAllPosts } from "@/lib/posts";
import {
  getAllPartnerPosts,
  PARTNER_CATEGORY_SLUGS,
  type PartnerPost,
} from "@/lib/partners";
import { absoluteUrl } from "@/lib/site";
import { getOverseasCards } from "@/lib/guides";
import { OVERSEAS_BLOG_CATEGORIES } from "@/lib/overseasBlog";

// Round 12 (2026-05-26): sitemap.ts 는 Next.js metadata route — `dynamic` export
//   가 webpack metadata-route-loader 와 충돌해 빌드 fail. 다시 revalidate=60 으로
//   되돌리고, partners 호출만 try/catch 로 graceful degradation. partners.ts 의
//   throw 가 sitemap 빌드를 막지 못하도록 보호.
// Round 81 (2026-06-23): 60→3600. 동적 sitemap 이 매 분 재생성되면 Googlebot 이 콜드
//   재생성(+Supabase 왕복)에 걸려 페치 타임아웃("가져올 수 없음") 위험. 캐시 정적본을
//   더 오래 서빙해 페치 신뢰도↑. 발행은 일 단위라 1시간 신선도면 충분.
export const revalidate = 3600;

async function safeGetPartnerPosts(): Promise<PartnerPost[]> {
  try {
    return await getAllPartnerPosts();
  } catch (err) {
    console.error("[sitemap] getAllPartnerPosts failed, omitting partner URLs:", err);
    return [];
  }
}

// Round 17 (2026-05-28): posts.ts 의 getDbPostRows 가 throw 할 수 있으므로 wrap.
async function safeGetAllPosts(): Promise<Awaited<ReturnType<typeof getAllPosts>>> {
  try {
    return await getAllPosts();
  } catch (err) {
    console.error("[sitemap] getAllPosts failed, omitting blog URLs:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, partnerPosts] = await Promise.all([
    safeGetAllPosts(),
    safeGetPartnerPosts(),
  ]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/with-partners"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const partnerCategoryPages: MetadataRoute.Sitemap = PARTNER_CATEGORY_SLUGS.map(
    (slug) => ({
      url: absoluteUrl(`/with-partners/${slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // 파트너별 list 페이지 (중복 제거)
  const partnerListSeen = new Set<string>();
  const partnerListPages: MetadataRoute.Sitemap = [];
  for (const p of partnerPosts) {
    const key = `${p.partner_category}/${p.partner_slug}`;
    if (partnerListSeen.has(key)) continue;
    partnerListSeen.add(key);
    partnerListPages.push({
      url: absoluteUrl(`/with-partners/${p.partner_category}/${p.partner_slug}`),
      lastModified: new Date(p.published_at),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const partnerPostPages: MetadataRoute.Sitemap = partnerPosts.map((p) => ({
    url: absoluteUrl(
      `/with-partners/${p.partner_category}/${p.partner_slug}/${p.slug}`,
    ),
    lastModified: new Date(p.published_at),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // 해외(overseas) — 홈 + 블로그 인덱스 + 클리닉 허브 + 콘텐츠 상세(canonical URL)
  //   파트너 콘텐츠는 canonical 이 /{lang}/clinics/{cat}/{partner}/{slug} (guides 는 301 리다이렉트),
  //   비파트너(블로그)는 /{lang}/guides/{slug}. 국내 2단 구조를 해외에도 그대로 반영.
  const OVERSEAS_LANGS: Array<{ code: "en" | "ja" | "zh" | "tw"; db: string }> = [
    { code: "en", db: "en" },
    { code: "ja", db: "ja" },
    { code: "zh", db: "zh-Hans" },
    { code: "tw", db: "zh-Hant" }, // Round 159b — 대만(번체)
  ];
  const overseasStatic: MetadataRoute.Sitemap = [
    ...OVERSEAS_LANGS.flatMap((l) => [
      { url: absoluteUrl(`/${l.code}`), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
      { url: absoluteUrl(`/${l.code}/blog`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      ...OVERSEAS_BLOG_CATEGORIES.map((cat) => ({
        url: absoluteUrl(`/${l.code}/blog/category/${cat}`),
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      { url: absoluteUrl(`/${l.code}/clinics`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
      { url: absoluteUrl(`/${l.code}/about`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
      { url: absoluteUrl(`/${l.code}/contact`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    ]),
    { url: absoluteUrl("/en/guides/best-skin-clinics-in-gangnam"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const overseasCardsByLang = await Promise.all(
    OVERSEAS_LANGS.map((l) => getOverseasCards(l.db).catch(() => [])),
  );
  const overseasHubSeen = new Set<string>();
  const overseasHubs: MetadataRoute.Sitemap = [];
  const overseasDetails: MetadataRoute.Sitemap = [];
  OVERSEAS_LANGS.forEach((l, i) => {
    for (const c of overseasCardsByLang[i]) {
      if (c.is_partner && c.partner_category && c.partner_slug) {
        const cat = `/${l.code}/clinics/${c.partner_category}`;
        if (!overseasHubSeen.has(cat)) {
          overseasHubSeen.add(cat);
          overseasHubs.push({ url: absoluteUrl(cat), lastModified: now, changeFrequency: "weekly", priority: 0.7 });
        }
        const hub = `/${l.code}/clinics/${c.partner_category}/${c.partner_slug}`;
        if (!overseasHubSeen.has(hub)) {
          overseasHubSeen.add(hub);
          overseasHubs.push({ url: absoluteUrl(hub), lastModified: now, changeFrequency: "weekly", priority: 0.7 });
        }
        overseasDetails.push({ url: absoluteUrl(`${hub}/${c.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.8 });
      } else {
        overseasDetails.push({ url: absoluteUrl(`/${l.code}/guides/${c.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.8 });
      }
    }
  });

  return [
    ...staticPages,
    ...partnerCategoryPages,
    ...postPages,
    ...partnerListPages,
    ...partnerPostPages,
    ...overseasStatic,
    ...overseasHubs,
    ...overseasDetails,
  ];
}
