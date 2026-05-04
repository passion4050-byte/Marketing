import { jsonLdScript } from "@/lib/schema";

export function JsonLd({ data }: { data: Record<string, unknown> | null | undefined }) {
  const json = jsonLdScript(data);
  if (!json) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
