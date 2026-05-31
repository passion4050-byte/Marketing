'use client';

/**
 * /admin/content-settings — 자동 발행 정책 운영자 UI
 *
 * 2026-05-28 Phase 3 — Round 22
 * - content_settings 테이블 (key-value) 의 12개 정책을 그룹별로 표시
 * - 각 설정마다 인라인 저장 (PATCH /api/admin/content-settings)
 * - generator.py + image_picker.py 가 매 발행 시 이 값을 읽음
 *
 * 운영자 결정사항 (사용자 시드):
 *   tone = friendly_natural, length 3000~5000, cta = medimap_kakao,
 *   keyword_seed = auto, disclaimer = amber_box_v3, image 5장 (cover 1 + 본문 4)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface SettingRow {
  id: number;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
  updated_at: string | null;
}

// UI 그룹 정의 — 표시 순서 & 그룹별 분리
type FieldType = 'radio' | 'number' | 'text' | 'select' | 'textarea';
interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  options?: { value: string; label: string }[];
}
interface GroupDef {
  group: string;
  fields: FieldDef[];
}

const GROUPS: GroupDef[] = [
  {
    group: '글 톤 · 길이',
    fields: [
      {
        key: 'tone',
        label: '글 어조',
        type: 'radio',
        hint: '독자가 글을 읽으며 느낄 톤 — 모든 발행 콘텐츠 공통.',
        options: [
          { value: 'friendly_natural', label: '친근체 (자연스러운 느낌) ★' },
          { value: 'formal', label: '격식체' },
          { value: 'casual', label: '구어체' },
        ],
      },
      { key: 'length_min', label: '최소 글 길이 (자)', type: 'number', hint: '한글 자 기준. LLM에 명시되는 하한.' },
      { key: 'length_max', label: '최대 글 길이 (자)', type: 'number', hint: '한글 자 기준. LLM에 명시되는 상한.' },
    ],
  },
  {
    group: 'CTA · 키워드',
    fields: [
      {
        key: 'cta_target',
        label: 'CTA 연락 채널',
        type: 'radio',
        hint: '본문 마지막 CTA 박스에 어느 채널을 노출할지.',
        options: [
          { value: 'medimap_kakao', label: '메디맵 카카오 채널 ★' },
          { value: 'partner_direct', label: '병원(파트너) 직접 연락처' },
        ],
      },
      {
        key: 'keyword_seed_mode',
        label: '키워드 시드 모드',
        type: 'radio',
        hint: 'auto 면 키워드 풀에서 자동 선택, manual 이면 어드민 입력 키워드만 사용.',
        options: [
          { value: 'auto', label: 'auto (자동) ★' },
          { value: 'manual', label: 'manual (수동 입력만)' },
        ],
      },
    ],
  },
  {
    group: '의료법 · 컴플라이언스',
    fields: [
      {
        key: 'disclaimer_style',
        label: '의료법 disclaimer 스타일',
        type: 'radio',
        hint: '글 하단 안내 박스. 현재 v3 amber 박스 디자인 유지 중.',
        options: [
          { value: 'amber_box_v3', label: 'amber box v3 (현재) ★' },
          { value: 'plain', label: '단순 텍스트' },
        ],
      },
    ],
  },
  {
    group: '일러스트 · 이미지',
    fields: [
      {
        key: 'image_count_total',
        label: '글 1편 당 일러스트 총 개수',
        type: 'number',
        hint: 'cover 1 + 본문 N. 사용자 정책: 최소 5장.',
      },
      {
        key: 'image_style',
        label: '일러스트 기본 스타일',
        type: 'select',
        hint: 'Pollinations.AI 프롬프트 prefix.',
        options: [
          { value: 'pixar_3d', label: 'Pixar Disney 3D animation (현재) ★' },
          { value: 'watercolor', label: 'Watercolor' },
          { value: 'editorial', label: 'Editorial illustration' },
          { value: 'flat_design', label: 'Flat design' },
        ],
      },
      {
        key: 'image_realistic_only_for',
        label: '실사진 톤 허용 카테고리',
        type: 'radio',
        hint: '실사 톤은 모델 의존성이 높아 기본은 일러스트만 허용.',
        options: [
          { value: 'clinic_interior', label: '병원 인테리어만 ★' },
          { value: 'none', label: '모두 일러스트' },
        ],
      },
    ],
  },
  {
    group: '발행 스케줄',
    fields: [
      {
        key: 'publish_schedule',
        label: 'cron 시각 (UTC)',
        type: 'text',
        hint: '예: 23:00_utc_daily (= 매일 08:00 KST). 실제 cron 변경은 .github/workflows/auto-publish.yml 별도 수정.',
      },
    ],
  },
  {
    group: '구조 · 리드 패턴 풀',
    fields: [
      {
        key: 'content_pattern_pool',
        label: '글 구조 패턴 (comma 구분)',
        type: 'textarea',
        hint: 'random.choice 로 회전. 예: staged_guide,comparison,case_study,faq_heavy,checklist,data_driven',
      },
      {
        key: 'lead_pattern_pool',
        label: '리드 문장 패턴 (comma 구분)',
        type: 'textarea',
        hint: 'random.choice 로 회전. 예: question,stat,case,doctor_quote',
      },
    ],
  },
];

export default function ContentSettingsPage() {
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content-settings', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      const items: SettingRow[] = data.items ?? [];
      setRows(items);
      const next: Record<string, string> = {};
      for (const r of items) next[r.setting_key] = r.setting_value ?? '';
      setDraft(next);
    } catch (e) {
      showToast(`로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const original = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rows) m[r.setting_key] = r.setting_value ?? '';
    return m;
  }, [rows]);

  const save = async (key: string) => {
    const value = draft[key] ?? '';
    if (value === (original[key] ?? '')) {
      showToast('변경 사항이 없습니다.', { kind: 'info' });
      return;
    }
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/content-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'save failed');
      showToast(`${key} 저장됨`);
      await load();
    } catch (e) {
      showToast(`저장 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  const renderField = (f: FieldDef) => {
    const value = draft[f.key] ?? '';
    const dirty = value !== (original[f.key] ?? '');
    const desc = rows.find((r) => r.setting_key === f.key)?.description;
    const updatedAt = rows.find((r) => r.setting_key === f.key)?.updated_at;

    return (
      <div key={f.key} className="border-t border-border py-4 first:border-t-0 first:pt-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <label className="text-sm font-semibold text-ink">{f.label}</label>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-brand-700">
                {f.key}
              </code>
              {f.hint && <span className="ml-2">{f.hint}</span>}
              {!f.hint && desc && <span className="ml-2">{desc}</span>}
            </div>
          </div>
          {updatedAt && (
            <div className="shrink-0 text-[10px] text-ink-faint sm:ml-4">
              마지막 수정: {new Date(updatedAt).toLocaleString('ko-KR')}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {f.type === 'radio' && f.options && (
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    'cursor-pointer rounded-md border px-3 py-1.5 text-xs transition',
                    value === o.value
                      ? 'border-brand bg-brand-50 font-semibold text-brand-700'
                      : 'border-border bg-surface-base text-ink-soft hover:bg-surface-subtle'
                  )}
                >
                  <input
                    type="radio"
                    name={f.key}
                    value={o.value}
                    checked={value === o.value}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}

          {f.type === 'select' && f.options && (
            <select
              className="input-base text-sm sm:w-[320px]"
              value={value}
              onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}

          {f.type === 'number' && (
            <input
              type="number"
              className="input-base sm:w-[200px]"
              value={value}
              onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          )}

          {f.type === 'text' && (
            <input
              type="text"
              className="input-base sm:w-[360px]"
              value={value}
              onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          )}

          {f.type === 'textarea' && (
            <textarea
              className="input-base h-20 w-full font-mono text-xs"
              value={value}
              onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          )}

          <button
            type="button"
            onClick={() => void save(f.key)}
            disabled={!dirty || savingKey === f.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition',
              dirty
                ? 'bg-brand text-white hover:bg-brand-700'
                : 'cursor-not-allowed bg-surface-subtle text-ink-faint'
            )}
          >
            {savingKey === f.key ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {dirty ? '저장' : '저장됨'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">콘텐츠 설정</h1>
          <p className="admin-page-desc">콘텐츠 자동 생성 정책 (프롬프트 · 카테고리 · CTA) 을 관리합니다</p>
        </div>
      </header>

      <div className="card mb-5 flex items-start gap-3 border-l-4 border-l-status-warn bg-amber-50/70 p-4 text-[12px] text-ink-soft">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warn" />
        <div>
          <div className="font-semibold text-ink">변경은 즉시 다음 발행 플랜부터 반영됩니다.</div>
        </div>
      </div>

      {loading && (
        <div className="card flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-muted">
          content_settings 테이블이 비어 있습니다. <br />
          <span className="mt-1 inline-block text-[11px]">
            db/migrations/022_content_settings_table.sql 를 먼저 실행해 주세요.
          </span>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.group} className="card p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-700">
                {g.group}
              </h2>
              <div>{g.fields.map((f) => renderField(f))}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
