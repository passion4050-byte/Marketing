/**
 * Round 87 (2026-06-28) — 운영자 액션 권고 워크플로 위젯.
 *
 * 사용자 요구: "차트만 보고 어떻게 대응할지 알 수 없음 — 워크플로가 구축이 안되어있어"
 * → 실데이터 자동 진단 → 우선순위 액션 카드.
 *
 * 룰:
 *   🔴 P0 (긴급): 측정 cron 26h+ 지연 / 검수 대기 10+ 누적 / 의료법 fail 비율 30%+
 *   🟠 P1 (이번 주): 인용률 낮은 키워드 5+ / 이번 달 발행 부족
 *   🟢 P2 (참고): 신규 등장 도메인 / 학습 인사이트 적용 대기
 */
import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info, ArrowRight, Zap, ClipboardCheck, Target, BookOpen } from 'lucide-react';
import type { KeywordGroundingItem } from '@/components/admin/DashboardCharts';

interface Props {
  keywordGrounding: KeywordGroundingItem[];
  pendingQueue: number;
  lastCronAt: string | null;
  citations30d: number;
  publishedThisMonth: number;
}

type Severity = 'p0' | 'p1' | 'p2';
type ActionItem = {
  severity: Severity;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

const SEV_META: Record<Severity, { label: string; cls: string; bg: string }> = {
  p0: { label: '긴급', cls: 'text-status-danger', bg: 'border-status-danger/40 bg-status-danger/5' },
  p1: { label: '이번 주', cls: 'text-status-warning', bg: 'border-status-warning/40 bg-status-warning/5' },
  p2: { label: '참고', cls: 'text-brand-700', bg: 'border-brand-200 bg-brand-50/40' },
};

export function ActionRecommendations({
  keywordGrounding,
  pendingQueue,
  lastCronAt,
  citations30d,
  publishedThisMonth,
}: Props) {
  const actions: ActionItem[] = [];

  // P0-1: 측정 cron 지연
  if (!lastCronAt) {
    actions.push({
      severity: 'p0', icon: Zap,
      title: '측정 cron 미실행',
      detail: 'queries 테이블에 데이터 없음. ENGINE_MODE secret 또는 API key 확인 필요',
      href: 'https://github.com/passion4050-byte/Marketing/actions/workflows/measure-ai-mentions.yml',
      cta: 'GitHub Actions 열기',
    });
  } else {
    const hoursAgo = (Date.now() - new Date(lastCronAt).getTime()) / 3600000;
    if (hoursAgo > 26) {
      actions.push({
        severity: 'p0', icon: AlertTriangle,
        title: `측정 cron ${Math.floor(hoursAgo)}시간 지연`,
        detail: '매일 KST 07:00 자동 실행. credit 부족 / quota 초과 / workflow 오류 가능성',
        href: 'https://github.com/passion4050-byte/Marketing/actions/workflows/measure-ai-mentions.yml',
        cta: '수동 Run 트리거',
      });
    }
  }

  // P0-2: 검수 대기 누적
  if (pendingQueue >= 10) {
    actions.push({
      severity: 'p0', icon: ClipboardCheck,
      title: `검수 대기 ${pendingQueue}건 누적`,
      detail: '발행 속도 < 검수 속도. 운영자 검수 처리 필요 (글 1편당 평균 3분)',
      href: '/admin/content-queue',
      cta: '검수 시작',
    });
  } else if (pendingQueue >= 5) {
    actions.push({
      severity: 'p1', icon: ClipboardCheck,
      title: `검수 대기 ${pendingQueue}건`,
      detail: '오늘 안에 처리 권장 (검수 후 발행 → cron 사이클 합류)',
      href: '/admin/content-queue',
      cta: '검수 큐 열기',
    });
  }

  // P1: 인용률 낮은 키워드 (grounding < 20% + 측정은 됐는데 grounded 0)
  // Round 89 hotfix — KeywordGroundingItem 실제 type: { keyword, tenant_name, queries, grounded, rate }
  const lowGrounding = keywordGrounding.filter(
    (k) => k.queries > 0 && k.rate < 0.2 && k.grounded === 0
  );
  if (lowGrounding.length >= 3) {
    const sample = lowGrounding.slice(0, 3).map((k) => k.keyword).join(', ');
    actions.push({
      severity: 'p1', icon: Target,
      title: `위서클 인용 0인 키워드 ${lowGrounding.length}개`,
      detail: `${sample}${lowGrounding.length > 3 ? ' 외' : ''} — 콘텐츠 추가 발행 또는 키워드 재검토 필요`,
      href: '/admin/keywords',
      cta: '키워드 풀 열기',
    });
  }

  // P1: 이번 달 발행 부족 — 9 tenant × 12편 (A상품) = 월 108편 기준 50% 이하
  const TARGET_PER_MONTH = 108;
  if (publishedThisMonth > 0 && publishedThisMonth < TARGET_PER_MONTH * 0.5) {
    const dayOfMonth = new Date().getDate();
    const expectedSoFar = Math.round((TARGET_PER_MONTH * dayOfMonth) / 30);
    if (publishedThisMonth < expectedSoFar * 0.7) {
      actions.push({
        severity: 'p1', icon: AlertCircle,
        title: `이번 달 발행 ${publishedThisMonth}편 — 목표 미달`,
        detail: `${dayOfMonth}일 기준 예상 ${expectedSoFar}편 · A상품 월 ${TARGET_PER_MONTH}편 목표 — cron 실패 또는 검수 적체 확인`,
        href: '/admin/content-queue',
        cta: '큐 확인',
      });
    }
  }

  // P2: 누적 인용 적음 (영업 자료 부족)
  if (citations30d < 100) {
    actions.push({
      severity: 'p2', icon: Info,
      title: `30일 인용 ${citations30d}건 — 영업 자료 부족`,
      detail: '월 200+ 누적이 영업/투자 자료에 신뢰감. 측정 키워드 확대 + 콘텐츠 발행 가속',
      href: '/admin/saas-tracking',
      cta: '시장 노출도 확인',
    });
  }

  // P2: 학습 인사이트 활용 안내
  actions.push({
    severity: 'p2', icon: BookOpen,
    title: '학습 인사이트 — 적용 토글 확인',
    detail: '경쟁사 도메인 분석 → "적용중" 토글 ON → 다음 cron 글에 자동 prompt 주입',
    href: '/admin/learned-insights',
    cta: '인사이트 열기',
  });

  if (actions.length === 0) {
    return (
      <section className="mt-6 rounded-lg border border-status-success/30 bg-status-success/5 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-status-success">
          ✅ 운영 정상 — 액션 필요 항목 없음
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          측정 cron · 검수 대기 · 콘텐츠 발행 · 인용률 모두 안정. 다음 cron 사이클 결과를 모니터링하세요.
        </p>
      </section>
    );
  }

  // 우선순위 정렬
  const sevOrder = { p0: 0, p1: 1, p2: 2 };
  actions.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return (
    <section className="mt-6">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          🎯 운영 액션 권고 <span className="ml-1 text-[11px] font-normal text-ink-muted">({actions.length}건)</span>
        </h2>
        <span className="text-[10px] text-ink-faint">
          실데이터 기반 자동 진단 — 우선순위 순
        </span>
      </header>
      {/* Round 121 — 액션 1건일 땐 풀폭 (md:grid-cols-2 고정 시 우측 절반이 비어 보임) */}
      <div className={actions.length > 1 ? 'grid grid-cols-1 gap-2 md:grid-cols-2' : 'grid grid-cols-1 gap-2'}>
        {actions.map((a, i) => {
          const Icon = a.icon;
          const meta = SEV_META[a.severity];
          return (
            <Link
              key={i}
              href={a.href}
              className={`block rounded-lg border px-4 py-3 transition hover:shadow-sm ${meta.bg}`}
              target={a.href.startsWith('http') ? '_blank' : undefined}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${meta.cls}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span className="text-sm font-semibold text-ink truncate">{a.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">{a.detail}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                    {a.cta} <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
