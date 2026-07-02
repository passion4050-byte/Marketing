/**
 * Round 37 B (2026-05-31) — 학습 인사이트 어드민 페이지.
 *
 * 기능:
 *   - 누적된 learned_insights 목록 (도메인 단위 / URL 단위 모두)
 *   - 진단 / 권장 변경 / 평균 지표 보기
 *   - 적용 toggle / 메모 편집 / 삭제
 *   - 위서클 baseline 편집 (이 페이지 상단)
 *
 * 향후 Phase 2: generator.py 가 적용된 insights 의 권장사항을 prompt 로 주입.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Check,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Baseline = {
  title_length: number;
  word_count: number;
  h2_count: number;
  h3_count: number;
  image_count: number;
  internal_link_count: number;
  faq_schema_rate: number;
  medical_schema_rate: number;
};

type DomainPatterns = {
  scope: 'domain';
  summary: {
    urls_analyzed: number;
    urls_failed: number;
    avg_title_length: number;
    avg_word_count: number;
    avg_h2_count: number;
    avg_h3_count: number;
    avg_image_count: number;
    avg_internal_link_count: number;
    faq_schema_rate: number;
    medical_schema_rate: number;
    schema_types_top: string[];
    alt_text_coverage_rate: number;
    table_usage_rate: number;
    list_usage_rate: number;
  };
  diagnosis: string[];
  recommendations: string[];
};

type Insight = {
  id: number;
  source_url: string;
  source_domain: string | null;
  source_tier: string | null;
  domain_category: string | null;
  keyword: string | null;
  tenant_id: number | null;
  tenant_name: string | null;
  patterns: DomainPatterns | Record<string, unknown>;
  notes: string | null;
  applied: boolean;
  applied_at: string | null;
  created_at: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  insights: Insight[];
  baseline: Baseline;
  count: number;
};

const BASELINE_FIELDS: Array<{ key: keyof Baseline; label: string; unit?: string; isRate?: boolean }> = [
  { key: 'title_length', label: '제목 길이 평균', unit: '자' },
  { key: 'word_count', label: '본문 단어 수 평균', unit: '단어' },
  { key: 'h2_count', label: 'H2 개수 평균', unit: '개' },
  { key: 'h3_count', label: 'H3 개수 평균', unit: '개' },
  { key: 'image_count', label: '이미지 개수 평균', unit: '장' },
  { key: 'internal_link_count', label: '내부 링크 평균', unit: '개' },
  { key: 'faq_schema_rate', label: 'FAQ schema 사용률', isRate: true },
  { key: 'medical_schema_rate', label: 'Medical schema 사용률', isRate: true },
];

export default function LearnedInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editBaseline, setEditBaseline] = useState(false);
  const [baselineDraft, setBaselineDraft] = useState<Baseline | null>(null);
  const [baselineSaving, setBaselineSaving] = useState(false);
  const [editNotesId, setEditNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/learned-insights');
      const json: ApiResponse = await res.json();
      if (!json.ok) {
        setError(json.error ?? '로드 실패');
        return;
      }
      setInsights(json.insights);
      setBaseline(json.baseline);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleApplied = async (id: number, applied: boolean) => {
    await fetch('/api/admin/learned-insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, applied }),
    });
    load();
  };

  const saveNotes = async (id: number) => {
    await fetch('/api/admin/learned-insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes: notesDraft.trim() || null }),
    });
    setEditNotesId(null);
    setNotesDraft('');
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('이 학습 인사이트를 삭제하시겠습니까? 누적 데이터 손실 (복구 불가).')) return;
    await fetch(`/api/admin/learned-insights?id=${id}`, { method: 'DELETE' });
    load();
  };

  const startEditBaseline = () => {
    if (baseline) setBaselineDraft({ ...baseline });
    setEditBaseline(true);
  };

  const saveBaseline = async () => {
    if (!baselineDraft) return;
    setBaselineSaving(true);
    try {
      const res = await fetch('/api/admin/learned-insights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baselineDraft),
      });
      const json = (await res.json()) as { ok: boolean; baseline?: Baseline; error?: string };
      if (json.ok && json.baseline) {
        setBaseline(json.baseline);
        setEditBaseline(false);
      } else {
        alert(`저장 실패: ${json.error}`);
      }
    } finally {
      setBaselineSaving(false);
    }
  };

  const appliedCount = insights.filter((i) => i.applied).length;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">학습 인사이트</h1>
          <div className="admin-page-desc">
            경쟁사/플랫폼 도메인 분석 누적 + 위서클 콘텐츠 baseline 관리
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md border border-border bg-surface-base px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:bg-surface-soft disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}새로고침
        </button>
      </div>

      {/* baseline 카드 */}
      <section className="card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="section-title">위서클 콘텐츠 baseline</h2>
            <div className="mt-1 text-[11px] text-ink-muted">
              learn-from-domain 진단의 비교 기준값 — 운영자가 수정 가능
            </div>
          </div>
          {!editBaseline ? (
            <button
              onClick={startEditBaseline}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface-base px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-surface-soft"
            >
              <Pencil className="h-3 w-3" /> 편집
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={saveBaseline}
                disabled={baselineSaving}
                className="inline-flex items-center gap-1 rounded bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {baselineSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}저장
              </button>
              <button
                onClick={() => {
                  setEditBaseline(false);
                  setBaselineDraft(null);
                }}
                className="rounded border border-border px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:bg-surface-soft"
              >
                취소
              </button>
            </div>
          )}
        </header>
        <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4">
          {BASELINE_FIELDS.map((f) => (
            <div key={f.key} className="rounded border border-border bg-surface-base px-3 py-2">
              <div className="text-[10px] text-ink-muted">{f.label}</div>
              {editBaseline && baselineDraft ? (
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    step={f.isRate ? '0.01' : '1'}
                    min="0"
                    max={f.isRate ? '1' : undefined}
                    value={baselineDraft[f.key]}
                    onChange={(e) =>
                      setBaselineDraft({
                        ...baselineDraft,
                        [f.key]: Number(e.target.value) || 0,
                      })
                    }
                    className="w-20 rounded border border-border bg-surface-base px-1.5 py-0.5 text-sm font-semibold text-ink"
                  />
                  {f.unit && <span className="text-[10px] text-ink-muted">{f.unit}</span>}
                  {f.isRate && <span className="text-[10px] text-ink-muted">(0~1)</span>}
                </div>
              ) : (
                <div className="mt-0.5 text-sm font-semibold text-ink">
                  {baseline
                    ? f.isRate
                      ? `${Math.round(baseline[f.key] * 100)}%`
                      : `${baseline[f.key]}${f.unit ? ' ' + f.unit : ''}`
                    : '—'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Round 96 — 자동 학습 안내 배너 */}
      <section className="mb-4 rounded-lg border border-brand-200 bg-gradient-to-r from-brand-50/60 to-accent-50/40 px-4 py-3">
        <div className="flex items-start gap-2 text-[12px] text-ink-soft">
          <span className="text-base">🤖</span>
          <div className="flex-1">
            <div className="font-semibold text-brand-700">자동 학습 패턴 사이클</div>
            <div className="mt-0.5">
              매주 <strong>월요일 KST 08:00</strong>, 발행 콘텐츠 중 AI 인용 잘 받은 Top 20% 의 구조 패턴(H2/표/이미지/길이/FAQ)을 자동 분석 → 이 페이지에
              <span className="mx-1 inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-brand-50 to-accent-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-brand-200">🤖 자동 발견 패턴</span>
              라벨로 등록. <strong>[적용중]</strong> 토글 시 다음 cron 글 prompt 에 자동 주입.
            </div>
            <div className="mt-1 text-[10px] text-ink-muted">
              수동 트리거: GitHub Actions → "Auto Pattern Learning" → Run workflow
            </div>
          </div>
        </div>
      </section>

      {/* 인사이트 목록 */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">학습 인사이트 누적 ({insights.length}건, 적용 {appliedCount}건)</h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            /admin/competitors 의 [전체 분석 & 반영] 클릭 시 여기에 누적. <strong>[적용중]</strong> 토글한 항목은 같은 진료과(domain_category) 병원의 콘텐츠 생성 프롬프트에 <strong>실제로 주입됩니다</strong>(발행·A/B 반영).
          </div>
        </header>

        {error && (
          <div className="m-5 rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-[11px] text-status-danger">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-ink-muted">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
            로딩 중...
          </div>
        ) : insights.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-muted">
            <BookOpen className="mx-auto mb-2 h-6 w-6 text-ink-faint" />
            누적된 인사이트 없음 — /admin/competitors 의 도메인 [전체 분석 & 반영] 으로 시작
          </div>
        ) : (
          <div className="divide-y divide-border">
            {insights.map((it) => {
              const open = expandedId === it.id;
              const patterns = it.patterns as DomainPatterns;
              const isDomain = patterns?.scope === 'domain';
              return (
                <div key={it.id} className="px-5 py-3">
                  <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={() => setExpandedId(open ? null : it.id)}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4 text-ink-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Round 96 — 자동 발견 패턴 chip (source_url 'internal://auto_pattern') */}
                        {it.source_url?.startsWith('internal://auto_pattern') && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-gradient-to-r from-brand-50 to-accent-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-brand-200">
                            🤖 자동 발견 패턴
                          </span>
                        )}
                        <strong className="text-sm text-ink">
                          {it.source_domain ?? it.source_url}
                        </strong>
                        {it.source_tier && (
                          <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                            {it.source_tier}
                          </span>
                        )}
                        {isDomain && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                            도메인 {patterns.summary.urls_analyzed}개
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-muted">
                        {it.keyword && <span>키워드: {it.keyword.slice(0, 50)}</span>}
                        {it.tenant_name && <span className="ml-2">· {it.tenant_name}</span>}
                        <span className="ml-2 text-ink-faint">· {new Date(it.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleApplied(it.id, !it.applied);
                      }}
                      className={cn(
                        'rounded px-2.5 py-1 text-[11px] font-semibold',
                        it.applied
                          ? 'bg-brand text-white hover:bg-brand-dark'
                          : 'border border-border text-ink-soft hover:bg-surface-soft'
                      )}
                      title={it.applied ? '클릭하여 비활성화 (콘텐츠 주입 중단)' : '클릭하여 활성화 — 같은 진료과 병원 콘텐츠 생성에 즉시 주입'}
                    >
                      {it.applied ? (
                        <>
                          <Check className="mr-0.5 inline h-3 w-3" />적용중
                        </>
                      ) : (
                        '미적용'
                      )}
                    </button>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-3 pl-7">
                      {isDomain && patterns.summary && (
                        <>
                          {/* 평균 지표 */}
                          <div className="grid grid-cols-4 gap-2 text-[11px]">
                            <Metric label="평균 본문" value={`${patterns.summary.avg_word_count} 단어`} />
                            <Metric label="평균 H2 / H3" value={`${patterns.summary.avg_h2_count} / ${patterns.summary.avg_h3_count}`} />
                            <Metric
                              label="FAQ schema"
                              value={`${Math.round(patterns.summary.faq_schema_rate * 100)}%`}
                              highlight={patterns.summary.faq_schema_rate >= 0.5}
                            />
                            <Metric
                              label="Medical schema"
                              value={`${Math.round(patterns.summary.medical_schema_rate * 100)}%`}
                              highlight={patterns.summary.medical_schema_rate >= 0.5}
                            />
                          </div>
                          {/* 진단 */}
                          {patterns.diagnosis && patterns.diagnosis.length > 0 && (
                            <div className="rounded border border-brand/20 bg-brand-50/40 px-3 py-2 text-[11px]">
                              <div className="mb-1 font-semibold text-brand">진단</div>
                              <ul className="list-disc space-y-0.5 pl-4 text-ink-soft">
                                {patterns.diagnosis.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* 권장 */}
                          {patterns.recommendations && patterns.recommendations.length > 0 && (
                            <div className="rounded border border-status-warning/30 bg-status-warningSoft/30 px-3 py-2 text-[11px]">
                              <div className="mb-1 font-semibold text-status-warning">💡 권장 변경</div>
                              <ol className="list-decimal space-y-0.5 pl-4 text-ink-soft">
                                {patterns.recommendations.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </>
                      )}

                      {/* 메모 */}
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <strong className="text-ink">운영자 메모</strong>
                          {editNotesId !== it.id && (
                            <button
                              onClick={() => {
                                setEditNotesId(it.id);
                                setNotesDraft(it.notes ?? '');
                              }}
                              className="text-[10px] text-brand hover:underline"
                            >
                              편집
                            </button>
                          )}
                        </div>
                        {editNotesId === it.id ? (
                          <div className="space-y-1">
                            <textarea
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              className="w-full rounded border border-border bg-surface-base px-2 py-1.5 text-[11px]"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => saveNotes(it.id)}
                                className="rounded bg-brand px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-brand-dark"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditNotesId(null);
                                  setNotesDraft('');
                                }}
                                className="rounded border border-border px-2 py-0.5 text-[10px] text-ink-soft"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded border border-border bg-surface-soft px-2 py-1.5 text-[11px] text-ink-soft">
                            {it.notes || <span className="text-ink-faint">메모 없음</span>}
                          </div>
                        )}
                      </div>

                      {/* 메타 */}
                      <div className="flex items-center justify-between text-[10px] text-ink-faint">
                        <div>
                          source: <a href={it.source_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{it.source_url.slice(0, 60)}</a>
                          {it.applied_at && (
                            <span className="ml-2">· 적용: {new Date(it.applied_at).toLocaleString()}</span>
                          )}
                        </div>
                        <button
                          onClick={() => remove(it.id)}
                          className="inline-flex items-center gap-1 text-status-danger hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 주입 동작 안내 (Phase 2 — 활성) */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">
            <Sparkles className="mr-1 inline h-4 w-4 text-brand" />인사이트 주입 — 활성 (작동 중)
          </h2>
        </header>
        <div className="space-y-1.5 px-5 py-4 text-[12px] text-ink-soft">
          <p><strong>[적용중]</strong> 토글한 인사이트는 매 발행 cron + A/B 생성 시 콘텐츠 프롬프트에 <strong>실제로 주입됩니다.</strong></p>
          <p>
            매칭은 <strong>같은 진료과(domain_category)</strong> 기준 — 예: 안과 경쟁사 인사이트는 안과 병원 콘텐츠에만 주입(타 진료과 noise 0).
            인사이트의 권장사항·요약지표 + 경쟁사 평균 구조(H2·본문·표 수)를 "이를 능가하라"는 가이드로 변환해 주입합니다.
          </p>
          <p>
            A/B 테스트에서는 변형 A(베이스라인)는 주입 <strong>생략</strong>, 변형 B만 주입해 인사이트 효과를 분리 측정합니다.
          </p>
          <p className="text-ink-muted">
            연결: <code className="font-mono text-brand">generator.py</code> → <code className="font-mono text-brand">learned_insights_loader</code> + <code className="font-mono text-brand">applied_insights_loader</code> (Round 62/81).
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded border px-2 py-1.5',
        highlight ? 'border-brand/30 bg-brand-50' : 'border-border bg-surface-base'
      )}
    >
      <div className="text-[10px] text-ink-muted">{label}</div>
      <div className={cn('font-semibold', highlight ? 'text-brand' : 'text-ink')}>{value}</div>
    </div>
  );
}
