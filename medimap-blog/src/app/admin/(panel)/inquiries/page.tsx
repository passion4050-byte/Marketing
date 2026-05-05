import Link from "next/link";
import { ChevronRight, Search, Filter, Inbox } from "lucide-react";
import {
  isInquiryFormType,
  isInquiryStatus,
  listInquiries,
  type InquiryFormType,
  type InquiryStatus,
} from "@/lib/inquiries";
import {
  FormTypePill,
  StatusPill,
  formTypeLabel,
  statusLabel,
} from "@/components/admin/StatusPill";
import { formatKstDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminInquiriesList({
  searchParams,
}: {
  searchParams?: { type?: string; status?: string; q?: string; page?: string };
}) {
  const form_type = isInquiryFormType(searchParams?.type)
    ? (searchParams!.type as InquiryFormType)
    : undefined;
  const status = isInquiryStatus(searchParams?.status)
    ? (searchParams!.status as InquiryStatus)
    : undefined;
  const search = searchParams?.q?.trim() || undefined;
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { rows, total } = await listInquiries({
    form_type,
    status,
    search,
    limit: PAGE_SIZE,
    offset,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(patch: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const cur = { type: form_type, status, q: search, page: String(page), ...patch };
    for (const [k, v] of Object.entries(cur)) {
      if (v) params.set(k, v);
    }
    const s = params.toString();
    return `/admin/inquiries${s ? `?${s}` : ""}`;
  }

  return (
    <div className="space-y-5">
      {/* 필터 영역 */}
      <form
        action="/admin/inquiries"
        method="get"
        className="flex flex-wrap items-center gap-3 rounded-card bg-white p-4 shadow-card"
      >
        <div className="relative flex-1 min-w-[260px]">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="text"
            name="q"
            defaultValue={search ?? ""}
            placeholder="기관/병원, 담당자, 메시지 검색…"
            className="form-input pl-9"
          />
        </div>
        <select
          name="type"
          defaultValue={form_type ?? ""}
          className="form-input w-[160px]"
        >
          <option value="">전체 종류</option>
          <option value="partnership">{formTypeLabel.partnership}</option>
          <option value="listing">{formTypeLabel.listing}</option>
          <option value="contact">{formTypeLabel.contact}</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="form-input w-[140px]"
        >
          <option value="">전체 상태</option>
          <option value="new">{statusLabel.new}</option>
          <option value="in_progress">{statusLabel.in_progress}</option>
          <option value="replied">{statusLabel.replied}</option>
          <option value="archived">{statusLabel.archived}</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-pill bg-brand px-5 py-2.5 text-[13px] font-bold text-white shadow-cta hover:-translate-y-0.5 hover:shadow-glow transition"
        >
          <Filter size={14} /> 적용
        </button>
        {(form_type || status || search) && (
          <Link
            href="/admin/inquiries"
            className="text-[12.5px] font-semibold text-ink-subtle hover:text-brand"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 결과 표 */}
      <div className="rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
          <h3 className="text-[15px] font-bold text-ink">
            전체 {total.toLocaleString("ko-KR")} 건
          </h3>
          <span className="text-[11.5px] font-semibold text-ink-subtle">
            {page} / {totalPages} 페이지
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line/70 bg-surface-alt/50 text-[11.5px] font-semibold text-ink-subtle">
                <th className="px-6 py-3 text-left">접수 일시</th>
                <th className="px-3 py-3 text-left">종류</th>
                <th className="px-3 py-3 text-left">기관/병원</th>
                <th className="px-3 py-3 text-left">담당자</th>
                <th className="px-3 py-3 text-left">연락처</th>
                <th className="px-3 py-3 text-left">상태</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-[13px] text-ink-subtle"
                  >
                    <Inbox className="mx-auto mb-2 text-ink-subtle/60" size={32} />
                    조건에 맞는 문의가 없습니다.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line/40 transition hover:bg-surface-alt/40"
                >
                  <td className="px-6 py-3 text-ink-muted num">
                    {formatKstDateTime(row.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    <FormTypePill type={row.form_type} />
                  </td>
                  <td className="px-3 py-3 font-semibold text-ink">
                    {row.org_name}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{row.contact_name}</td>
                  <td className="px-3 py-3 text-ink-muted num">
                    {row.phone ?? "—"}
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

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-line/70 px-6 py-4">
            <Link
              href={buildHref({ page: String(Math.max(1, page - 1)) })}
              aria-disabled={page === 1}
              className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold ${
                page === 1
                  ? "pointer-events-none text-ink-subtle/50"
                  : "text-ink-muted hover:bg-surface-alt"
              }`}
            >
              ← 이전
            </Link>
            <span className="text-[12.5px] font-semibold text-ink num">
              {page} / {totalPages}
            </span>
            <Link
              href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page === totalPages}
              className={`rounded-pill px-3 py-1.5 text-[12px] font-semibold ${
                page === totalPages
                  ? "pointer-events-none text-ink-subtle/50"
                  : "text-ink-muted hover:bg-surface-alt"
              }`}
            >
              다음 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
