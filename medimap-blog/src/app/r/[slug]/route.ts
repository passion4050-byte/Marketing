import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { getShortlink } from "@/lib/shortlinks";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const link = await getShortlink(params.slug);
  if (!link) {
    return NextResponse.redirect(new URL("/blog", req.url), 302);
  }

  const target = link.target_url;

  // Fire-and-forget click webhook to SaaS, if configured.
  // We don't await — redirect should not be blocked on logging.
  const webhook = process.env.SHORTLINK_CLICK_WEBHOOK;
  if (webhook) {
    fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.SHORTLINK_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify({
        slug: params.slug,
        clicked_at: new Date().toISOString(),
        user_agent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
        country: req.headers.get("x-vercel-ip-country") || undefined,
        ip_hint: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
      }),
      // 짧은 타임아웃 — redirect는 어떤 경우에도 빨라야 한다
      signal: AbortSignal.timeout(800),
    }).catch(() => {
      /* swallow — click 로깅 실패해도 redirect 는 정상 진행 */
    });
  }

  return NextResponse.redirect(target, 302);
}

// HEAD 도 동일 동작 (preview/scan 봇 친화)
export const HEAD = GET;

// Suppress unused import warning for next/navigation redirect helper
void redirect;
void siteConfig;
