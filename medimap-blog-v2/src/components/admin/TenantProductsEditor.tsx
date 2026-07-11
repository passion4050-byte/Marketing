'use client';

/**
 * TenantProductsEditor — 클라이언트(병원)별 상품(서비스) 신청·관리.
 *
 * tenant_products(테넌트×market×lang) SoT CRUD. 편집 모달에 임베드.
 * 국내(ko) / 해외(en·ja·zh-Hant) 언어별 상품을 추가·상태변경(활성/일시정지)·해지.
 * 이 상품이 측정·대시보드 언어스코프·자동발행의 구동 단위가 됨(§6.5).
 */
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Pause, Play, Loader2, Layers } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

interface Product {
  id: number;
  tenant_id: number;
  market: string;
  lang: string;
  status: 'active' | 'paused' | 'churned';
  plan: string | null;
  monthly_cost: number | null;
  started_at: string | null;
}

const OVERSEAS_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-Hant', label: '中文 (번체·대만·홍콩)' },
];

function langLabel(lang: string): string {
  if (lang === 'ko') return '한국어';
  return OVERSEAS_LANGS.find((l) => l.code === lang)?.label ?? lang;
}
function productLabel(p: Product): string {
  return p.market === 'domestic' ? '🇰🇷 국내 · 한국어' : `🌏 해외 · ${langLabel(p.lang)}`;
}

const STATUS_META: Record<Product['status'], { label: string; cls: string }> = {
  active: { label: '활성', cls: 'bg-status-successSoft text-status-success' },
  paused: { label: '일시정지', cls: 'bg-surface-muted text-ink-soft' },
  churned: { label: '해지', cls: 'bg-status-dangerSoft text-status-danger' },
};

export function TenantProductsEditor({ tenantId }: { tenantId?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  // 신규 상품 폼
  const [market, setMarket] = useState<'domestic' | 'overseas'>('overseas');
  const [lang, setLang] = useState<string>('en');
  const [plan, setPlan] = useState('');
  const [cost, setCost] = useState('');

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/tenant-products?tenant=${tenantId}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? '로드 실패');
      setProducts(j.products ?? []);
    } catch (e) {
      showToast(`상품 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  // market 바뀌면 lang 기본값 보정
  useEffect(() => {
    setLang(market === 'domestic' ? 'ko' : 'en');
  }, [market]);

  const add = async () => {
    if (!tenantId) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/tenant-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          market,
          lang,
          plan: plan || null,
          monthly_cost: cost || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? '추가 실패');
      showToast('상품 추가됨', { kind: 'success' });
      setPlan('');
      setCost('');
      await load();
    } catch (e) {
      showToast(`${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: number, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/tenant-products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? '수정 실패');
      await load();
    } catch (e) {
      showToast(`${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('이 상품을 삭제할까요? (측정·발행 연동이 해제됩니다)')) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/tenant-products/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? '삭제 실패');
      showToast('삭제됨', { kind: 'success' });
      await load();
    } catch (e) {
      showToast(`${(e as Error).message}`, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-subtle px-4 py-3 text-[12px] text-ink-muted">
        상품(서비스)은 클라이언트를 먼저 저장한 뒤 추가할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-subtle/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
        <Layers className="h-3.5 w-3.5 text-ink-soft" />
        신청 상품(서비스) — 국내 / 해외 언어별
        {loading && <Loader2 className="h-3 w-3 animate-spin text-ink-muted" />}
      </div>

      {/* 상품 목록 */}
      {products.length === 0 ? (
        <div className="px-1 py-2 text-[11px] text-ink-muted">아직 신청된 상품이 없습니다.</div>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {products.map((p) => {
            const sm = STATUS_META[p.status] ?? STATUS_META.active;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-base px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">{productLabel(p)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sm.cls}`}>
                    {sm.label}
                  </span>
                  {p.plan && (
                    <span className="text-[11px] text-ink-muted">플랜 {p.plan}</span>
                  )}
                  {p.monthly_cost != null && (
                    <span className="text-[11px] text-ink-muted">
                      ₩{Number(p.monthly_cost).toLocaleString()}/월
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {p.status === 'active' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(p.id, { status: 'paused' })}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold text-ink-soft transition hover:bg-surface-muted disabled:opacity-50"
                      title="일시정지 (측정·발행 중단)"
                    >
                      <Pause className="h-3 w-3" /> 정지
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(p.id, { status: 'active' })}
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold text-status-success transition hover:bg-status-successSoft disabled:opacity-50"
                      title="활성화 (측정·발행 재개)"
                    >
                      <Play className="h-3 w-3" /> 활성
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(p.id)}
                    className="inline-flex items-center rounded border border-border px-2 py-1 text-[10px] font-semibold text-status-danger transition hover:bg-status-dangerSoft disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 신규 상품 추가 폼 */}
      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2.5">
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          시장
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as 'domestic' | 'overseas')}
            className="h-8 rounded-md border border-border bg-surface-base px-2 text-xs text-ink"
          >
            <option value="domestic">🇰🇷 국내</option>
            <option value="overseas">🌏 해외</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          언어
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={market === 'domestic'}
            className="h-8 rounded-md border border-border bg-surface-base px-2 text-xs text-ink disabled:opacity-60"
          >
            {market === 'domestic' ? (
              <option value="ko">한국어</option>
            ) : (
              OVERSEAS_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          플랜
          <input
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="A / B …"
            className="h-8 w-20 rounded-md border border-border bg-surface-base px-2 text-xs text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          월비용(₩)
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            inputMode="numeric"
            placeholder="500000"
            className="h-8 w-24 rounded-md border border-border bg-surface-base px-2 text-xs text-ink"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void add()}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-accent-deep px-3 text-xs font-bold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          상품 추가
        </button>
      </div>
    </div>
  );
}
