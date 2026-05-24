/**
 * 영상 스크립트 — Shorts / Reels / YouTube 자동 합성.
 * 사용자 목표 보강: 영상 컨텐츠는 메타·캡션 텍스트로 LLM 인덱싱.
 */
import { Clapperboard, Copy, Send, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { videoScripts } from '@/lib/mock-data';
import { cn } from '@/lib/cn';

const CHANNEL_LABEL: Record<string, string> = {
  shorts: 'YouTube Shorts',
  reels: 'Instagram Reels',
  youtube: 'YouTube'
};
const STATUS_CHIP: Record<string, string> = {
  draft: 'chip-warning',
  review: 'chip-brand',
  published: 'chip-success',
  archived: 'chip-neutral'
};
const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  review: '검수 중',
  published: '발행됨',
  archived: '보관됨'
};

export const dynamic = 'force-static';

export default function VideoScriptPage() {
  return (
    <>
      <Header
        title="영상 스크립트"
        subtitle="Shorts·Reels·YouTube용 30~60초 영상 스크립트를 자동 생성하고 메타·캡션 텍스트로 AI 인덱싱을 함께 챙깁니다."
      />

      <section className="px-8 py-6">
        <div className="card flex items-center gap-3 px-5 py-4">
          <input className="input-base" placeholder="새 영상 소재 입력 (예: 라섹 회복기 시간대별 컨디션, 다초점 렌즈 후기...)" />
          <button type="button" className="btn-primary shrink-0">
            <Sparkles className="h-4 w-4" /> 스크립트 생성
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 px-8 pb-10 lg:grid-cols-2">
        {videoScripts.map((v) => (
          <article key={v.id} className="card">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-100 text-brand-700">
                  <Clapperboard className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">{v.title}</div>
                  <div className="text-[11px] text-ink-muted">
                    {CHANNEL_LABEL[v.channel]} · {v.duration}
                  </div>
                </div>
              </div>
              <span className={cn(STATUS_CHIP[v.status])}>{STATUS_LABEL[v.status]}</span>
            </header>
            <div className="px-5 py-5">
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
                Hook · {v.hook}
              </div>
              <ol className="mt-4 space-y-2">
                {v.beats.map((b, i) => (
                  <li key={i} className="grid grid-cols-[56px_1fr] items-baseline gap-3 text-sm text-ink-soft">
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-center font-mono text-xs text-ink-muted">{b.start}</span>
                    <span>{b.line}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/40 px-3 py-2 text-xs text-brand-700">
                CTA · {v.cta}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button type="button" className="btn-secondary text-xs">
                <Copy className="h-3.5 w-3.5" /> 스크립트 복사
              </button>
              <button type="button" className="btn-primary text-xs">
                <Send className="h-3.5 w-3.5" /> 채널 업로드
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
