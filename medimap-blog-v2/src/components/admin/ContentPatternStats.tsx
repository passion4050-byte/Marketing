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
            Top: <span className="font-semibold text-ink-soft">{topValue}{suffix}</span>
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
            <Lightbulb className="h-4 w-4 text-ink-soft" />
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
  /*
    🔴 Round 144 (2026-08-02) — 인과 단정 문구 제거.
    여기서 "Top 20%"는 **키워드 언급 수(mention)** 로 선정된 것이지 그 글이
    실제로 출처 인용된 게 아님. 즉 사실상 무작위 표본 두 개를 비교하는 구조라
    ±10% 차이는 노이즈. 게다가 같은 나이대(6주+)에서 공정 비교한 결과
    인용된 글이 오히려 더 짧고 H2 적고 FAQ 0% 였음(코호트 분석 실측).
    따라서 "~하면 인용 잘 받음" 류의 처방 문구는 근거가 없어 삭제.
  */

  return (
    <section className="card mt-6">
      <header className="border-b border-border px-4 py-3 md:px-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Lightbulb className="h-4 w-4 text-ink-soft" />
          콘텐츠 구조 패턴 분석 ({stats.totalCount}편 분석)
        </h2>
        <div className="mt-0.5 text-[11px] text-ink-muted">
          전체 발행 평균 vs <strong className="text-ink">키워드 언급량 상위 20%</strong> 의 구조 비교.
          본문 길이는 <strong className="text-ink">HTML 태그를 제외한 순수 텍스트</strong> 기준입니다.
        </div>
        <div className="mt-2 rounded-md border border-status-warningSoft bg-status-warningSoft/25 px-2.5 py-1.5 text-[11px] text-status-warning">
          ⚠ <strong>참고용 지표</strong> — 상위 20%는 &ldquo;출처 인용&rdquo;이 아니라 &ldquo;키워드 언급량&rdquo;으로
          선정됩니다. 같은 발행 나이대에서 공정 비교하면 실제 인용된 글이 오히려 더 짧고 H2가 적었습니다.
          이 표를 콘텐츠 처방 근거로 쓰지 마세요.
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

      {/* Round 144 — "자동 발견된 패턴" 블록 제거.
          잘못된 Top 선정 지표에서 나온 처방 문구였고, 내부 라운드 번호가 UI 에 노출됐음. */}

      {!top && stats.totalCount > 0 && (
        <div className="border-t border-border bg-surface-subtle px-4 py-2 text-[10px] text-ink-muted md:px-5">
          ⓘ Top 패턴 분석 = mention 수신한 콘텐츠 필요 — 현재 mention 데이터 부족, 측정 누적 후 자동 분석
        </div>
      )}
    </section>
  );
}
