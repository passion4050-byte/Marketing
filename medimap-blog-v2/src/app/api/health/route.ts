import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'medimap-geo',
    time: new Date().toISOString(),
    envs: {
      llmProvider: process.env.LLM_PROVIDER ?? 'unset',
      hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasIndexNow: Boolean(process.env.INDEXNOW_KEY),
      hasCronSecret: Boolean(process.env.CRON_SECRET)
    }
  });
}
