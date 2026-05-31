/**
 * Round 55 (2026-05-31) — 카드 grid → table 리스트 (스케일).
 *
 * 변경:
 *   - 안내 박스 제거
 *   - 카드 grid → table dense 리스트 (클라이언트 50+ 까지 스케일)
 *   - 그룹 separator: 자사 → 발송 가능 → 이메일 미등록
 *   - 검색 + 정렬 + sticky header
 *   - 모바일: 표 가로 스크롤 + min-w
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarClock, Download, Loader2, Mail, MailX, Search, Send } from 'lucide-react';
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
}

type SortKey = 'send_day' | 'name' | 'publish';

export default function ReportsListPage() {
  const [tenants, setTenants] = useState<SbTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | number | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('send_day');
  const [search, setSearch] = useState('');
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

  const isSelf = (t: SbTenant) => t.partner_slug === 'medimap' || t.name.startsWith('메디맵');

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

  const eligible = sortedClients.filter((t) => t.email);
  const noEmail = sortedClients.filter((t) => !t.email);
  const eligibleCount = clientTenants.filter((t) => t.email).length;

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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="sticky top-0 z-10 bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left">클라이언트</th>
                  <th className="px-3 py-2.5 text-left">이메일</th>
                  <th className="px-3 py-2.5 text-left">발송일</th>
                  <th className="px-3 py-2.5 text-right">발행</th>
                  <th className="px-3 py-2.5 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {/* 자사 (메디맵) */}
                {selfTenant && (
                  <>
                    <GroupSeparator icon={<Building2 className="h-3 w-3" />} label="자사 (메디맵)" color="text-brand" count={1} />
                    <tr className="border-t border-border bg-brand-50/30 hover:bg-brand-50/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand text-white">
                            <Building2 className="h-3 w-3" />
                          </span>
                          <span className="font-bold text-ink">{selfTenant.name}</span>
                          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9px] font-semibold text-brand">자사</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink-muted">외부 발송 대상 아님</td>
                      <td className="px-3 py-2.5 text-ink-muted">—</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-brand">{selfTenant.publish_count ?? 0}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/admin/reports/${selfTenant.id}`} target="_blank"
                          className="inline-flex items-center gap-1 rounded border border-border bg-surface-base px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-surface-subtle">
                          <Download className="h-3 w-3" /> 미리보기
                        </Link>
                      </td>
                    </tr>
                  </>
                )}

                {/* 발송 가능 */}
                {eligible.length > 0 && (
                  <>
                    <GroupSeparator icon={<Mail className="h-3 w-3" />} label="발송 가능" color="text-status-success" count={eligible.length} />
                    {eligible.map((t) => {
                      const { dday, isToday } = calcDday(t.report_send_day);
                      return (
                        <tr
                          key={String(t.id)}
                          className={cn(
                            'border-t border-border transition hover:bg-surface-subtle/60',
                            isToday && 'bg-status-successSoft/15'
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {isToday && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success animate-pulse" />}
                              <span className="font-semibold text-ink">{t.name}</span>
                            </div>
                          </td>
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
                  </>
                )}

                {/* 이메일 미등록 */}
                {noEmail.length > 0 && (
                  <>
                    <GroupSeparator icon={<MailX className="h-3 w-3" />} label="이메일 미등록" color="text-status-warning" count={noEmail.length} />
                    {noEmail.map((t) => (
                      <tr key={String(t.id)} className="border-t border-border bg-status-warningSoft/10">
                        <td className="px-4 py-2.5 text-ink">{t.name}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] text-status-warning">미등록</span>
                        </td>
                        <td className="px-3 py-2.5 text-ink-muted">
                          <span className="text-[10px]">매월 {t.report_send_day ?? 1}일 (이메일 등록 시 발송)</span>
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
                  </>
                )}

                {/* 검색 결과 없음 */}
                {search && eligible.length === 0 && noEmail.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-muted">
                      "{search}" 검색 결과 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* 표 하단 요약 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-subtle px-4 py-2 text-[10px] text-ink-muted">
            <span>
              총 {tenants.length}개 · 발송 가능 {clientTenants.filter((t) => t.email).length}개 · 미등록 {clientTenants.filter((t) => !t.email).length}개
            </span>
            <span>매일 18시 KST 자동 발송</span>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupSeparator({
  icon, label, color, count
}: {
  icon: React.ReactNode; label: string; color: string; count: number;
}) {
  return (
    <tr className="border-t border-border bg-surface-soft/60">
      <td colSpan={5} className="px-4 py-1.5">
        <div className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', color)}>
          {icon}
          <span>{label}</span>
          <span className="rounded bg-surface-base px-1.5 py-0 text-ink-muted">{count}</span>
        </div>
      </td>
    </tr>
  );
}
