/**
 * Round 36 fix 3 (2026-05-31) — 도메인 일괄 분석 + 종합 진단 버튼.
 *
 * 동작:
 *   1. [✨ 전체 분석&반영] 클릭 → /api/admin/learn-from-domain 호출
 *   2. 도메인의 N개 URL 병렬 fetch + 메타 구조 추출 + 평균/공통점 집계
 *   3. 모달에 종합 진단 + 권장 변경사항 표시
 *   4. 운영자 검수 + 메모 + [가이드에 추가] → learned_insights INSERT
 */
'use client';

import { useState } from 'react';
import { Loader2, Sparkles, X, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/cn';

type Summary = {
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

type AnalyzeResponse = {
  ok: boolean;
  error?: string;
  domain?: string;
  summary?: Summary;
  diagnosis?: string[];
  recommendations?: string[];
  per_url?: unknown[];
  tried?: number;
};

export function LearnFromDomainButton({
  domain,
  urls,
  keywords,
  sourceTier,
  domainCategory,
  tenantId,
}: {
  domain: string;
  urls: string[];
  keywords: string[];
  sourceTier?: string;
  domainCategory?: string;
  tenantId?: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const run = async () => {
    if (urls.length === 0) {
      setAnalysis({ ok: false, error: '분석할 URL 없음' });
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setSavedMessage(null);
    setNotes('');
    try {
      const res = await fetch('/api/admin/learn-from-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          urls,
          keywords,
          source_tier: sourceTier,
          domain_category: domainCategory,
          tenant_id: tenantId,
        }),
      });
      const json: AnalyzeResponse = await res.json();
      setAnalysis(json);
    } catch (e) {
      setAnalysis({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!analysis?.summary) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/learn-from-domain?save=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          keywords,
          source_tier: sourceTier,
          domain_category: domainCategory,
          tenant_id: tenantId,
          summary: analysis.summary,
          per_url: analysis.per_url,
          diagnosis: analysis.diagnosis,
          recommendations: analysis.recommendations,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setSavedMessage('✓ 콘텐츠 가이드(learned_insights)에 누적됨');
      } else {
        setSavedMessage(`❌ 저장 실패: ${json.error}`);
      }
    } catch (e) {
      setSavedMessage(`❌ 저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    setAnalysis(null);
    setSavedMessage(null);
    setNotes('');
  };

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={loading || urls.length === 0}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand transition hover:bg-brand-100 disabled:opacity-50"
        title={`이 도메인의 ${urls.length}개 URL 일괄 분석 → 메디맵 가이드 비교 진단`}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {loading ? '분석 중... (~10초)' : `전체 분석 & 반영 (${urls.length}개 URL)`}
      </button>

      {/* Modal */}
      {analysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-surface-base p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">
                  <span className="font-mono">{domain}</span> 종합 분석
                </h3>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  메디맵 가이드 v3 와 비교 진단
                </div>
              </div>
              <button onClick={close} className="rounded p-1 hover:bg-surface-soft">
                <X className="h-4 w-4 text-ink-muted" />
              </button>
            </div>

            {!analysis.ok && (
              <div className="rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-[11px] text-status-danger">
                <AlertTriangle className="mr-1 inline h-3 w-3" />
                {analysis.error}
                {analysis.tried !== undefined && <span className="ml-1">(시도: {analysis.tried}개)</span>}
              </div>
            )}

            {analysis.ok && analysis.summary && (
              <>
                {/* 분석 메타 */}
                <div className="mb-3 flex items-center justify-between rounded border border-border bg-surface-soft px-3 py-2 text-[11px]">
                  <div>
                    <strong>{analysis.summary.urls_analyzed}개</strong> URL 분석 완료
                    {analysis.summary.urls_failed > 0 && (
                      <span className="ml-1 text-ink-muted">
                        ({analysis.summary.urls_failed}개 fetch 실패 — 제외)
                      </span>
                    )}
                  </div>
                  {keywords.length > 0 && (
                    <div className="text-ink-muted">
                      키워드: <strong className="text-ink">{keywords.slice(0, 3).join(', ')}</strong>
                      {keywords.length > 3 && ` 외 ${keywords.length - 3}개`}
                    </div>
                  )}
                </div>

                {/* 평균 지표 그리드 */}
                <div className="mb-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                  <Metric label="평균 제목" value={`${analysis.summary.avg_title_length}자`} />
                  <Metric label="평균 본문" value={`${analysis.summary.avg_word_count} 단어`} />
                  <Metric label="평균 H2 / H3" value={`${analysis.summary.avg_h2_count} / ${analysis.summary.avg_h3_count}`} />
                  <Metric label="평균 이미지" value={`${analysis.summary.avg_image_count}`} note={`alt ${Math.round(analysis.summary.alt_text_coverage_rate * 100)}%`} />
                  <Metric label="내부 링크" value={`${analysis.summary.avg_internal_link_count}`} />
                  <Metric label="비교 표 사용" value={`${Math.round(analysis.summary.table_usage_rate * 100)}%`} />
                  <Metric
                    label="FAQ schema"
                    value={`${Math.round(analysis.summary.faq_schema_rate * 100)}%`}
                    highlight={analysis.summary.faq_schema_rate >= 0.5}
                  />
                  <Metric
                    label="Medical schema"
                    value={`${Math.round(analysis.summary.medical_schema_rate * 100)}%`}
                    highlight={analysis.summary.medical_schema_rate >= 0.5}
                  />
                  <Metric label="리스트 사용" value={`${Math.round(analysis.summary.list_usage_rate * 100)}%`} />
                </div>

                {/* Schema types top */}
                {analysis.summary.schema_types_top.length > 0 && (
                  <div className="mb-3 rounded border border-border bg-surface-soft px-3 py-2 text-[11px]">
                    <div className="mb-1 font-semibold text-ink">자주 사용된 Schema.org 타입</div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.summary.schema_types_top.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono',
                            t === 'FAQPage' || ['MedicalProcedure', 'MedicalCondition', 'Hospital', 'MedicalOrganization'].includes(t)
                              ? 'bg-brand-50 text-brand'
                              : 'bg-surface-base text-ink-soft'
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 진단 */}
                {analysis.diagnosis && analysis.diagnosis.length > 0 && (
                  <div className="mb-3 rounded border border-brand/20 bg-brand-50/40 px-3 py-2.5 text-[11px]">
                    <div className="mb-1.5 flex items-center gap-1 font-semibold text-brand">
                      <Lightbulb className="h-3 w-3" />
                      진단 — 메디맵 가이드 v3 비교
                    </div>
                    <ul className="space-y-1 pl-4 text-ink-soft">
                      {analysis.diagnosis.map((d, i) => (
                        <li key={i} className="list-disc">{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 권장 변경 */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div className="mb-3 rounded border border-status-warning/30 bg-status-warningSoft/30 px-3 py-2.5 text-[11px]">
                    <div className="mb-1.5 font-semibold text-status-warning">
                      💡 메디맵 콘텐츠 가이드 v4 권장 변경
                    </div>
                    <ol className="space-y-1 pl-4 text-ink-soft">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="list-decimal">{r}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 운영자 메모 */}
                <div className="mb-3">
                  <label className="mb-1 block text-[11px] font-semibold text-ink">
                    운영자 메모 (선택)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="이 도메인의 패턴 중 메디맵 가이드에 어떻게 반영할지... (예: FAQ schema 먼저 도입, H2 8개로 확장 등)"
                    className="w-full rounded border border-border bg-surface-base px-2 py-1.5 text-[11px]"
                    rows={2}
                  />
                </div>

                {/* 저장 결과 */}
                {savedMessage && (
                  <div
                    className={cn(
                      'mb-2 rounded border px-3 py-1.5 text-[11px]',
                      savedMessage.startsWith('✓')
                        ? 'border-brand/30 bg-brand-50 text-brand'
                        : 'border-status-danger/30 bg-status-dangerSoft/40 text-status-danger'
                    )}
                  >
                    {savedMessage.startsWith('✓') && <CheckCircle className="mr-1 inline h-3 w-3" />}
                    {savedMessage}
                  </div>
                )}

                {/* 액션 */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={close}
                    className="rounded border border-border px-3 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-soft"
                  >
                    닫기
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || !!savedMessage}
                    className="inline-flex items-center gap-1 rounded bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    가이드에 추가
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-ink-faint">
                  ℹ️ Phase 2 (다음 라운드) 에 generator.py 가 콘텐츠 생성 시 이 진단을 prompt 로 주입 예정. 현재는 누적만.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note?: string;
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
      {note && <div className="mt-0.5 text-[9px] text-ink-faint">{note}</div>}
    </div>
  );
}
