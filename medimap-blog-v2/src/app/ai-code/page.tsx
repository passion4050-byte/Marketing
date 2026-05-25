/**
 * AI 코드 (JSON-LD) — Schema.org 자동 합성.
 * Figma 시안(node 804:401) IA 100% 싱크로.
 */
'use client';

import { useMemo, useState } from 'react';
import { Code2, Copy, Download, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { schemaEntities } from '@/lib/mock-data';
import { tokenizeJson } from '@/lib/aeo';
import { cn } from '@/lib/cn';
import { copyToClipboard, downloadJsonLdHtml, showToast } from '@/lib/clientActions';

const KPIS = [
  { label: '활성 엔티티', value: '5 / 6', unit: '개' },
  { label: '등록 필드', value: '110', unit: '필드' },
  { label: '평균 인덱싱', value: '82%', unit: '크롤러' },
  { label: '마지막 배포', value: '오늘 09:14', unit: 'Googlebot' }
];

export default function AiCodePage() {
  const [entities, setEntities] = useState(schemaEntities);

  const payloads = useMemo(() => entities.filter((e) => e.active).map((e) => e.payload), [entities]);
  const tokens = useMemo(() => tokenizeJson(payloads), [payloads]);

  const toggle = (idx: number) => {
    setEntities((prev) => prev.map((e, i) => (i === idx ? { ...e, active: !e.active } : e)));
  };

  const copyJson = async () => {
    if (payloads.length === 0) {
      showToast('활성 엔티티가 없습니다', { kind: 'error' });
      return;
    }
    const raw = JSON.stringify(payloads, null, 2);
    const wrapped = `<script type="application/ld+json">\n${raw}\n</script>`;
    const ok = await copyToClipboard(wrapped);
    showToast(ok ? `JSON-LD ${payloads.length}개 엔티티 복사됨` : '복사 실패', {
      kind: ok ? 'success' : 'error'
    });
  };

  const downloadHtml = () => {
    if (payloads.length === 0) {
      showToast('활성 엔티티가 없습니다. 토글을 켜주세요', { kind: 'error' });
      return;
    }
    downloadJsonLdHtml(`medimap-geo-jsonld-${new Date().toISOString().slice(0, 10)}.html`, payloads);
    showToast('.html 다운로드 시작');
  };

  return (
    <>
      <Header
        title="AI 코드 (JSON-LD)"
        subtitle="병원 홈페이지에 삽입해 Googlebot · GPTBot 등 AI 크롤러가 정확하게 읽어가게 만드는 구조화 데이터입니다."
      />

      <section className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="card card-pad">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="text-xs text-ink-muted">{k.unit}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 px-8 pb-10 lg:grid-cols-[500px_1fr]">
        <div className="card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">스키마 엔티티</h2>
            <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              SCHEMA.ORG 호환
            </span>
          </div>
          <ul className="divide-y divide-border">
            {entities.map((e, idx) => (
              <li key={e.type}>
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-surface-subtle"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
                    <Code2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-ink">
                      @type · <span className="font-mono">{e.type}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{e.summary}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex h-6 w-12 items-center rounded-full px-1 transition',
                      e.active ? 'bg-brand' : 'bg-surface-muted'
                    )}
                    aria-label={e.active ? 'ON' : 'OFF'}
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full bg-white shadow transition-transform',
                        e.active && 'translate-x-6'
                      )}
                    />
                    <span className={cn('ml-2 text-[10px] font-bold', e.active ? 'text-white' : 'text-ink-muted')}>
                      {e.active ? 'ON' : 'OFF'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="section-title">JSON-LD 코드 미리보기</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadHtml} className="btn-secondary text-xs">
                <Download className="h-3.5 w-3.5" /> .html 다운로드
              </button>
              <button type="button" onClick={copyJson} className="btn-primary text-xs">
                <Copy className="h-3.5 w-3.5" /> 코드 복사
              </button>
            </div>
          </div>
          <div className="px-6 py-5">
            <pre className="json-preview overflow-x-auto whitespace-pre-wrap">
              <span className="tk-punct">&lt;script type=&quot;application/ld+json&quot;&gt;</span>
              {'\n'}
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={
                    t.kind === 'key'
                      ? 'tk-key'
                      : t.kind === 'str'
                        ? 'tk-str'
                        : t.kind === 'num'
                          ? 'tk-num'
                          : t.kind === 'punct'
                            ? 'tk-punct'
                            : ''
                  }
                >
                  {t.text}
                </span>
              ))}
              {'\n'}
              <span className="tk-punct">&lt;/script&gt;</span>
            </pre>
          </div>
          <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-ink-muted">
            <span>병원 홈페이지 &lt;head&gt; 또는 &lt;body&gt; 내부에 위 코드를 그대로 삽입하세요.</span>
            <div className="flex items-center gap-3">
              <a
                href="https://search.google.com/test/rich-results"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                Schema 검증 도구 열기 <ExternalLink className="h-3 w-3" />
              </a>
              <span className="rounded-md bg-brand px-2 py-1 font-semibold text-white">자동 최적화</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
