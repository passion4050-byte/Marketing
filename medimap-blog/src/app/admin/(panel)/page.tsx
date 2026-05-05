import Link from "next/link";
import {
  MessageSquare,
  Building2,
  Briefcase,
  Mail,
  ChevronRight,
  Database,
} from "lucide-react";
import { getInquiryStats, listInquiries } from "@/lib/inquiries";
import { KpiCard } from "@/components/admin/KpiCard";
import { Sparkline } from "@/components/admin/Sparkline";
import { DonutBreakdown } from "@/components/admin/DonutBreakdown";
import {
  FormTypePill,
  StatusPill,
  formTypeLabel,
  statusLabel,
} from "@/components/admin/StatusPill";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    getInquiryStats(),
    listInquiries({ limit: 8 }),
  ]);

  const formSegments = [
    {
      label: formTypeLabel.partnership,
      value: stats.byFormType.partnership,
      color: "#FF4D5E",
    },
    {
      label: formTypeLabel.listing,
      value: stats.byFormType.listing,
      color: "#FF6B35",
    },
    {
      label: formTypeLabel.contact,
      value: stats.byFormType.contact,
      color: "#4F5DF8",
    },
  ];
  const statusSegments = [
    { label: statusLabel.new, value: stats.byStatus.new, color: "#15CBA8" },
    {
      label: statusLabel.in_progress,
      value: stats.byStatus.in_progress,
      color: "#F59E0B",
    },
    {
      label: statusLabel.replied,
      value: stats.byStatus.replied,
      color: "#4F5DF8",
    },
    {
      label: statusLabel.archived,
      value: stats.byStatus.archived,
      color: "#9CA3AF",
    },
  ];

  const dbConnected = stats.total > 0 || recent.rows.length > 0 || stats.daily.length > 0;
  // total=0 인데 DATABASE_URL 자체가 없다면 stats 가 빈 상태로 옴 — 안내 배너 노출.
  const showDbBanner = !dbConnected && stats.total === 0;

  return (
    <div className="space-y-6">
      {showDbBanner && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">
            <div className="font-semibold">
              DATABASE_URL 미설정 또는 medimap_inquiries 테이블 없음
            </div>
            <p className="mt-1 text-amber-700/90">
              Vercel 환경변수에{" "}
              <code className="rounded bg-white/70 px-1 font-mono">DATABASE_URL</code>{" "}
              을 설정하고 Supabase 콘솔에서{" "}
              <code className="rounded bg-white/70 px-1 font-mono">
                db/migrations/001_medimap_inquiries.sql
              </code>{" "}
              을 실행해주세요.
            </p>
          </div>
        </div>
      )}

      {/* KPI 4개 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="전체 문의"
          value={stats.total}
          unit="건"
          icon={<MessageSquare size={16} />}
          tone="brand"
        />
        <KpiCard
          label="이번 주 신규"
          value={stats.thisWeek}
          unit="건"
          delta={
            stats.thisWeek > 0
              ? { value: "최근 7일", positive: true }
              : { value: "최근 7일", positive: false }
          }
          icon={<MessageSquare size={16} />}
          tone="accent"
        />
        <KpiCard
          label="비즈니스 제휴"
          value={stats.byFormType.partnership}
          unit="건"
          icon={<Briefcase size={16} />}
          tone="indigo"
        />
        <KpiCard
          label="병원 입점"
          value={stats.byFormType.listing}
          unit="건"
          icon={<Building2 size={16} />}
          tone="mint"
        />
      </div>

      {/* 도넛 — 폼 분포 + 상태 분포 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-[15px] font-bold text-ink">문의 종류 분포</h3>
          <p className="mt-0.5 text-[12px] text-ink-subtle">
            /about · /contact 폼별 누적 카운트
          </p>
          <div className="mt-5">
            <DonutBreakdown
              segments={formSegments}
              centerLabel={String(stats.total)}
              centerSub="누적"
            />
          </div>
        </div>
        <div className="rounded-card bg-white p-6 shadow-card">
          <h3 className="text-[15px] font-bold text-ink">처리 상태 분포</h3>
          <p className="mt-0.5 text-[12px] text-ink-subtle">
            라이프사이클 — new → in_progress → replied → archived
          </p>
          <div className="mt-5">
            <DonutBreakdown
              segments={statusSegments}
              centerLabel={String(stats.byStatus.new)}
              centerSub="신규"
            />
          </div>
        </div>
      </div>

      {/* 일별 시계열 (최근 30일) */}
      <div className="rounded-card bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-ink">
              일별 문의 접수 추이
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-subtle">
              최근 30일 — 일자별 누적 폼 제출 건수
            </p>
          </div>
          <span className="rounded-pill bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            {stats.daily.length}일치 데이터
          </span>
        </div>
        <div className="mt-4">
          <Sparkline
            data={stats.daily}
            label="일별 문의 접수 — 데이터 누적 시 라인 차트로 표시"
          />
        </div>
      </div>

      {/* 최근 문의 8건 */}
      <div className="rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
          <h3 className="text-[15px] font-bold text-ink">최근 문의</h3>
          <Link
            href="/admin/inquiries"
            className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold text-brand hover:underline"
          >
            전체 보기 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line/70 bg-surface-alt/50 text-[11.5px] font-semibold text-ink-subtle">
                <th className="px-6 py-3 text-left">접수 시각</th>
                <th className="px-3 py-3 text-left">종류</th>
                <th className="px-3 py-3 text-left">기관/병원</th>
                <th className="px-3 py-3 text-left">담당자</th>
                <th className="px-3 py-3 text-left">상태</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {recent.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-[13px] text-ink-subtle"
                  >
                    <Mail
                      className="mx-auto mb-2 text-ink-subtle/60"
                      size={32}
                    />
                    아직 접수된 문의가 없습니다.
                  </td>
                </tr>
              )}
              {recent.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line/40 transition hover:bg-surface-alt/40"
                >
                  <td className="px-6 py-3 text-ink-muted">
                    {formatKstRelative(row.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <FormTypePill type={row.form_type} />
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink">
                    {row.org_name}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    {row.contact_name}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/admin/inquiries/${row.id}`}
                      className="inline-flex items-center gap-0.5 rounded-pill bg-surface-alt px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:bg-brand/10 hover:text-brand"
                    >
                      상세 <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
