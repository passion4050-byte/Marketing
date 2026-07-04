'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, ExternalLink, Lock, MessageSquare, ShieldCheck, Sparkles, Stethoscope, Zap } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

const KAKAO_CHANNEL = 'https://pf.kakao.com/_xnWQkG';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'login failed');
      showToast('로그인 성공');
      router.push('/admin');
    } catch (err) {
      showToast(`로그인 실패: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-muted via-surface-base to-accent-soft">
      {/* === 상단 Brand + Value Proposition === */}
      <header className="px-6 pt-12 pb-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-ink">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white shadow-card">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-ink">WECIRCLE GEO</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-ink">
                Hospital AI Optimization Platform
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero — Value Proposition === */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
            AI 검색 시대, 병원 마케팅 게임이 바뀝니다.
          </h1>
          <p className="mt-4 text-base text-ink-soft sm:text-lg">
            <span className="font-semibold text-ink">ChatGPT · Claude · Gemini · Perplexity</span>
            가 당신의 병원을 추천하도록.
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            월평균 AI 인용 28회 · 신규 문의 전환 11명{' '}
            <span className="text-ink-faint">(파일럿 데이터)</span>
          </p>

          {/* 소셜 프루프 — 신뢰 빌딩 */}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-border bg-surface-base px-4 py-3 shadow-card">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Zap className="h-3.5 w-3.5" /> AI 인용
              </div>
              <div className="mt-1 text-2xl font-bold text-ink">28<span className="ml-1 text-xs font-medium text-ink-muted">회/월</span></div>
              <div className="text-[11px] text-ink-muted">파일럿 데이터</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface-base px-4 py-3 shadow-card">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Stethoscope className="h-3.5 w-3.5" /> 신규 문의
              </div>
              <div className="mt-1 text-2xl font-bold text-ink">11<span className="ml-1 text-xs font-medium text-ink-muted">명/월</span></div>
              <div className="text-[11px] text-ink-muted">AI 인용 → 전환</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface-base px-4 py-3 shadow-card">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <BarChart3 className="h-3.5 w-3.5" /> 4 엔진
              </div>
              <div className="mt-1 text-2xl font-bold text-ink">100<span className="ml-1 text-xs font-medium text-ink-muted">%</span></div>
              <div className="text-[11px] text-ink-muted">동시 측정 · 파일럿 데이터</div>
            </div>
          </div>
        </div>
      </section>

      {/* === 본문 — Login + Lead === */}
      <section className="px-6 pb-12">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_1fr]">
          {/* 좌: 기존 클라이언트 로그인 */}
          <div className="card p-6">
            <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <Lock className="h-3.5 w-3.5" />
              운영자 / 클라이언트
            </div>
            <h2 className="mt-1 text-lg font-bold text-ink">계정이 있으신가요?</h2>
            <p className="mt-1 text-xs text-ink-muted">위서클에서 발급한 비밀번호로 로그인하세요.</p>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">비밀번호</label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-base px-3 transition focus-within:border-ink">
                  <Lock className="h-4 w-4 text-ink-muted" />
                  <input
                    type="password"
                    className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                    placeholder="발급받은 비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !password}
                className="btn-primary w-full disabled:opacity-60"
              >
                {loading ? '확인 중…' : <>로그인 <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
            <p className="mt-3 text-[11px] text-ink-faint">
              비밀번호 분실 시 위서클 담당자에게 문의해주세요.
            </p>
          </div>

          {/* 우: 잠재 클라이언트 Lead — Recommended 강조 */}
          <div className="relative card overflow-hidden border-2 border-ink bg-gradient-to-br from-ink to-ink p-6 text-white shadow-card-lg">
            <div className="absolute right-0 top-0 -translate-y-4 translate-x-8 opacity-10">
              <Sparkles className="h-32 w-32" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                <Sparkles className="h-3 w-3" /> 처음 방문하셨나요?
              </div>
              <h2 className="mt-3 text-xl font-bold leading-tight">
                우리 병원도<br />
                AI 답변에<br />
                노출되길 원하신다면?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                위서클 GEO 가 어떻게 작동하는지 1:1 로 보여드립니다.
                도입 부담 없이 우리 병원의 현재 AI 노출 수준을 진단해드려요.
              </p>

              <ul className="mt-4 space-y-2 text-sm">
                {[
                  { icon: BarChart3, text: '30일 무료 GEO 진단' },
                  { icon: MessageSquare, text: '1:1 도입 전략 상담' },
                  { icon: Zap, text: '평균 3시간 내 답변 · 평일 9-18시' }
                ].map((it, i) => {
                  const Icon = it.icon;
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-accent" />
                      <span>{it.text}</span>
                    </li>
                  );
                })}
              </ul>

              <a
                href={KAKAO_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-bold text-[#3C1E1E] transition hover:brightness-95"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.78 1.85 5.22 4.62 6.56-.2.71-.73 2.65-.84 3.07-.13.52.19.51.4.37.16-.11 2.6-1.76 3.65-2.48.71.1 1.43.16 2.17.16 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
                </svg>
                카카오톡으로 상담 받기
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
              <p className="mt-2 text-center text-[10px] text-white/60">
                채널 추가 없이 바로 1:1 채팅 시작
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === Footer Trust Bar === */}
      <footer className="border-t border-border bg-surface-subtle/70 px-6 py-6 text-center text-[11px] text-ink-muted">
        <div className="mx-auto max-w-4xl">
          WECIRCLE GEO · Hospital AI Platform · © 2026
          <span className="mx-2">·</span>
          <a href={KAKAO_CHANNEL} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            문의 채널
          </a>
          <span className="mx-2">·</span>
          본 서비스는 의료법 광고 가이드라인을 준수합니다
        </div>
      </footer>
    </div>
  );
}
