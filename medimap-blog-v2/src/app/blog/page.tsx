/**
 * 블로그 콘텐츠 — 1소재 = 5글 변형 자동 생성 + inline 편집.
 */
'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Edit3, Send, Sparkles, X } from 'lucide-react';
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

interface DraftPost {
  title: string;
  lead: string;
  body: string;
  bullets: string;   // line-separated for textarea
  keywords: string;  // comma-separated
}

export default function BlogPage() {
  const [topics, setTopics] = useState<ContentTopic[]>(baseTopics);
  const [activeTopicId, setActiveTopicId] = useState(baseTopics[0].id);
  const [newTopic, setNewTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPost>({ title: '', lead: '', body: '', bullets: '', keywords: '' });

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

  // === 편집 모달 ===
  const openEdit = (p: BlogPostVariant) => {
    setEditingPostId(p.id);
    setDraft({
      title: p.title,
      lead: p.lead,
      body: p.body ?? '',
      bullets: (p.bullets ?? []).join('\n'),
      keywords: p.keywords.join(', ')
    });
  };

  const cancelEdit = () => {
    setEditingPostId(null);
  };

  const saveEdit = () => {
    if (!editingPostId) return;
    if (!draft.title.trim()) {
      showToast('제목은 필수입니다', { kind: 'error' });
      return;
    }
    const bullets = draft.bullets
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const keywords = draft.keywords
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setTopics((prev) =>
      prev.map((t) =>
        t.id !== activeTopicId
          ? t
          : {
              ...t,
              posts: t.posts.map((p) =>
                p.id === editingPostId
                  ? {
                      ...p,
                      title: draft.title.trim(),
                      lead: draft.lead.trim(),
                      body: draft.body.trim(),
                      bullets: bullets.length ? bullets : undefined,
                      keywords: keywords.length ? keywords : p.keywords,
                      charCount: draft.body.length + draft.lead.length,
                      readMinutes: Math.max(1, Math.ceil((draft.body.length + draft.lead.length) / 400)),
                      status: 'review' as PublishStatus
                    }
                  : p
              )
            }
      )
    );
    setEditingPostId(null);
    showToast('수정됨 — 상태가 "검수 중" 으로 변경됨');
  };

  const editingPost = useMemo(
    () => active?.posts.find((p) => p.id === editingPostId) ?? null,
    [active, editingPostId]
  );

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
                    onClick={() => {
                      setActiveTopicId(t.id);
                      setEditingPostId(null);
                    }}
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
              아직 생성된 글이 없습니다. 우측 상단 “5글 생성”으로 자동 작성하세요.
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
                      <button type="button" onClick={() => openEdit(p)} className="btn-secondary text-xs">
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

      {/* 편집 모달 */}
      {editingPost && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4"
          onClick={cancelEdit}
        >
          <div
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-ink">글 편집</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {editingPost.formatLabel} · {editingPost.cue}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  제목 <span className="text-status-danger">*</span>
                </label>
                <input
                  className="input-base"
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">리드 (요약)</label>
                <textarea
                  className="input-base min-h-[70px] resize-y"
                  value={draft.lead}
                  onChange={(e) => setDraft((p) => ({ ...p, lead: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">본문</label>
                <textarea
                  className="input-base min-h-[200px] resize-y font-mono text-[13px]"
                  value={draft.body}
                  onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  체크리스트 / 불릿 (줄 단위 입력, 선택)
                </label>
                <textarea
                  className="input-base min-h-[90px] resize-y"
                  placeholder="한 줄에 하나씩"
                  value={draft.bullets}
                  onChange={(e) => setDraft((p) => ({ ...p, bullets: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  키워드 (쉼표 구분)
                </label>
                <input
                  className="input-base"
                  placeholder="잠실 라섹, 회복기간, BGN"
                  value={draft.keywords}
                  onChange={(e) => setDraft((p) => ({ ...p, keywords: e.target.value }))}
                />
              </div>
              <div className="rounded-md bg-surface-subtle px-3 py-2 text-[11px] text-ink-muted">
                저장 시 상태가 자동으로 “검수 중” 으로 변경되어 의료법 린터 검토 후 발행됩니다.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button type="button" onClick={cancelEdit} className="btn-secondary text-xs">
                취소
              </button>
              <button type="button" onClick={saveEdit} className="btn-primary text-xs">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
