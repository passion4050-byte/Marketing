/**
 * 단축링크 매니페스트 로더.
 *
 * 빌드 타임에 SaaS 의 ShortLink 테이블을 export 한 `content/shortlinks.json` 을 읽어
 * `/r/{slug}` redirect 라우트에서 사용한다. 매니페스트가 없거나 slug 가 없으면
 * `/blog` 로 fallback 한다.
 *
 * 매니페스트 형식:
 * ```
 * { "lasik_guide": { "target_url": "https://wecircle.co.kr/blog/lasik-guide?utm_source=...", "label": "..." } }
 * ```
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface ShortlinkEntry {
  target_url: string;
  label?: string;
  publication_id?: number;
  is_active?: boolean;
}

export type ShortlinkManifest = Record<string, ShortlinkEntry>;

let cachedManifest: ShortlinkManifest | null = null;

async function loadManifest(): Promise<ShortlinkManifest> {
  if (cachedManifest) return cachedManifest;
  const file = path.join(process.cwd(), "content", "shortlinks.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as ShortlinkManifest;
    cachedManifest = parsed;
    return parsed;
  } catch {
    cachedManifest = {};
    return cachedManifest;
  }
}

export async function getShortlink(slug: string): Promise<ShortlinkEntry | null> {
  const manifest = await loadManifest();
  const entry = manifest[slug];
  if (!entry) return null;
  if (entry.is_active === false) return null;
  return entry;
}

export async function getAllSlugs(): Promise<string[]> {
  const manifest = await loadManifest();
  return Object.keys(manifest);
}
