/**
 * SVG 기반 line+area 스파크라인 — 외부 차트 라이브러리 없이 어드민 자체 구현.
 * 일별 카운트 시계열을 30일 윈도우로 그린다.
 */
export function Sparkline({
  data,
  width = 800,
  height = 180,
  paddingX = 24,
  paddingY = 18,
  label,
}: {
  data: { date: string; count: number }[];
  width?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
  label?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-[180px] items-center justify-center rounded-card border border-dashed border-line/70 bg-white text-[13px] text-ink-subtle">
        {label ?? "데이터가 아직 없습니다."}
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;
  const stepX = innerW / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const y = paddingY + innerH - (d.count / max) * innerH;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${(paddingX + innerW).toFixed(1)},${(paddingY + innerH).toFixed(1)} L${paddingX.toFixed(1)},${(paddingY + innerH).toFixed(1)} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={label ?? "일별 시계열"}
    >
      <defs>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* X축 baseline */}
      <line
        x1={paddingX}
        y1={paddingY + innerH}
        x2={paddingX + innerW}
        y2={paddingY + innerH}
        stroke="rgb(229 231 235)"
        strokeWidth={1}
      />
      <path d={areaPath} fill="url(#spark-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill="white"
          stroke="var(--color-brand)"
          strokeWidth={1.5}
        />
      ))}
      {/* 끝 라벨 — 총합/최근값 */}
      <text
        x={paddingX + innerW}
        y={paddingY - 4}
        textAnchor="end"
        className="fill-ink-subtle text-[10px] font-semibold"
      >
        max {max}
      </text>
    </svg>
  );
}
