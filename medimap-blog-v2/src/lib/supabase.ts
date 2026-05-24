/**
 * Supabase client — env가 설정되어 있으면 실제 연결, 없으면 null (mock 사용).
 * 실 운영에서는 server-only 호출에 service role을 분리해 사용.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _browser: SupabaseClient | null = null;
let _server: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  if (_browser) return _browser;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _browser = createClient(url, key);
  return _browser;
}

export function getServerClient(): SupabaseClient | null {
  if (_server) return _server;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _server = createClient(url, key, { auth: { persistSession: false } });
  return _server;
}
