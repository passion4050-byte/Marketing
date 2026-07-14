'use client';

/**
 * 해외 전용 관리 화면 (Round 143) — 국내 /with-partners IA 를 어드민에서 미러.
 *   두 축으로 해외 콘텐츠를 관리:
 *     ① 블로그(테마) — K-뷰티의 우수성 / K-의료의 우수성 / K-의료·뷰티 이용 꿀팁 (비파트너)
 *     ② 병원(진료과) — 진료과 → 병원 → 콘텐츠 (파트너)
 *   언어 스코프(EN/JA/ZH) 탭. 데이터는 기존 /api/admin/content-queue(market=overseas) 재사용.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2, Layers, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Item {
  id: number | string;
  tenant_id: number;
  tenant_name: string;
  partner_slug: string | null;
  title: string | null;
  slug: string | null;
  status: string;
  is_partner_content: boolean;
  partner_category: string | null;
  blog_category: string | null;
  lang: string | null;
  market: string | null;
  live_url: string | null;
  published_at: string | null;
}

const LANGS: { key: string; db: string; label: string; flag: string }[] = [
  { key: 'all', db: '', label: '전체', flag: '🌏' },
  { key: 'en', db: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'ja', db: 'ja', label: '日本語', flag: '🇯🇵' },
  { key: 'zh', db: 'zh-Hans', label: '中文', flag: '🇨🇳' },
];

const BLOG_CATS: { slug: string; label: string; desc: string }[] = [
  { slug: 'k_beauty', label: 'K-뷰티의 우수성', desc: '미용·피부 시술의 우수성' },
  { slug: 'k_medical', label: 'K-의료의 우수성', desc: '안과·치과·내과 등 의료' },
  { slug: 'k_tips', label: 'K-의료·뷰티 이용 꿀팁', desc: '병원 선택·비용·예약·방문' },
];

const SPECIALTY_KO: Record<string, string> = {
  derma: '피부과',
  eyeclinic: '안과',
  plastic: '성형외과',
  dental: '치과',
  internal: '내과',
  hair: '모발이식',
  oriental: '한방',
};

function StatusBadge({ status }: { status: string }) {
  const published = status === 'published';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold',
        published ? 'bg-status-successSoft text-status-success' : 'bg-status-warningSoft text-status-warning'
      )}
    >
      {published ? '발행' : '초안'}
    </span>
  );
}

function ItemRow({ it }: { it: Item }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-2 last:border-b-0">
      <StatusBadge status={it.status} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink" title={it.title ?? ''}>
        {it.title || it.slug || `#${it.id}`}
      </span>
      {it.live_url && it.status === 'published' && (
        <a
          href={it.live_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-ink-soft hover:text-brand"
          title="라이브 보기"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

export default function OverseasAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [langKey, setLangKey] = useState('all');
  const [view, setView] = useState<'blog' | 'clinic'>('blog');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const langDb = LANGS.find((l) => l.key === langKey)?.db ?? '';
      const lq = langDb ? `&lang=${encodeURIComponent(langDb)}` : '';
      const fetchOne = async (status: string) => {
        const r = await fetch(`/api/admin/content-queue?status=${status}&market=overseas${lq}`, { cache: 'no-store' });
        const d = await r.json();
        return (d.ok ? (d.items ?? []) : []) as Item[];
      };
      const [pub, pend] = await Promise.all([fetchOne('published'), fetchOne('pending')]);
      setItems([...pub, ...pend]);
    } finally {
      setLoading(false);
    }
  }, [langKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const blogItems = useMemo(() => items.filter((i) => !i.is_partner_content), [items]);
  const clinicItems = useMemo(() => items.filter((i) => i.is_partner_content), [items]);

  // 병원(진료과 → 병원 → 콘텐츠)
  const bySpecialty = useMemo(() => {
    const m = new Map<string, Map<string, { name: string; items: Item[] }>>();
    for (const it of clinicItems) {
      const spec = it.partner_category ?? 'etc';
      const clinicKey = it.partner_slug ?? it.tenant_name;
      if (!m.has(spec)) m.set(spec, new Map());
      const cm = m.get(spec)!;
      if (!cm.has(clinicKey)) cm.set(clinicKey, { name: it.tenant_name, items: [] });
      cm.get(clinicKey)!.items.push(it);
    }
    return m;
  }, [clinicItems]);

  const totalPub = items.filter((i) => i.status === 'published').length;
  const totalDraft = items.filter((i) => i.status !== 'published').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-ink">
          <Globe size={20} className="text-brand" />
          <h1 className="text-xl font-black">해외 관리</h1>
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">
          해외(EN·JA·ZH) 콘텐츠를 국내 with-partners 처럼 관리합니다. 블로그는 테마별, 병원은 진료과 → 병원 → 콘텐츠.
          발행 {totalPub} · 초안 {totalDraft}
        </p>
      </header>

      {/* 언어 탭 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {LANGS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLangKey(l.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
              langKey === l.key
                ? 'border-brand bg-brand text-white'
                : 'border-border bg-surface text-ink-soft hover:border-brand'
            )}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>

      {/* 뷰 토글 */}
      <div className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1">
        <button
          onClick={() => setView('blog')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition',
            view === 'blog' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
          )}
        >
          <Layers size={14} /> 블로그 (테마)
        </button>
        <button
          onClick={() => setView('clinic')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition',
            view === 'clinic' ? 'bg-brand text-white' : 'text-ink-soft hover:text-ink'
          )}
        >
          <Stethoscope size={14} /> 병원 (진료과)
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-ink-soft">
          <Loader2 size={18} className="animate-spin" /> 불러오는 중…
        </div>
      ) : view === 'blog' ? (
        <div className="grid gap-4 md:grid-cols-3">
          {BLOG_CATS.map((cat) => {
            const list = blogItems.filter((i) => i.blog_category === cat.slug);
            return (
              <section key={cat.slug} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-[14px] font-bold text-ink">{cat.label}</h2>
                  <span className="text-[11px] tabular-nums text-ink-soft">{list.length}</span>
                </div>
                <p className="mb-3 text-[11px] text-ink-soft">{cat.desc}</p>
                {list.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-ink-soft">—</p>
                ) : (
                  list.map((it) => <ItemRow key={it.id} it={it} />)
                )}
              </section>
            );
          })}
          {/* 미분류 */}
          {blogItems.some((i) => !i.blog_category) && (
            <section className="rounded-xl border border-dashed border-border bg-surface p-4">
              <h2 className="mb-2 text-[14px] font-bold text-ink-soft">미분류</h2>
              {blogItems.filter((i) => !i.blog_category).map((it) => <ItemRow key={it.id} it={it} />)}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {bySpecialty.size === 0 ? (
            <p className="py-16 text-center text-[13px] text-ink-soft">해외 파트너 병원 콘텐츠가 아직 없습니다.</p>
          ) : (
            Array.from(bySpecialty.entries()).map(([spec, clinics]) => (
              <section key={spec} className="rounded-xl border border-border bg-surface p-4">
                <h2 className="mb-3 text-[14px] font-bold text-ink">
                  {SPECIALTY_KO[spec] ?? spec}
                  <span className="ml-2 text-[11px] font-normal text-ink-soft">
                    병원 {clinics.size}
                  </span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from(clinics.entries()).map(([ckey, c]) => (
                    <div key={ckey} className="rounded-lg border border-border/70 bg-surface-muted/40 p-3">
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[13px] font-bold text-ink">{c.name}</span>
                        <span className="text-[11px] tabular-nums text-ink-soft">{c.items.length} 글</span>
                      </div>
                      {c.items.map((it) => <ItemRow key={it.id} it={it} />)}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <div className="mt-6 text-[12px] text-ink-soft">
        전체 목록·검수·편집은{' '}
        <Link href="/admin/content-queue" className="font-semibold text-brand hover:underline">
          콘텐츠 관리
        </Link>{' '}
        에서 (해외 필터 지원).
      </div>
    </div>
  );
}
