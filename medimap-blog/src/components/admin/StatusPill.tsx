import clsx from "clsx";
import type { InquiryFormType, InquiryStatus } from "@/lib/inquiries";

const FORM_LABEL: Record<InquiryFormType, string> = {
  partnership: "비즈니스 제휴",
  listing: "병원 입점",
  contact: "일반 제휴문의",
};
const FORM_TONE: Record<InquiryFormType, string> = {
  partnership: "bg-brand/10 text-brand",
  listing: "bg-accent/10 text-accent",
  contact: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "신규",
  in_progress: "진행 중",
  replied: "회신 완료",
  archived: "보관",
};
const STATUS_TONE: Record<InquiryStatus, string> = {
  new: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  replied: "bg-indigo-100 text-indigo-700",
  archived: "bg-gray-100 text-gray-600",
};

export function FormTypePill({ type }: { type: InquiryFormType }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
        FORM_TONE[type],
      )}
    >
      {FORM_LABEL[type]}
    </span>
  );
}

export function StatusPill({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONE[status],
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const formTypeLabel = FORM_LABEL;
export const statusLabel = STATUS_LABEL;
