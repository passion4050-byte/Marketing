/**
 * SVG 도넛 — 카테고리별 분포 (예: form_type, status).
 * 외부 라이브러리 없이 stroke-dasharray 기반.
 */
export function DonutBreakdown({
  segments,
  size = 140,
  thickness = 18,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgb(243 244 246)"
            strokeWidth={thickness}
            fill="none"
          />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * circumference;
            const dasharray = `${len} ${circumference - len}`;
            const node = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={dasharray}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return node;
          })}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[20px] font-extrabold tracking-tight text-ink num">
              {centerLabel}
            </div>
            {centerSub && (
              <div className="text-[10px] font-semibold text-ink-subtle">
                {centerSub}
              </div>
            )}
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 text-[12.5px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-ink-muted">{s.label}</span>
            <span className="font-semibold text-ink num">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
