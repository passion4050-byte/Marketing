// Twitter card reuses the same default OG art.
// Next.js App Router file conventions: separate file required because metadata
// resolves twitter-image and opengraph-image independently.
export {
  default,
  alt,
  size,
  contentType,
  runtime,
  dynamic,
} from "./opengraph-image";
