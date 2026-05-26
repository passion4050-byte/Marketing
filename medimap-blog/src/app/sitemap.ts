import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";
import { getAllPartnerPosts, PARTNER_CATEGORY_SLUGS } from "@/lib/partners";
import { absoluteUrl } from "@/lib/site";

// Round 12 (2026-05-26): force-dynamic 으로 빌드 시점 prerender skip.
//   이전 revalidate=60 은 빌드 시점에 partners.ts query 호출 → 누적 timeout → 빌드 fail.
//   sitemap 은 검색엔진이 요청 시 runtime 에 생성. partners.ts 모듈 캐시(60s) 로 cost 절감.
// 추가 안전장치: getAllPartnerPosts throw 시 try/catch 로 partner 섹션만 비우고
//   blog/static 섹션은 유지 (graceful degradation).
export const dynamic = 'force-dynamic';

async function safeGetPartnerPosts(): Promise<Awaited<ReturnType<typeof getAllPartnerPosts>>> {
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
      url: absoluteUrl(`/with-partners/${p.partner_category}/${p.par