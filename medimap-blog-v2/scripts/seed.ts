/**
 * Supabase 시드 — env에 Supabase 정보가 있으면 mock-data 내용을 DB에 INSERT.
 * 없으면 dry-run으로 출력만.
 */
import { contentTopics, faqItems, publications } from '../src/lib/mock-data';
import { getServerClient } from '../src/lib/supabase';

async function main() {
  const client = getServerClient();
  if (!client) {
    console.log('[seed] Supabase env 없음 — dry-run');
    console.log('  · faqs:', faqItems.length);
    console.log('  · topics:', contentTopics.length);
    console.log('  · publications:', publications.length);
    return;
  }
  // 운영시: upsert (id 기준)
  const { error: faqErr } = await client.from('faqs').upsert(faqItems);
  if (faqErr) console.error('[seed] faqs error:', faqErr.message);
  const { error: pubErr } = await client.from('publications').upsert(publications);
  if (pubErr) console.error('[seed] publications error:', pubErr.message);
  console.log('[seed] done');
}

main();
