/**
 * Twitter card = 루트 OG 아트 재사용.
 *
 * 🔴 Round 181 (2026-08-30) — 예전엔 `export { default, runtime, ... } from "./opengraph-image"`
 *   재export 였다. Next 의 metadata image 규약은 route segment config(runtime/dynamic/size/
 *   contentType/alt)를 **정적으로 분석**하는데, 재export 는 그 분석을 통과하지 못해
 *   설정이 유실된 채 라우트가 생성된다. 실측(프로덕션):
 *     /opengraph-image → 200(단 본문 0바이트) / /twitter-image → 500
 *   같은 내용인데 결과가 달랐던 이유가 이것이다. 각 상수를 이 파일에서 직접 선언한다.
 */
import OpengraphImage from "./opengraph-image";

export const alt = "위서클 — 헬스케어의 미래를 함께 만들어갑니다";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default OpengraphImage;
