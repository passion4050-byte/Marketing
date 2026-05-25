import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { getAllPartnerPosts, PARTNER_CATEGORY_SLUGS } from "@/lib/partners";
import { absoluteUrl } from "@/lib/site";

// 60초 ISR — 자동 발행 신규 글이 sitemap 에 1분 내 반영. 기존 빌드 타임 정적 응답이
// 옛 슬러그(`auto-{id}`) 를 캐시하던 문제 해결.
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, partnerPosts] = await Promise.all([
    getAllPosts(),
    getAllPartnerPosts(),
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
