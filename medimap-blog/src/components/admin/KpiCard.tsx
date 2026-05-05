import type { ReactNode } from "react";
import clsx from "clsx";

export function KpiCard({
  label,
  value,
  unit,
  delta,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  tone?: "brand" | "accent" | "mint" | "indigo";
}) {
  const toneBg = {
    brand: "bg-brand/10 text-brand",
    accent: "bg-accent/10 text-accent",
    mint: "bg-emerald-100 text-emerald-700",
    indigo: "bg-indigo-100 text-indigo-700",
  }[tone];
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-semibold text-ink-muted">{label}</div>
        {icon && (
          <div
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              toneBg,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="text-[26px] font-extrabold tracking-tight text-ink num">
          {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
        </div>
        {unit && <div className="text-[13px] text-ink-muted">{unit}</div>}
      </div>
      {delta && (
        <div
          className={clsx(
            "mt-1 text-[12px] font-semibold",
            delta.positive ? "text-emerald-600" : "text-ink-subtle",
          )}
        >
          {delta.positive ? "▲" : "·"} {delta.value}
        </div>
      )}
    </div>
  );
}
