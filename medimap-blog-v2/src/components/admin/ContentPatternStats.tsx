/**
 * Round 89 (2026-06-28) — 콘텐츠 구조 패턴 분석 위젯.
 *
 * 사용자 요구: "인용 자주 받는 콘텐츠 구조 분석 + 자동 적용 자동화"
 *
 * 표시:
 *   1. 전체 평균 구조 메트릭 (body 길이/H2/표/목록/이미지/FAQ)
 *   2. Top 인용 콘텐츠 (상위 20%) 의 평균
 *   3. 차이 분석 — Top 패턴 vs 전체 평균
 *   4. 다음 cron 글에 학습 적용 안내 (Round 90 자동화)
 */
import { Lightbulb, FileText, Layers, ListChecks, Image as ImageIcon, ScrollText, TrendingUp } from 'lucide-react';

interface StructureStats {
  totalCount: number;
  avgBodyLen: number;
  avgH2: number;
  avgTable: number;
  avgList: number;
  avgImg: number;
  faqSchemaPct: number;
  topPattern: {
    avgH2: number; avgTable: number; avgList: number; avgImg: number;
    avgBodyLen: number; faqSchemaPct: number;
  } | null;
}

function pctChange(top: number, avg: number): { value: string; isUp: boolean } | null {
  if (avg === 0) return null;
  const diff = ((top - avg) / avg) * 100;
  if (Math.abs(diff) < 5) return null; // < 5% 차이는 의미 없음
  return { value: `${diff > 0 ? '+' : ''}${Math.round(diff)}%`, isUp: diff > 0 };
}

function MetricCell({
  icon: Icon,
  label,
  avgValue,
  topValue,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  avgValue: number | string;
  topValue: number | string | null;
  suffix?: string;
}) {
  const avgNum = typeof avgValue === 'number' ? avgValue : 0;
  const topNum = typeof topValue === 'number' ? topValue : 0;
  const change = topValue != null ? pctChange(topNum, avgNum) : null;

  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-base font-bold text-ink">
          {avgValue}{suffix}
        </div>
        {topValue != null && (
          <div className="text-[10px] text-ink-muted">
            Top: <span className="font-semibold text-brand">{topValue}{suffix}</span>
            {change && (
              <span className={change.isUp ? 'ml-1 font-bold text-status-success' : 'ml-1 font-bold text-status-warning'}>
                ({change.value})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentPatternStats({ stats }: { stats: StructureStats }) {
  if (stats.totalCount === 0) {
    return (
      <section className="card mt-6">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Lightbulb className="h-4 w-4 text-brand" />
            콘텐츠 구조 패턴 분석
          </h2>
        </header>
        <div className="px-5 py-6 text-center text-sm text-ink-muted">
          발행 콘텐츠 없음 — cron 발행 후 자동 분석
        </div>
      </section>
    );
  }

  const top = stats.topPattern;
  // 인사이트 생성
  const insights: string[] = [];
  if (top) {
    if (top.avgH2 > stats.avgH2 + 0.5) insights.push(`H2 ${top.avgH2}개 (평균 ${stats.avgH2}) — 더 잘게 나눈 글이 인용 잘 받음`);
    if (top.avgTable > stats.avgTable) insights.push(`표 ${top.avgTable}개 (평균 ${stats.avgTable}) — 표가 있는 글이 AI 인용 우세`);
    if (top.avgImg > stats.avgImg + 0.5) insights.push(`이미지 ${top.avgImg}개 (평균 ${stats.avgImg}) — 시각자료 추가 권장`);
    if (top.faqSchemaPct > stats.faqSchemaPct + 10) insights.push(`FAQPage schema ${top.faqSchemaPct}% (평균 ${stats.faqSchemaPct}%) — schema 추가 시 인용률 ↑`);
    if (top.avgBodyLen > stats.avgBodyLen * 1.2) insights.push(`본문 ${top.avgBodyLen}자 (평균 ${stats.avgBodyLen}) — 더 긴 글이 우세`);
    if (top.avgBodyLen < stats.avgBodyLen * 0.8) insights.push(`본문 ${top.avgBodyLen}자 (평균 ${stats.avgBodyLen}) — 짧은 글도 인용 잘 받음`);
  }

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Lightbulb className="h-4 w-4 text-brand" />
          콘텐츠 구조 패턴 분석 ({stats.totalCount}편 분석)
        </h2>
        <div className="mt-0.5 text-[11px] text-ink-muted">
          전체 발행 평균 vs <strong className="text-brand-700">Top 20% 인용 콘텐츠</strong> 의 구조 비교 — 어떤 패턴이 효과적인지 자동 발견
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCell
          icon={ScrollText} label="본문 길이"
          avgValue={stats.avgBodyLen.toLocaleString()} topValue={top?.avgBodyLen.toLocaleString() ?? null}
          suffix="자"
        />
        <MetricCell
          icon={Layers} label="H2 섹션"
          avgValue={stats.avgH2} topValue={top?.avgH2 ?? null}
          suffix="개"
        />
        <MetricCell
          icon={FileText} label="표"
          avgValue={stats.avgTable} topValue={top?.avgTable ?? null}
          suffix="개"
        />
        <MetricCell
          icon={ListChecks} label="목록"
          avgValue={stats.avgList} topValue={top?.avgList ?? null}
          suffix="개"
        />
        <MetricCell
          icon={ImageIcon} label="이미지"
          avgValue={stats.avgImg} topValue={top?.avgImg ?? null}
          suffix="개"
        />
        <MetricCell
          icon={TrendingUp} label="FAQPage schema"
          avgValue={stats.faqSchemaPct} topValue={top?.faqSchemaPct ?? null}
          suffix="%"
        />
      </div>

      {/* 자동 인사이트 — 차이가 의미 있을 때만 */}
      {insights.length > 0 && (
        <div className="border-t border-border bg-brand-50/40 px-4 py-3 md:px-5">
          <div className="flex items-start gap-2 text-[12px] text-ink">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-700" />
            <div className="flex-1">
              <div className="font-semibold text-brand-700">🧠 자동 발견된 패턴</div>
              <ul className="ml-4 mt-1 list-disc space-y-0.5 text-[11px] text-ink-soft">
                {insights.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              <div className="mt-2 text-[10px] text-ink-muted">
                💡 다음 cron 글 prompt 에 이 패턴 자동 반영 예정 (Round 90 학습 인사이트 자동 등록)
              </div>
            </div>
          </div>
        </div>
      )}

      {!top && stats.totalCount > 0 && (
        <div className="border-t border-border bg-surface-subtle px-4 py-2 text-[10px] text-ink-muted md:px-5">
          ⓘ Top 패턴 분석 = mention 수신한 콘텐츠 필요 — 현재 mention 데이터 부족, 측정 누적 후 자동 분석
        </div>
      )}
    </section>
  );
}
