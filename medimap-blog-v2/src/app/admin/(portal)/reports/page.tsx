/**
 * Round 53 (2026-05-31) — 월간 보고서 list 페이지 완전 재디자인.
 *
 * 변경:
 *   - MockBanner 제거 (실제로는 라이브 데이터 — tenants list/email 다 실연동)
 *   - 자사(메디맵, status=NULL 또는 name 시작="메디맵") 별도 섹션으로 분리
 *   - 발송 가능 / 이메일 미등록 두 그룹 시각 분리
 *   - 카드 정보 밀도 향상 — 발행수 큰 숫자, 발송일 chip, 다음 발송까지 D-day, 이메일 chip
 *   - 정렬 옵션 (이름/발송일/발행수)
 *   - 일괄 발송 버튼 (force=true 로 모든 tenant 즉시 발송)
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarClock, Download, FileText, Loader2, Mail, MailX, Send, Sparkles } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

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

type SortKey = 'name' | 'send_day' | 'publish';

export default function ReportsListPage() {
  const [tenants, setTenants] = useState<SbTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | number | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('send_day');
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

  // 자사(메디맵) 분리 — partner_slug 가 'medimap' 또는 name 이 '메디맵' 으로 시작
  const isSelf = (t: SbTenant) => t.partner_slug === 'medimap' || t.name.startsWith('메디맵');

  const selfTenant = tenants.find(isSelf);
  const clientTenants = tenants.filter((t) => !isSelf(t));

  const sortedClients = useMemo(() => {
    const arr = [...clientTenants];
    arr.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortKey === 'publish') return (b.publish_count ?? 0) - (a.publish_count ?? 0);
      // send_day — 다음 발송 빠른 순 (오늘 기준 D-day 계산)
      const dayA = a.report_send_day ?? 1;
      const dayB = b.report_send_day ?? 1;
      const ddA = dayA >= todayDay ? dayA - todayDay : (28 - todayDay + dayA);
      const ddB = dayB >= todayDay ? dayB - todayDay : (28 - todayDay + dayB);
      return ddA - ddB;
    });
    return arr;
  }, [clientTenants, sortKey, todayDay]);

  const eligible = sortedClients.filter((t) => t.email);
  const noEmail = sortedClients.filter((t) => !t.email);
  const eligibleCount = eligible.length;

  // 다음 발송까지 D-day 계산
  const calcDday = (sendDay: number | null): { dday: number; isToday: boolean } => {
    const d = sendDay ?? 1;
    if (d === todayDay) return { dday: 0, isToday: true };
    if (d > todayDay) return { dday: d - todayDay, isToday: false };
    // 이번 달 발송일 지남 → 다음 달 같은 날
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
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface-base px-2 py-1.5 text-[12px] font-semibold text-ink-soft"
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

      {/* Round 53 — 실데이터 안내 (Mock 경고 제거) */}
      <div className="mb-5 rounded-lg border border-brand/20 bg-brand-50/30 px-4 py-3 text-[11px] text-ink-soft">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          <div className="leading-relaxed">
            <strong className="text-brand-700">실데이터 연동 완료</strong> — 클라이언트 list · 이메일 · 발행수 · 발송일 모두 라이브 DB.
            보고서 본문 (인용 / 키워드 / 경쟁사 / 발행 콘텐츠 효과) 도 라이브.
            매일 18시 KST 에 GitHub Actions cron 이 발송일 일치 tenant 만 자동 발송. 발송일은 클라이언트 편집 modal 에서 변경 가능.
          </div>
        </div>
      </div>

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
        <div className="space-y-6">
          {/* 자사 (메디맵) — 별도 섹션 */}
          {selfTenant && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-brand" />
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-brand">자사 (메디맵)</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand-50/60 to-brand-50/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">{selfTenant.name}</h3>
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        자사 인사이트 발행 · 외부 발송 대상 아님
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-2xl font-bold text-brand">{selfTenant.publish_count ?? 0}</div>
                      <div className="text-[9px] uppercase text-ink-muted">발행</div>
                    </div>
                    <Link href={`/admin/reports/${selfTenant.id}`} target="_blank" className="btn-secondary text-xs">
                      <Download className="h-3.5 w-3.5" /> 미리보기
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 발송 가능 클라이언트 */}
          {eligible.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-status-success" />
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-status-success">
                  발송 가능 ({eligible.length})
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {eligible.map((t) => {
                  const { dday, isToday } = calcDday(t.report_send_day);
                  return (
                    <div
                      key={String(t.id)}
                      className={`group relative overflow-hidden rounded-xl border bg-surface-base p-4 transition hover:border-brand/30 hover:shadow-md ${
                        isToday ? 'border-status-success/40 bg-status-successSoft/10' : 'border-border'
                      }`}
                    >
                      {/* 좌측 색띠 (오늘 발송일 강조) */}
                      {isToday && (
                        <div className="absolute inset-y-0 left-0 w-1 bg-status-success" />
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* 이름 + 발송일 chip */}
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-brand-700" />
                            <h3 className="truncate text-sm font-bold text-ink">{t.name}</h3>
                          </div>

                          {/* 이메일 chip */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="inline-flex items-center gap-0.5 rounded bg-status-successSoft/40 px-1.5 py-0.5 font-mono text-status-success">
                              <Mail className="h-2.5 w-2.5" />
                              {t.email}
                            </span>
                          </div>

                          {/* 발송일 + D-day */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <div className="flex items-center gap-1 text-ink-soft">
                              <CalendarClock className="h-3 w-3" />
                              매월 <strong className="text-ink">{t.report_send_day ?? 1}일</strong> 발송
                            </div>
                            {isToday ? (
                              <span className="rounded bg-status-success px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
                                오늘 발송
                              </span>
                            ) : (
                              <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                                D-{dday}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 우측 — 발행수 큰 숫자 */}
                        <div className="text-right">
                          <div className="font-mono text-2xl font-bold text-ink">{t.publish_count ?? 0}</div>
                          <div className="text-[9px] uppercase text-ink-muted">발행</div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/admin/reports/${t.id}`}
                          target="_blank"
                          className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-surface-base py-1.5 text-[11px] font-semibold text-ink-soft transition hover:bg-surface-subtle"
                        >
                          <Download className="h-3 w-3" /> 미리보기
                        </Link>
                        <button
                          onClick={() => sendEmail(t.id)}
                          disabled={sending === t.id}
                          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-brand py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                        >
                          {sending === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          지금 발송
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 이메일 미등록 클라이언트 */}
          {noEmail.length > 0 && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <MailX className="h-3.5 w-3.5 text-status-warning" />
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-status-warning">
                  이메일 미등록 ({noEmail.length})
                </h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {noEmail.map((t) => (
                  <div
                    key={String(t.id)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-status-warning/30 bg-status-warningSoft/10 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                        <h3 className="truncate text-[12px] font-semibold text-ink">{t.name}</h3>
                      </div>
                      <div className="mt-0.5 text-[10px] text-status-warning">
                        클라이언트 편집에서 이메일 입력 필요
                      </div>
                    </div>
                    <Link
                      href={`/admin/tenants?edit=${t.id}`}
                      className="shrink-0 rounded border border-status-warning/40 bg-surface-base px-2 py-1 text-[10px] font-semibold text-status-warning hover:bg-status-warningSoft/30"
                    >
                      편집
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
