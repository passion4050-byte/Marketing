/**
 * 로컬 / CI에서 llms.txt + llms-full.txt + robots.txt + sitemap.xml을 정적 파일로 추출.
 * Vercel 외 호스팅이나 캐시 우회용.
 *
 * 실행: `pnpm tsx scripts/generate-llms-txt.ts`
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildLlmsTxt, buildLlmsFullTxt, buildRobotsTxt, buildSitemapXml } from '../src/lib/aeo';
import { contentTopics, faqItems, publications } from '../src/lib/mock-data';
import { siteConfig } from '../src/lib/site-config';

const outDir = join(process.cwd(), 'public', 'generated');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'llms.txt'), buildLlmsTxt(publications, faqItems));
writeFileSync(
  join(outDir, 'llms-full.txt'),
  buildLlmsFullTxt(publications, faqItems, contentTopics.flatMap((t) => t.posts))
);
writeFileSync(join(outDir, 'robots.txt'), buildRobotsTxt());
writeFileSync(
  join(outDir, 'sitemap.xml'),
  buildSitemapXml([
    { loc: `${siteConfig.url}/`, priority: 1.0 },
    { loc: `${siteConfig.url}/blog`, priority: 0.9 },
    { loc: `${siteConfig.url}/faq`, priority: 0.9 }
  ])
);

console.log('✔ generated under public/generated/');
