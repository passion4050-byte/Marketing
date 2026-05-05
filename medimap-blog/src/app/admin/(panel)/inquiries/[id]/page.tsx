import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, Phone, Mail, Building2, Globe } from "lucide-react";
import { getInquiry } from "@/lib/inquiries";
import {
  FormTypePill,
  StatusPill,
  statusLabel,
} from "@/components/admin/StatusPill";
import { updateInquiryAction } from "./actions";

export const dynamic = "force-dynamic";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function InquiryDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) notFound();
  const row = await getInquiry(id);
  if (!row) notFound();
  const saved = searchParams?.saved === "1";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/inquiries"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-muted hover:text-brand"
        >
          <ChevronLeft size={15} /> 목록으로
        </Link>
        <div className="flex items-center gap-2">
          <FormTypePill type={row.form_type} />
          <StatusPill status={row.status} />
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-card border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          저장되었습니다.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* 왼쪽 — 본문 */}
        <div className="space-y-5">
          <div className="rounded-card bg-white p-7 shadow-card md:p-8">
            <h2 className="text-[20px] font-extrabold tracking-tight text-ink">
              {row.org_name}
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              담당자 <strong className="text-ink">{row.contact_name}</strong> ·{" "}
              <span className="num">{fmtDateTime(row.created_at)}</span>
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <Info icon={<Phone size={13} />} label="연락처" value={row.phone ?? "—"} />
              <Info icon={<Mail size={13} />} label="이메일" value={row.email ?? "—"} />
              <Info icon={<Building2 size={13} />} label="기관/병원" value={row.org_name} />
              <Info
                icon={<Globe size={13} />}
                label="유입 경로"
                value={row.referer ?? "—"}
                mono
              />
            </dl>
          </div>

          <div className="rounded-card bg-white p-7 shadow-card md:p-8">
            <h3 className="text-[14px] font-bold text-ink-muted">문의 내용</h3>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.7] text-ink">
              {row.message}
            </p>
          </div>

          {/* 메타 (접힘) */}
          <details className="rounded-card bg-white p-5 shadow-card text-[12.5px]">
            <summary className="cursor-pointer font-semibold text-ink-muted">
              상세 메타데이터
            </summary>
            <dl className="mt-3 space-y-1 font-mono text-[11.5px] text-ink-subtle">
              <div>
                ID <span className="text-ink num">{row.id}</span>
              </div>
              <div>
                IP hash <span className="text-ink">{row.ip_hash ?? "—"}</span>
              </div>
              <div>
                User-Agent{" "}
                <span className="text-ink break-all">
                  {row.user_agent ?? "—"}
                </span>
              </div>
              <div>
                Updated{" "}
                <span className="text-ink num">{fmtDateTime(row.updated_at)}</span>
              </div>
            </dl>
          </details>
        </div>

        {/* 오른쪽 — 상태 변경 + 메모 */}
        <aside className="space-y-5">
          <form
            action={updateInquiryAction}
            className="rounded-card bg-white p-6 shadow-card"
          >
            <input type="hidden" name="id" value={row.id} />
            <h3 className="text-[14px] font-bold text-ink">처리 상태</h3>
            <p className="mt-1 text-[12px] text-ink-subtle">
              상태를 변경하면 라이프사이클 카운터에 즉시 반영됩니다.
            </p>
            <div className="mt-4 space-y-2">
              {(
                ["new", "in_progress", "replied", "archived"] as const
              ).map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2.5 rounded-card border border-line/60 px-3 py-2.5 text-[13px] hover:border-brand/40"
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    defaultChecked={row.status === s}
                    className="accent-brand"
                  />
                  <span className="font-semibold text-ink">
                    {statusLabel[s]}
                  </span>
                </label>
              ))}
            </div>
            <h3 className="mt-6 text-[14px] font-bold text-ink">내부 메모</h3>
            <textarea
              name="notes"
              defaultValue={row.notes ?? ""}
              rows={5}
              placeholder="처리 내역, 회신 일정, 후속 액션…"
              className="form-input mt-2 resize-none"
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-pill bg-gradient-to-r from-brand to-accent px-5 py-2.5 text-[13px] font-bold text-white shadow-cta hover:-translate-y-0.5 hover:shadow-glow transition"
            >
              저장
            </button>
          </form>

          <div className="rounded-card bg-white p-6 shadow-card text-[12.5px] text-ink-muted">
            <h3 className="text-[13px] font-bold text-ink">빠른 회신</h3>
            <p className="mt-2">
              담당자에게 직접 연락하려면 아래 버튼을 사용하세요.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {row.email && (
                <a
                  href={`mailto:${row.email}?subject=${encodeURIComponent(`[메디맵] ${row.org_name} 문의 회신`)}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-line/70 px-4 py-2 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
                >
                  <Mail size={13} /> 이메일 회신
                </a>
              )}
              {row.phone && (
                <a
                  href={`tel:${row.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-line/70 px-4 py-2 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
                >
                  <Phone size={13} /> 전화 걸기
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-subtle">
        {icon} {label}
      </dt>
      <dd
        className={`mt-1 text-[14px] text-ink ${mono ? "font-mono break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
