/**
 * 포스트별 Twitter card = 같은 OG 아트 재사용.
 * Round 181 — 재export 대신 segment config 를 직접 선언한다(루트 twitter-image.tsx 주석 참조).
 */
import BlogPostOgImage from "./opengraph-image";

export const alt = "위서클 블로그";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default BlogPostOgImage;
