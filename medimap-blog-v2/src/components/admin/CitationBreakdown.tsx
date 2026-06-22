'use client';

/**
 * Round 64 (2026-06-22) — 키워드별 인용 드릴다운 (공용).
 *
 * 경쟁사/자사 인용 페이지의 도메인 상세 펼침에서 사용.
 * "어떤 키워드로, 몇 번, 어느 AI 엔진이, 어떤 콘텐츠(URL)를 인용했는지" 세분화.
 */
import { ExternalLink } from 'lucide-react';

// Round 69 — 도메인 → https://{domain} 새 탭 이동 헬퍼.
function domainHref(domain: string): string {
  return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
}

// 차트 Y축 라벨용 (recharts custom tick — SVG text)
export function DomainTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const { x = 0, y = 0, payload } = props;
  const domain = payload?.value ?? '';
  return (
    <text
      x={x}
      y={y}
      dy={3}
      textAnchor="end"
      fontSize={10}
      fill="#2563EB"
      style={{ cursor: 'pointer', textDecoration: 'underline' }}
      onClick={() => window.open(domainHref(domain), '_blank', 'noopener,noreferrer')}
    >
      {domain}
    </text>
  );
}

// 텍스트 도메인 링크 (표/박스용 — 행 클릭 expand 와 겹치지 않게 stopPropagation)
export function DomainLink({ domain, className }: { domain: string; className?: string }) {
  return (
    <a
      href={domainHref(domain)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={className ?? 'hover:underline'}
      title={`${domain} 새 탭으로 열기`}
    >
      {domain}
    </a>
  );
}

export type Citation = {
  keyword: string;
  count: number;
  engines: string[];
  urls: string[];
};

const ENGINE_META: Record<string, { label: string; color: string }> = {
  claude: { label: 'Claude', color: '#D97757' },
  gemini: { label: 'Gemini', color: '#1B68FF' },
  perplexity: { label: 'Perplexity', color: '#20808D' },
  openai: { label: 'ChatGPT', color: '#10A37F' },
};

export function EngineChip({ engine, count }: { engine: string; count?: number }) {
  const meta = ENGINE_META[engine.toLowerCase()] ?? { label: engine, color: '#64748B' };
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
    >
      {meta.label}
      {count != null && <span className="font-mono">×{count}</span>}
    </span>
  );
}

export function CitationBreakdown({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) {
    return <div className="text-[11px] text-ink-faint">상세 인용 데이터 없음</div>;
  }
  return (
    <div className="space-y-2">
      {citations.map((ct, ci) => (
        <div key={ci} className="rounded-md border border-border bg-surface-base px-3 py-2">
          {/* 키워드 + 인용수 + 엔진 chip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
              {ct.keyword}
            </span>
            <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">
              인용 ×{ct.count}
            </span>
            {ct.engines.map((e) => (
              <EngineChip key={e} engine={e} />
            ))}
          </div>
          {/* 인용된 콘텐츠 URL */}
          {ct.urls.length > 0 ? (
            <ul className="mt-1.5 space-y-1">
              {ct.urls.map((url, ui) => (
                <li key={ui} className="flex items-start gap-1.5">
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[11px] text-brand-700 underline decoration-dotted hover:text-brand"
                  >
                    {decodeURIComponent(url).slice(0, 100)}
                    {url.length > 100 && '…'}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-[10px] text-ink-faint">콘텐츠 URL 없음 (도메인만 인용)</div>
          )}
        </div>
      ))}
    </div>
  );
}
