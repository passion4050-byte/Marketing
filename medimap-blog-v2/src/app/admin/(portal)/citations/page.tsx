'use client';

import { useState } from 'react';
import { Bell, BellOff, ExternalLink } from 'lucide-react';
import { citationEvents as base, type CitationEvent } from '@/lib/admin-mock';
import { cn } from '@/lib/cn';

const ENGINE_COLOR: Record<CitationEvent['engine'], string> = {
  chatgpt: 'bg-engine-chatgpt',
  claude: 'bg-engine-claude',
  gemini: 'bg-engine-gemini',
  perplexity: 'bg-engine-perplexity'
};

export default function CitationsPage() {
  const [events] = useState<CitationEvent[]>(base);
  const [slackOn, setSlackOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
        <p className="mt-1 text-sm text-ink-muted">4 엔진에서 자사 콘텐츠가 인용된 이벤트 + 알림 설정</p>
      </header>

      <section className="card mb-4 p-4">
        <h2 className="text-sm font-bold text-ink">알림 채널</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={() => setSlackOn((v) => !v)} className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            slackOn ? 'border-brand bg-brand-50 text-brand-700' : 'border-border text-ink-muted'
          )}>
            {slackOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            Slack {slackOn ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setEmailOn((v) => !v)} className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            emailOn ? 'border-brand bg-brand-50 text-brand-700' : 'border-border text-ink-muted'
          )}>
            {emailOn ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            Email {emailOn ? 'ON' : 'OFF'}
          </button>
          <span className="text-[11px] text-ink-muted">
            4 엔진 중 어디든 자사 콘텐츠 첫 인용되면 즉시 알림 (운영 환경 연동 후)
          </span>
        </div>
      </section>

      <div className="space-y-2">
        {events.map((c) => (
          <div key={c.id} className="card flex items-start gap-3 p-4">
            <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', ENGINE_COLOR[c.engine])} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="chip-brand">{c.tenantName}</span>
                <span className="text-xs font-bold uppercase text-ink">{c.engine}</span>
                <span className="text-[11px] text-ink-muted">{new Date(c.citedAt).toLocaleString('ko-KR')}</span>
                {c.notified && <span className="chip-success">알림 전송됨</span>}
              </div>
              <div className="mt-1 text-sm font-semibold text-ink">"{c.query}"</div>
              <p className="mt-1 text-xs text-ink-soft">{c.excerpt}</p>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline">
                {c.url} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
