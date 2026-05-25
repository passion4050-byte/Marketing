/**
 * 블로그 콘텐츠 — 1소재 = 5글 변형 자동 생성.
 * Figma 시안(node 804:410) IA 100% 싱크로.
 */
'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Edit3, Send, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { blogStats, contentTopics as baseTopics } from '@/lib/mock-data';
import { formatKstDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { copyToClipboard, downloadMarkdownBundle, showToast } from '@/lib/clientActions';
import type { BlogPostVariant, ContentTopic, PublishStatus } from '@/lib/types';

const STATUS_CHIP: Record<PublishStatus, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'chip-warning' },
  review: { label: '검수 중', cls: 'chip-brand' },
  published: { label: '발행됨', cls: 'chip-success' },
  archived: { label: '보관됨', cls: 'chip-neutral' }
};

const BADGE_CHIP: Record<string, string> = {
  수술정보: 'chip-brand',
  비용: 'chip-warning',
  이벤트: 'chip-success',
  후기: 'chip-success',
  비교: 'chip-neutral'
};

export default function BlogPage() {
  const [topics, setTopics] = useState<ContentTopic[]>(baseTopics);
  const [activeTopicId, setActiveTopicId] = useState(baseTopics[0].id);
  const [newTopic, setNewTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  const active = useMemo(
    () => topics.find((t) => t.id === activeTopicId) ?? topics[0],
    [topics, activeTopicId]
  );

  const KPIS = [
    { label: '이번 달 생성 소재', value: blogStats.topicsThisMonth, suffix: '개' },
    { label: '누적 블로그 글', value: blogStats.totalPosts, suffix: '건' },
    { label: '배포 완료', value: blogStats.distributed, suffix: '건' },
    { label: '검수 대기', value: blogStats.reviewing, suffix: '건' }
  ];

  const onGenerate = async () => {
    const topic = newTopic.trim();
    if (!topic) {
      showToast('소재를 입력하세요', { kind: 'error' });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'generate failed');
      const newId = `topic-gen-${Date.now()}`;
      const created: ContentTopic = {
        id: newId,
        label: topic,
        badge: '수술정보',
        brief: data.brief,
        posts: data.posts.map((p: any) => ({
          ...p,
          topicId: newId,
          format: p.format ?? 'info'
        })) as BlogPostVariant[],
        createdAt: new Date().toISOString()
      };
      setTopics((prev) => [created, ...prev]);
      setActiveTopicId(newId);
      setNewTopic('');
      showToast(`5글 생성 완료 — ${topic.slice(0, 18)}`);
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const copyPost = async (post: BlogPostVariant) => {
    const md = [
      `# ${post.title}`,
      '',
      post.lead,
      '',
      post.body ?? '',
      ...(post.bullets ? ['', ...post.bullets.map((b) => `- ${b}`)] : [])
    ].join('\n');
    const ok = await copyToClipboard(md);
    showToast(ok ? '본문 복사됨 (markdown)' : '복사 실패', { kind: ok ? 'success' : 'error' });
  };

  const onBundleDownload = () => {
    if (!active || active.posts.length === 0) {
      showToast('이 소재에 발행 글이 없습니다', { kind: 'error' });
      return;
    }
    downloadMarkdownBundle(
      `medimap-${active.label.replace(/\s+/g, '-')}.md`,
      active.posts.map((p) => ({ title: p.title, body: `${p.lead}\n\n${p.body ?? ''}` }))
    );
    showToast('5글 .md 묶음 다운로드 시작');
  };

  const onNaverPublish = (postId: string) => {
    setTopics((prev) =>
      prev.map((t) =>
        t.id !== activeTopicId
          ? t
          : {
              ...t,
              posts: t.posts.map((p) =>
                p.id === postId ? { ...p, status: 'published' as PublishStatus } : p
              )
            }
      )
    );
    showToast('네이버 발행 대기열에 추가됨 (운영 환경 연동 시 즉시 발행)');
  };

  return (
    <>
      <Header
        title="블로그 콘텐츠"
        subtitle="소재 1개당 5개의 블로그 글 변형(정보·후기·Q&A·비교·가이드)을 자동 생성하고 네이버 블로그·홈페이지에 배포합니다."
      />

      <section className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="card card-pad">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">
              {k.value}
              <span className="ml-1 text-base font-semibold text-ink-muted">{k.suffix}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="px-8">
        <div className="card flex items-center gap-3 px-5 py-4">
          <input
            className="input-base"
            placeholder="새 소재 입력 (예: 안구건조증 관리 방법, 노안 초기 증상...)"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !generating && onGenerate()}
            disabled={generating}
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="btn-primary shrink-0 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" /> {generating ? '생성 중…' : '소재 + 5글 생성'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 px-8 py-6 lg:grid-cols-[380px_1fr]">
        <aside className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">생성된 소재 ({topics.length})</h2>
            <span className="section-subtle">1소재 = 5글</span>
          </header>
          <ul className="divide-y divide-border">
            {topics.map((t) => {
              const isActive = t.id === activeTopicId;
              const fillCount = t.posts.length;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTopicId(t.id)}
                    className={cn(
                      'w-full px-5 py-4 text-left transition',
                      isActive ? 'bg-brand-50' : 'hover:bg-surface-subtle'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className={BADGE_CHIP[t.badge] ?? 'chip-neutral'}>{t.badge}</span>
                      <span className="text-[11px] text-ink-muted">{formatKstDateTime(t.createdAt)}</span>
                    </div>
                    <div className="truncate text-sm font-bold text-ink">{t.label}</div>
                    <p className="mt-1 truncate text-xs text-ink-muted">{t.brief}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${(fillCount / 5) * 100}%` }}
                          aria-hidden
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-ink-muted">{fillCount}/5글</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border px-5 py-3 text-xs text-ink-muted">
            ✨ 상단 입력창에서 소재를 생성하면 5개 글이 자동 작성됩니다.
          </p>
        </aside>

        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">소재</div>
              <h2 className="mt-1 text-lg font-bold text-ink">{active.label}</h2>
              <p className="mt-1 text-xs text-ink-muted">{active.brief}</p>
            </div>
            <button type="button" onClick={onBundleDownload} className="btn-secondary text-xs">
              <Download className="h-3.5 w-3.5" /> 5글 일괄 다운로드 (.md)
            </button>
          </header>

          {active.posts.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-ink-muted">
              아직 생성된 글이 없습니다. 우측 상단 '5글 생성'으로 자동 작성하세요.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {active.posts.map((p) => (
                <li key={p.id} className="px-6 py-6">
                  <div className="grid grid-cols-[60px_1fr_auto] items-start gap-4">
                    <div className="text-center">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        {String(p.variantNo).padStart(2, '0')}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold text-ink-faint">POST</div>
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="chip-brand">{p.formatLabel}</span>
                        <span className="text-[11px] text-ink-muted">{p.cue}</span>
                        <span className={STATUS_CHIP[p.status].cls}>{STATUS_CHIP[p.status].label}</span>
                      </div>
                      <h3 className="text-base font-bold text-ink">{p.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.lead}</p>

                      {p.body && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.body}</p>}
                      {p.bullets && (
                        <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                          {p.bullets.map((b, i) => (
                            <li key={i} className="rounded-md bg-surface-subtle px-3 py-1.5">
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                        <div className="flex flex-wrap gap-1">
                          <span className="font-semibold">KEYWORDS</span>
                          {p.keywords.map((k) => (
                            <span key={k} className="chip-brand">#{k}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <span>읽기 {p.readMinutes}분</span>
                          <span>{p.charCount}자</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => showToast('편집 기능은 차후 발행 워크플로에 통합 예정', { kind: 'info' })}
                        className="btn-secondary text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> 편집
                      </button>
                      <button type="button" onClick={() => copyPost(p)} className="btn-secondary text-xs">
                        <Copy className="h-3.5 w-3.5" /> 본문 복사
                      </button>
                      <button
                        type="button"
                        onClick={() => onNaverPublish(p.id)}
                        disabled={p.status === 'published'}
                        className="btn-primary text-xs disabled:opacity-60"
                      >
                        <Send className="h-3.5 w-3.5" /> {p.status === 'published' ? '발행됨' : '네이버 발행'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
