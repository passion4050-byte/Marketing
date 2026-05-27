import type { MetadataRoute } from "next";
import { getAllPostsIncludingLegacy as getAllPosts } from "@/lib/posts";
import {
  getAllPartnerPosts,
  PARTNER_CATEGORY_SLUGS,
  type PartnerPost,
} from "@/lib/partners";
import { absoluteUrl } from "@/lib/site";

// Round 12 (2026-05-26): sitemap.ts 는 Next.js metadata route — `dynamic` export
//   가 webpack metadata-route-loader 와 충돌해 빌드 fail. 다시 revalidate=60 으로
//   되돌리고, partners 호출만 try/catch 로 graceful degradation. partners.ts 의
//   throw 가 sitemap 빌드를 막지 못하도록 보호.
export const revalidate = 60;

async function safeGetPartnerPosts(): Promise<PartnerPost[]> {
  try {
    return await getAllPartnerPosts();
  } catch (err) {
    console.error("[sitemap] getAllPartnerPosts failed, omitting partner URLs:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, partnerPosts] = await Promise.all([
    getAllPosts(),
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

  return [
    ...staticPages,
    ...partnerCategoryPages,
    ...postPages,
    ...partnerListPages,
    ...partnerPostPages,
  ];
}
