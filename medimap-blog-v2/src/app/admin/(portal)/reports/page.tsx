/**
 * Round 56 (2026-05-31) — 17년차 디자이너 위계 개선.
 *
 * 변경:
 *   - 위서클 행의 brand 그라데이션 아이콘 제거 (자사 라벨로 충분)
 *   - 3개 그룹 (자사 / 발송 가능 / 이메일 미등록) 을 각 별도 card + 좌측 color stripe 로 분리
 *   - 각 그룹 헤더에 진료항목 필터 chip (전체/안과/모발이식/피부과/...)
 *   - 그룹 헤더 폰트/여백 강화, 그룹 간 간격 확대
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Download, Loader2, Mail, MailX, Search, Send } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface SbTenant {
  id: number | string;
  name: string;
  phone: string | null;
  email: string | null;
  publish_count: number | null;
  partner_slug: string | null;
  report_send_day: number | null;
  status?: string | null;
  domain_category: string | null;
}

type SortKey = 'send_day' | 'name' | 'publish';

const CATEGORY_OPTIONS = ['전체', '안과', '피부과', '성형외과', '치과', '내과', '모발이식', '한방', '기타'] as const;
type CategoryFilter = (typeof CATEGORY_OPTIONS)[number];

export default function ReportsListPage() {
  const [tenants, setTenants] = useState<SbTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | number | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('send_day');
  const [search, setSearch] = useState('');
  const [eligibleFilter, setEligibleFilter] = useState<CategoryFilter>('전체');
  const [noEmailFilter, setNoEmailFilter] = useState<CategoryFilter>('전체');
  const period = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
  const today = new Date();
  const todayDay = today.getDate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setTenants(data.tenants ?? []);
    } catch (e) {
      showToast(`목록 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const sendEmail = async (tenantId: SbTenant['id']) => {
    setSending(tenantId);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, period })
      });
      const data = await res.json();
      if (data.stub) {
        showToast('RESEND_API_KEY 미설정 — 보고서 URL 만 생성됨', { kind: 'info', ms: 3500 });
      } else if (data.ok) {
        showToast(`${data.to} 로 보고서 이메일 발송됨`);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setSending(null);
    }
  };

  const sendBulk = async () => {
    if (!confirm(`이메일 등록된 클라이언트 ${eligibleCount}명 모두에게 지금 즉시 보고서를 발송하시겠습니까?\n(발송일 무관, force=true)`)) return;
    setBulkSending(true);
    try {
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, force: true, period })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`발송 완료 — 성공 ${data.sent} / 실패 ${data.failed} / 전체 ${data.total}`, { kind: 'success', ms: 5000 });
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(`일괄 발송 오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setBulkSending(false);
    }
  };

  const isSelf = (t: SbTenant) => t.partner_slug === 'medimap' || t.partner_slug === 'medimap-self' || t.name.startsWith('위서클');

  const selfTenant = tenants.find(isSelf);
  const clientTenants = tenants.filter((t) => !isSelf(t));

  // 검색 필터
  const filtered = useMemo(() => {
    if (!search.trim()) return clientTenants;
    const q = search.trim().toLowerCase();
    return clientTenants.filter((t) =>
      t.name.toLowerCase().includes(q) || (t.email ?? '').toLowerCase().includes(q)
    );
  }, [clientTenants, search]);

  const sortedClients = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortKey === 'publish') return (b.publish_count ?? 0) - (a.publish_count ?? 0);
      const dayA = a.report_send_day ?? 1;
      const dayB = b.report_send_day ?? 1;
      const ddA = dayA >= todayDay ? dayA - todayDay : (28 - todayDay + dayA);
      const ddB = dayB >= todayDay ? dayB - todayDay : (28 - todayDay + dayB);
      return ddA - ddB;
    });
    return arr;
  }, [filtered, sortKey, todayDay]);

  const allEligible = sortedClients.filter((t) => t.email);
  const allNoEmail = sortedClients.filter((t) => !t.email);

  // 진료항목 필터 적용
  const eligible = eligibleFilter === '전체' ? allEligible : allEligible.filter((t) => (t.domain_category ?? '기타') === eligibleFilter);
  const noEmail = noEmailFilter === '전체' ? allNoEmail : allNoEmail.filter((t) => (t.domain_category ?? '기타') === noEmailFilter);

  const eligibleCount = clientTenants.filter((t) => t.email).length;

  // 각 그룹의 활성 진료항목 (필터 chip 노출 결정)
  const eligibleCategories = useMemo(() => {
    const set = new Set<string>();
    allEligible.forEach((t) => set.add(t.domain_category ?? '기타'));
    return CATEGORY_OPTIONS.filter((c) => c === '전체' || set.has(c));
  }, [allEligible]);
  const noEmailCategories = useMemo(() => {
    const set = new Set<string>();
    allNoEmail.forEach((t) => set.add(t.domain_category ?? '기타'));
    return CATEGORY_OPTIONS.filter((c) => c === '전체' || set.has(c));
  }, [allNoEmail]);

  const calcDday = (sendDay: number | null): { dday: number; isToday: boolean } => {
    const d = sendDay ?? 1;
    if (d === todayDay) return { dday: 0, isToday: true };
    if (d > todayDay) return { dday: d - todayDay, isToday: false };
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return { dday: daysInMonth - todayDay + d, isToday: false };
  };

  return (
    <div className="px-4 py-6 md:px-8">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">월간 보고서 — {period}</h1>
          <p className="admin-page-desc">클라이언트별 월간 ROI 보고서를 미리보기·발송합니다. 매일 18시 KST 에 설정된 발송일과 일치하는 클라이언트에게 자동 발송됩니다</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="검색 (이름·이메일)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44 rounded-md border border-border bg-surface-base py-1.5 pl-7 pr-2 text-[11px] focus:border-brand focus:outline-none"
            />
          </div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface-base px-2 py-1.5 text-[11px] font-semibold text-ink-soft"
          >
            <option value="send_day">다음 발송 빠른순</option>
            <option value="name">이름순</option>
            <option value="publish">발행수 많은순</option>
          </select>
          <button
            onClick={sendBulk}
            disabled={bulkSending || eligibleCount === 0}
            className="btn-primary text-xs disabled:opacity-50"
            title={`이메일 등록된 ${eligibleCount}명 즉시 발송 (force)`}
          >
            {bulkSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            전체 즉시 발송 ({eligibleCount})
          </button>
        </div>
      </header>

      {loading && (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      )}

      {!loading && tenants.length === 0 && (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          등록된 클라이언트가 없습니다.
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <div className="space-y-5">
          {/* === 자사 (위서클) === */}
          {selfTenant && (
            <GroupCard
              stripe="bg-brand"
              header={
                <>
                  <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">자사</span>
                  <h2 className="text-sm font-bold text-ink">위서클 (외부 발송 대상 아님)</h2>
                </>
              }
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{selfTenant.name}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">자사 인사이트 발행 — 외부 클라이언트 발송 없음</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-xl font-bold text-brand">{selfTenant.publish_count ?? 0}</div>
                    <div className="text-[9px] uppercase text-ink-muted">발행</div>
                  </div>
                  <Link href={`/admin/reports/${selfTenant.id}`} target="_blank"
                    className="inline-flex items-center gap-1 rounded border border-border bg-surface-base px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-subtle">
                    <Download className="h-3 w-3" /> 미리보기
                  </Link>
                </div>
              </div>
            </GroupCard>
          )}

          {/* === 발송 가능 === */}
          <GroupCard
            stripe="bg-status-success"
            header={
              <>
                <Mail className="h-4 w-4 text-status-success" />
                <h2 className="text-sm font-bold text-ink">발송 가능</h2>
                <span className="rounded-full bg-status-successSoft/40 px-2 py-0.5 text-[10px] font-bold text-status-success">{allEligible.length}</span>
              </>
            }
            filters={
              <CategoryFilterBar
                options={eligibleCategories}
                value={eligibleFilter}
                onChange={setEligibleFilter}
                color="success"
              />
            }
          >
            {eligible.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-ink-muted">
                {eligibleFilter === '전체' ? '이메일 등록된 클라이언트가 없습니다' : `"${eligibleFilter}" 진료항목 클라이언트가 없습니다`}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-xs">
                  <thead className="bg-surface-subtle/60 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">클라이언트</th>
                      <th className="px-3 py-2 text-left">진료항목</th>
                      <th className="px-3 py-2 text-left">이메일</th>
                      <th className="px-3 py-2 text-left">발송일</th>
                      <th className="px-3 py-2 text-right">발행</th>
                      <th className="px-3 py-2 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map((t) => {
                      const { dday, isToday } = calcDday(t.report_send_day);
                      return (
                        <tr key={String(t.id)} className={cn('border-t border-border transition hover:bg-surface-subtle/50', isToday && 'bg-status-successSoft/10')}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {isToday && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success animate-pulse" />}
                              <span className="font-semibold text-ink">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-ink-soft">{t.domain_category ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 rounded bg-status-successSoft/30 px-1.5 py-0.5 font-mono text-[10px] text-status-success">
                              <Mail className="h-2.5 w-2.5" />
                              {t.email}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <CalendarClock className="h-3 w-3 text-ink-muted" />
                              <span className="font-semibold text-ink">{t.report_send_day ?? 1}일</span>
                              {isToday ? (
                                <span className="rounded bg-status-success px-1 py-0.5 text-[9px] font-bold text-white">오늘</span>
                              ) : (
                                <span className="rounded bg-surface-soft px-1 py-0.5 text-[9px] font-semibold text-ink-muted">D-{dday}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink">{t.publish_count ?? 0}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link href={`/admin/reports/${t.id}`} target="_blank"
                                className="inline-flex items-center gap-1 rounded border border-border bg-surface-base px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-surface-subtle">
                                <Download className="h-3 w-3" /> 미리보기
                              </Link>
                              <button
                                onClick={() => sendEmail(t.id)}
                                disabled={sending === t.id}
                                className="inline-flex items-center gap-1 rounded bg-brand px-2 py-1 text-[10px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                              >
                                {sending === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                발송
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GroupCard>

          {/* === 이메일 미등록 === */}
          {allNoEmail.length > 0 && (
            <GroupCard
              stripe="bg-status-warning"
              header={
                <>
                  <MailX className="h-4 w-4 text-status-warning" />
                  <h2 className="text-sm font-bold text-ink">이메일 미등록</h2>
                  <span className="rounded-full bg-status-warningSoft/40 px-2 py-0.5 text-[10px] font-bold text-status-warning">{allNoEmail.length}</span>
                </>
              }
              filters={
                <CategoryFilterBar
                  options={noEmailCategories}
                  value={noEmailFilter}
                  onChange={setNoEmailFilter}
                  color="warning"
                />
              }
            >
              {noEmail.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-ink-muted">
                  "{noEmailFilter}" 진료항목 미등록 클라이언트가 없습니다
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-xs">
                    <thead className="bg-surface-subtle/60 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">클라이언트</th>
                        <th className="px-3 py-2 text-left">진료항목</th>
                        <th className="px-3 py-2 text-left">예정 발송일</th>
                        <th className="px-3 py-2 text-right">발행</th>
                        <th className="px-3 py-2 text-right">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noEmail.map((t) => (
                        <tr key={String(t.id)} className="border-t border-border bg-status-warningSoft/5 hover:bg-status-warningSoft/15">
                          <td className="px-4 py-2.5 font-semibold text-ink">{t.name}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{t.domain_category ?? '—'}</td>
                          <td className="px-3 py-2.5 text-[11px] text-ink-muted">
                            매월 {t.report_send_day ?? 1}일 (이메일 등록 시 발송)
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-ink-muted">{t.publish_count ?? 0}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Link
                              href={`/admin/tenants?edit=${t.id}`}
                              className="inline-flex items-center gap-1 rounded border border-status-warning/40 bg-surface-base px-2 py-1 text-[10px] font-semibold text-status-warning hover:bg-status-warningSoft/30"
                            >
                              이메일 등록
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GroupCard>
          )}

          {/* 하단 요약 */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-ink-muted">
            <span>
              총 {tenants.length}개 · 발송 가능 {allEligible.length}개 · 미등록 {allNoEmail.length}개
            </span>
            <span>매일 18시 KST 자동 발송</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Round 56 — 그룹 카드: 좌측 4px stripe + 헤더 + 필터 + 내용 */
function GroupCard({
  stripe,
  header,
  filters,
  children,
}: {
  stripe: string;
  header: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card relative overflow-hidden">
      {/* 좌측 4px color stripe */}
      <div className={cn('absolute inset-y-0 left-0 w-1', stripe)} />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-soft/40 px-4 py-2.5 pl-5">
        <div className="flex items-center gap-2">{header}</div>
        {filters && <div>{filters}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

/** Round 56 — 진료항목 chip 필터 */
function CategoryFilterBar({
  options, value, onChange, color,
}: {
  options: readonly string[]; value: string; onChange: (v: CategoryFilter) => void; color: 'success' | 'warning';
}) {
  const activeCls = color === 'success'
    ? 'bg-status-success text-white border-status-success'
    : 'bg-status-warning text-white border-status-warning';
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt as CategoryFilter)}
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold transition',
            value === opt
              ? activeCls
              : 'border-border bg-surface-base text-ink-soft hover:bg-surface-subtle'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
