/**
 * Round 36 fix 3 (2026-05-31) — 경쟁사 인용 URL 메타 구조 학습 버튼.
 *
 * 동작:
 *   1. [반영하기] 클릭 → /api/admin/learn-from-url 분석 모드 호출
 *   2. 추출된 patterns 모달 표시 (제목/H2/word count/Schema 등)
 *   3. 운영자가 검수 + notes 입력 + [가이드에 추가] 클릭
 *   4. /api/admin/learn-from-url?save=true 호출 → learned_insights INSERT
 *   5. 토스트로 결과 알림
 */
'use client';

import { useState } from 'react';
import { Loader2, Sparkles, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

type Patterns = {
  title: { text: string; length: number } | null;
  meta_description: { text: string; length: number } | null;
  h1_count: number;
  h2_count: number;
  h3_count: number;
  h2_samples: string[];
  word_count: number;
  image_count: number;
  image_with_alt_count: number;
  internal_link_count: number;
  schema_types: string[];
  has_faq_schema: boolean;
  has_medical_schema: boolean;
  table_count: number;
  ul_ol_count: number;
};

type AnalyzeResponse = {
  ok: boolean;
  error?: string;
  source_url?: string;
  fetched_url?: string;
  patterns?: Patterns;
  note?: string;
};

export function LearnFromUrlButton({
  url,
  sourceDomain,
  sourceTier,
  keyword,
  domainCategory,
  tenantId,
}: {
  url: string;
  sourceDomain?: string;
  sourceTier?: string;
  keyword?: string;
  domainCategory?: string;
  tenantId?: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [notes, setNotes] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const open = async () => {
    setLoading(true);
    setAnalysis(null);
    setSavedMessage(null);
    setNotes('');
    try {
      const res = await fetch('/api/admin/learn-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          source_domain: sourceDomain,
          source_tier: sourceTier,
          keyword,
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
    if (!analysis?.patterns) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/learn-from-url?save=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          source_domain: sourceDomain,
          source_tier: sourceTier,
          keyword,
          domain_category: domainCategory,
          tenant_id: tenantId,
          patterns: analysis.patterns,
          notes: notes.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        setSavedMessage('✓ 콘텐츠 가이드에 추가됨 (learned_insights)');
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
        onClick={open}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded border border-brand/30 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand hover:bg-brand-100 disabled:opacity-50"
        title="이 URL 의 메타 구조 학습 → 콘텐츠 가이드에 반영"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        반영하기
      </button>

      {/* Modal */}
      {analysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-base p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">URL 메타 구조 분석</h3>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  <span className="font-mono">{(analysis.fetched_url ?? url).slice(0, 80)}</span>
                  {keyword && <span className="ml-2">· 키워드: <strong>{keyword}</strong></span>}
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
              </div>
            )}

            {analysis.ok && analysis.patterns && (
              <>
                {/* 핵심 지표 그리드 */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Metric label="제목 길이" value={`${analysis.patterns.title?.length ?? 0}자`} note={analysis.patterns.title?.text.slice(0, 50)} />
                  <Metric label="본문 단어 수" value={`${analysis.patterns.word_count}`} note={analysis.patterns.word_count > 1000 ? '장문 (1000+)' : '단문'} />
                  <Metric label="H2/H3 개수" value={`${analysis.patterns.h2_count} / ${analysis.patterns.h3_count}`} note={analysis.patterns.h2_count >= 5 ? '구조 풍부' : '단순'} />
                  <Metric label="이미지" value={`${analysis.patterns.image_count} (alt ${analysis.patterns.image_with_alt_count})`} note={analysis.patterns.image_with_alt_count === analysis.patterns.image_count ? 'SEO ✓' : 'alt 누락'} />
                  <Metric label="내부 링크" value={`${analysis.patterns.internal_link_count}`} note={analysis.patterns.internal_link_count >= 5 ? '회유성 ↑' : '낮음'} />
                  <Metric label="표/리스트" value={`${analysis.patterns.table_count}t / ${analysis.patterns.ul_ol_count}l`} note="비교 표 + 가독성" />
                </div>

                {/* Schema.org */}
                <div className="mt-3 rounded border border-border bg-surface-soft px-3 py-2 text-[11px]">
                  <div className="mb-1 font-semibold text-ink">Schema.org / JSON-LD</div>
                  {analysis.patterns.schema_types.length === 0 ? (
                    <div className="text-ink-muted">없음 — AI grounding 약함</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {analysis.patterns.schema_types.map((t) => (
                        <span
                          key={t}
                          className={cn(
                            'rounded px-1.5 py-0.5 font-mono',
                            t === 'FAQPage' || ['MedicalProcedure', 'MedicalCondition', 'Hospital'].includes(t)
                              ? 'bg-brand-50 text-brand'
                              : 'bg-surface-base text-ink-soft'
                          )}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex gap-3 text-[10px] text-ink-muted">
                    <span>FAQ: {analysis.patterns.has_faq_schema ? '✓' : '✗'}</span>
                    <span>Medical: {analysis.patterns.has_medical_schema ? '✓' : '✗'}</span>
                  </div>
                </div>

                {/* H2 샘플 */}
                {analysis.patterns.h2_samples.length > 0 && (
                  <div className="mt-3 rounded border border-border bg-surface-soft px-3 py-2 text-[11px]">
                    <div className="mb-1 font-semibold text-ink">H2 제목 패턴 (샘플)</div>
                    <ol className="list-decimal pl-4 text-ink-soft">
                      {analysis.patterns.h2_samples.map((h, i) => (
                        <li key={i} className="truncate">{h}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 운영자 메모 */}
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-semibold text-ink">
                    운영자 메모 (선택)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="이 패턴을 위서클 콘텐츠 가이드에 어떻게 반영할지... (예: H2 7개 이상 권장, FAQ schema 필수)"
                    className="w-full rounded border border-border bg-surface-base px-2 py-1.5 text-[11px]"
                    rows={2}
                  />
                </div>

                {/* 저장 결과 */}
                {savedMessage && (
                  <div
                    className={cn(
                      'mt-2 rounded border px-3 py-1.5 text-[11px]',
                      savedMessage.startsWith('✓')
                        ? 'border-brand/30 bg-brand-50 text-brand'
                        : 'border-status-danger/30 bg-status-dangerSoft/40 text-status-danger'
                    )}
                  >
                    {savedMessage.startsWith('✓') && <CheckCircle className="mr-1 inline h-3 w-3" />}
                    {savedMessage}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="mt-4 flex items-center justify-end gap-2">
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
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    가이드에 추가
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-ink-faint">
                  ℹ️ 저장된 패턴은 Phase 2 (다음 라운드) 에 generator.py 가 콘텐츠 생성 시 prompt 로 주입 예정.
                  현재는 검수/누적만.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded border border-border bg-surface-base px-2 py-1.5">
      <div className="text-[10px] text-ink-muted">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
      {note && <div className="mt-0.5 text-[9px] text-ink-faint">{note}</div>}
    </div>
  );
}
