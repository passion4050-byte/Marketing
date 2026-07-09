/**
 * /scanner — 무료 의료 GEO 진단 (공개 리드 깔때기 · 잠재고객 영업 앞문).
 *
 * 플로우: URL 입력 → 스캔 → [티저: 종합점수 + 의료법 리스크 + 잠긴 항목]
 *         + 리드 게이트 모달(담당자·병원·이메일·전화·문의) 자동 오픈 → 제출 → 상세 리포트 언락.
 * 목적: 상세 결과를 리드 폼(모달) 뒤로 게이팅해 잠재고객 정보를 확보하되, '정확한 우리 병원 지표 분석·개선안을 무료 제공하기 위해' 프레이밍으로 설득.
 * 위서클 차별점: 의료광고법 리스크(위서클 단독). CTA = 카카오 오픈채팅 상담.
 */
'use client';

import { useState } from 'react';
import { ChevronDown, Lock, X } from 'lucide-react';
import type { ScanReport, ScanItem } from '@/lib/scanner/scan';

const KAKAO = 'https://open.kakao.com/o/spyAz9Bi';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600', B: 'text-brand', C: 'text-amber-500', D: 'text-rose-500'
};
const STATUS_RING: Record<string, string> = {
  good: 'border-emerald-200 bg-emerald-50', warn: 'border-amber-200 bg-amber-50', bad: 'border-rose-200 bg-rose-50'
};
const STATUS_DOT: Record<string, string> = {
  good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-rose-500'
};

function Gauge({ score, grade }: { score: number; grade: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  const stroke = score >= 65 ? '#10B981' : score >= 50 ? '#F59E0B' : '#F43F5E';
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg width="160" height="160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={stroke} strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className={`text-4xl font-extrabold ${GRADE_COLOR[grade]}`}>{score}</div>
        <div className="text-xs font-semibold text-ink-muted">/ 100 · {grade}등급</div>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: ScanItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${STATUS_RING[item.status]}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <span>{item.icon}</span>{item.label}
          {item.key === 'compliance' && (
            <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">위서클 단독</span>
          )}
        </span>
        <span className="flex items-center gap-2.5">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[item.status]}`} />
          <span className="text-lg font-bold tabular-nums text-ink">{item.score}</span>
          <span className="flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-brand">
            {open ? '접기' : '자세히'}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/60 pt-3 text-sm">
          {item.findings.length > 0 && (
            <ul className="space-y-1 text-ink-soft">
              {item.findings.map((f, i) => <li key={i}>✓ {f}</li>)}
            </ul>
          )}
          {item.fixes.length > 0 && (
            <ul className="space-y-1 text-ink-muted">
              {item.fixes.map((f, i) => <li key={i}>→ {f}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LockedItem({ item }: { item: ScanItem }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-base px-4 py-3">
      <span className="flex items-center gap-2 font-semibold text-ink">
        <span>{item.icon}</span>{item.label}
        {item.key === 'compliance' && (
          <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">위서클 단독</span>
        )}
      </span>
      <span className="flex items-center gap-2 text-ink-faint">
        <span className="select-none text-lg font-bold blur-[5px]">{item.score}</span>
        <Lock className="h-4 w-4" />
      </span>
    </div>
  );
}

function ComplianceBanner({ report }: { report: ScanReport }) {
  if (report.compliance.status === 'pass') return null;
  return (
    <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="font-bold text-rose-700">
        🛡️ 의료광고법 리스크 {report.compliance.failCount > 0 ? '발견' : '주의'} —
        금지 {report.compliance.failCount} · 주의 {report.compliance.warnCount}건
      </div>
      <p className="mt-1 text-sm text-rose-600">
        AI 노출을 늘리기 전에, 광고 표현이 의료법을 위반하면 인용될수록 리스크가 커집니다. 일반 GEO 업체는 이 진단을 하지 않습니다.
      </p>
    </div>
  );
}

const WHY_NOW = [
  { big: '-25%', label: '2026년까지 전통 검색 트래픽 감소 전망', src: 'Gartner' },
  { big: '1~2곳', label: 'AI 답변이 실제로 추천하는 병원 수 — 나머지는 노출 0' },
  { big: '선점 효과', label: 'AI는 이미 학습한 출처를 계속 인용 — 초기 진입이 자리를 굳힙니다' }
];

const HOW_IT_WORKS = [
  { n: '1', t: '무료 진단', d: '지금 이 페이지에서 AI 가시성 7항목 + 의료광고법 리스크 점수를 확인합니다.' },
  { n: '2', t: '실행', d: 'AI가 인용하는 구조로 콘텐츠·스키마·엔티티·신뢰 신호를 의료광고법을 지키며 위서클이 직접 구축합니다.' },
  { n: '3', t: '추적', d: 'ChatGPT·Gemini·Perplexity·Claude 4대 엔진의 인용 순위를 실시간 대시보드로 확인합니다.' }
];

const ITEMS_INFO: [string, string, string][] = [
  ['🤖', 'AI 인용 가능성', 'AI 가 답변에 그대로 떼어 쓸 수 있는 구조인지'],
  ['🏗️', '구조화 데이터', 'Schema.org·의료 스키마·FAQPage 적용도'],
  ['⚙️', 'AI 크롤러 접근성', 'GPTBot·ClaudeBot·PerplexityBot 허용 + llms.txt'],
  ['📋', 'E-E-A-T 전문성', '전문의·자격·감수 등 의료 신뢰 신호'],
  ['📝', '콘텐츠 AI 친화도', 'FAQ·HowTo·비교·정의형 콘텐츠'],
  ['🏆', '브랜드 권위·엔티티', 'title·OG·sameAs 엔티티 일관성'],
  ['🛡️', '의료광고법 리스크', '위서클 단독 — 광고 표현의 의료법 위반 진단']
];

const PERSONAS: [string, string, string][] = [
  ['🏥', '“GEO는 들어봤는데, 우리 병원이 얼마나 준비됐는지 모르겠어요”', '현재 수준을 점수로 확인하고 무엇부터 해야 할지 명확해집니다.'],
  ['💻', '“홈페이지·블로그는 하는데 ChatGPT엔 왜 안 나올까요?”', '검색 노출과 AI 인용 준비도를 분리해 어디가 문제인지 보여줍니다.'],
  ['📈', '“경쟁 병원은 AI 답변에 나오는데 우리는 왜 없죠?”', '같은 진료과 기준으로 무엇이 부족한지 항목별로 진단합니다.']
];

export default function ScannerPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [err, setErr] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [lName, setLName] = useState('');
  const [lOrg, setLOrg] = useState('');
  const [lEmail, setLEmail] = useState('');
  const [lPhone, setLPhone] = useState('');
  const [lMsg, setLMsg] = useState('');
  const [lLoading, setLLoading] = useState(false);
  const [lErr, setLErr] = useState('');

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setReport(null); setUnlocked(false); setModalOpen(false);
    if (!url.trim()) { setErr('진단할 병원 홈페이지 URL 을 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/scanner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!data?.report) { setErr(data?.error || '진단에 실패했습니다.'); }
      else if (!data.report.ok) { setErr(data.report.error || '페이지를 분석하지 못했습니다.'); }
      else {
        setReport(data.report as ScanReport);
        if (typeof document !== 'undefined') {
          setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
        setTimeout(() => setModalOpen(true), 500);
      }
    } catch {
      setErr('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setLErr('');
    if (!lName.trim() || !lOrg.trim() || !lEmail.trim() || !lPhone.trim()) {
      setLErr('담당자 성함·병원(기관)명·이메일·전화번호를 입력해 주세요.');
      return;
    }
    setLLoading(true);
    try {
      const res = await fetch('/api/scanner/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: report?.url, domain: report?.domain,
          overallScore: report?.overallScore, grade: report?.grade,
          complianceStatus: report?.compliance.status,
          name: lName, org: lOrg, email: lEmail, phone: lPhone, message: lMsg
        })
      });
      const data = await res.json();
      if (data?.ok) { setUnlocked(true); setModalOpen(false); }
      else { setLErr(data?.error || '제출에 실패했습니다. 다시 시도해 주세요.'); }
    } catch {
      setLErr('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLLoading(false);
    }
  }

  const needFix = report ? report.items.filter((i) => i.status !== 'good').length : 0;

  return (
    <main className="min-h-screen bg-surface-base">
      {/* Brand header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface-base/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="/scanner" className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand">WECIRCLE GEO</span>
            <span className="hidden text-xs text-ink-muted sm:inline">의료 특화 AI 검색 최적화</span>
          </a>
          <a href={KAKAO} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">전문가 상담 →</a>
        </div>
      </header>

      {/* Hero + Form */}
      <section id="scan" className="border-b border-border bg-gradient-to-b from-brand-tint-soft to-surface-base">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <div className="mb-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
            무료 · 2분 · AI 가시성 7항목 + 의료광고법 리스크
          </div>
          <h1 className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            우리 병원, ChatGPT·AI 검색에서<br />어떻게 보이고 있을까요?
          </h1>
          <p className="mt-4 text-base text-ink-muted">
            URL 하나면 됩니다. 4대 AI 엔진 인용 준비도를 진단하고,
            <br className="hidden sm:block" /> 다른 GEO 업체가 못 보는 <strong className="text-brand">의료광고법 리스크</strong>까지 함께 점검합니다.
          </p>

          <form onSubmit={run} className="mx-auto mt-8 max-w-xl space-y-3 text-left">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">병원 홈페이지 URL *</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="clinic.co.kr" className="input-base" inputMode="url" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'AI 가시성 분석 중…' : '무료 GEO 진단 시작하기 →'}
            </button>
            {err && <p className="text-sm text-rose-500">{err}</p>}
            <p className="text-center text-xs text-ink-faint">완전 무료 · 2분 소요 · 스팸 없음</p>
          </form>
        </div>
      </section>

      {/* 티저 (모달 뒤 배경) */}
      {report && !unlocked && (
        <section id="result" className="mx-auto max-w-3xl px-5 py-12">
          <div className="rounded-2xl border border-border bg-surface-subtle p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 border-b border-border pb-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand">GEO Scanner 진단 결과</div>
                <h2 className="mt-1 text-xl font-bold text-ink">{report.domain}</h2>
                <p className="mt-1 text-sm text-ink-muted">종합 AI 가시성 점수가 나왔습니다</p>
              </div>
              <Gauge score={report.overallScore} grade={report.grade} />
            </div>

            <ComplianceBanner report={report} />

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              AI 가시성 7개 항목 중 <span className="text-amber-900">{needFix}개</span>가 ‘개선 필요’로 나왔습니다.
              어떤 항목인지, 무엇을 고쳐야 하는지는 상세 리포트에서 확인하세요.
            </div>

            <div className="mt-5 grid gap-2">
              {report.items.map((it) => <LockedItem key={it.key} item={it} />)}
            </div>

            <div className="mt-6 text-center">
              <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
                <Lock className="h-4 w-4" /> 상세 리포트 무료로 받기 →
              </button>
              <p className="mt-2 text-xs text-ink-faint">7개 항목 상세 점수 + 맞춤 개선안 + 의료광고법 리스크 상세</p>
            </div>
          </div>
        </section>
      )}

      {/* 언락된 상세 리포트 */}
      {report && unlocked && (
        <section id="result" className="mx-auto max-w-3xl px-5 py-12">
          <div className="rounded-2xl border border-border bg-surface-subtle p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 border-b border-border pb-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">✅ 상세 리포트 공개</div>
                <h2 className="mt-1 text-xl font-bold text-ink">{report.domain}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  종합 AI 가시성 점수 · 분석 {new Date(report.fetchedAt).toLocaleString('ko-KR')}
                </p>
              </div>
              <Gauge score={report.overallScore} grade={report.grade} />
            </div>

            <ComplianceBanner report={report} />

            <div className="mt-5 grid gap-3">
              {report.items.map((it) => <ItemCard key={it.key} item={it} />)}
            </div>
            <p className="mt-3 text-center text-xs text-ink-faint">각 항목을 눌러 발견 사항·개선안을 펼쳐 보세요.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-tint-soft p-6 text-center">
            <h3 className="text-lg font-bold text-ink">이 리포트를 실제 AI 인용으로 바꿔 드립니다</h3>
            <p className="mt-2 text-sm text-ink-muted">
              위서클은 의료광고법을 지키면서 4대 AI 엔진에 인용되도록 콘텐츠·스키마·엔티티를 직접 실행하고,
              인용 순위를 실시간 대시보드로 추적합니다.
            </p>
            <a href={KAKAO} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex px-6 py-3">카카오톡으로 전문가 상담 →</a>
          </div>
        </section>
      )}

      {/* 왜 지금인가 */}
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <h2 className="text-center text-2xl font-extrabold text-ink">왜 지금 시작해야 하나</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-muted">
            검색이 AI로 옮겨가고 있습니다. AI 답변에는 병원 한두 곳만 인용됩니다 —
            지금 자리를 못 잡으면, 그 자리를 경쟁 병원이 먼저 차지합니다.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {WHY_NOW.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface-base p-6 text-center">
                <div className="text-3xl font-extrabold text-brand">{s.big}</div>
                <p className="mt-2 text-sm text-ink-soft">{s.label}</p>
                {s.src && <p className="mt-2 text-xs text-ink-faint">출처: {s.src}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 환자 행동 변화 */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-2xl font-extrabold text-ink">환자는 이미 AI에게 병원을 묻고 있습니다</h2>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          “강남 라식 잘하는 곳”, “허리디스크 병원 추천” — 환자들이 검색창 대신 ChatGPT·Perplexity에 묻기 시작했습니다.
          문제는, AI가 대형·광고 집행 병원만 반복해서 인용하고 정작 실력 있는 전문 병원은 답변에서 통째로 빠진다는 것입니다.
        </p>
        <p className="mt-4 rounded-xl border-l-4 border-brand bg-brand-tint-soft p-4 text-base font-semibold text-ink">
          AI 답변에 우리 병원이 없으면, 그 환자에게 우리는 존재하지 않는 병원입니다.
        </p>
      </section>

      {/* 의료법 해자 */}
      <section className="border-y border-rose-200 bg-rose-50">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <div className="inline-block rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">위서클 단독</div>
          <h2 className="mt-3 text-2xl font-extrabold text-ink">🛡️ 노출만 늘리면 오히려 위험합니다</h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            AI에 많이 인용돼도, 광고 표현이 의료광고법을 위반하면 <strong>인용될수록 리스크가 커집니다</strong> —
            심의·행정처분·환자 신뢰 손상으로 이어집니다. 일반 GEO 업체는 이 진단을 하지 않습니다.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            위서클은 <strong className="text-brand">의료광고법 린터를 모든 콘텐츠 생성 경로에 강제하는 국내 유일의 의료 특화 GEO</strong>입니다.
            AI에 인용되게 만들면서, 동시에 의료법을 지킵니다. 그래서 노출과 안전을 함께 가져갑니다.
          </p>
        </div>
      </section>

      {/* 이런 분께 필요합니다 (페르소나) */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-center text-2xl font-extrabold text-ink">이런 분께 무료 진단이 필요합니다</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PERSONAS.map(([icon, q, a]) => (
            <div key={q} className="rounded-2xl border border-border bg-surface-subtle p-6">
              <div className="text-2xl">{icon}</div>
              <p className="mt-3 font-semibold leading-snug text-ink">{q}</p>
              <p className="mt-2 text-sm text-ink-muted">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 진단 7항목 */}
      <section className="border-t border-border bg-surface-subtle">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="text-center text-2xl font-extrabold text-ink">무료 진단 7항목</h2>
          <p className="mt-3 text-center text-sm text-ink-muted">AI 가시성 6항목 + 위서클만 보는 의료광고법 리스크 1항목</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {ITEMS_INFO.map(([icon, label, desc]) => (
              <div key={label} className="rounded-xl border border-border bg-surface-base p-4">
                <div className="font-semibold text-ink">{icon} {label}</div>
                <p className="mt-1 text-sm text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 실행 3단계 */}
      <section className="mx-auto max-w-4xl px-5 py-14">
        <h2 className="text-center text-2xl font-extrabold text-ink">진단은 시작일 뿐 — 실제 AI 인용까지</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface-subtle p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{s.n}</div>
              <div className="mt-3 font-bold text-ink">{s.t}</div>
              <p className="mt-1 text-sm text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            AI는 지금도 환자에게 병원을 추천하고 있습니다.<br />그 답변에 우리 병원이 있나요?
          </h2>
          <p className="mt-4 text-sm text-white/80">URL 하나면 2분 안에 확인됩니다. 완전 무료 · 스팸 없음.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#scan" className="inline-flex rounded-lg bg-white px-6 py-3 text-sm font-bold text-brand hover:bg-brand-tint-soft">무료 GEO 진단 시작 →</a>
            <a href={KAKAO} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-white/60 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">카카오톡 전문가 상담</a>
          </div>
        </div>
      </section>

      {/* 리드 게이트 모달 */}
      {report && !unlocked && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface-base p-6 shadow-2xl sm:rounded-2xl">
            <button onClick={() => setModalOpen(false)} aria-label="닫기"
              className="absolute right-4 top-4 text-ink-faint transition hover:text-ink">
              <X className="h-5 w-5" />
            </button>
            <div className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
              종합 점수 {report.overallScore}점 · {report.grade}등급
            </div>
            <h3 className="mt-3 text-lg font-bold text-ink">📄 정확한 우리 병원 지표 분석·개선안을 무료로 제공해 드립니다</h3>
            <p className="mt-2 text-sm text-ink-soft">
              우리 병원에 딱 맞는 <strong>정확한 지표 분석과 개선안</strong>을 무료로 제공해 드리기 위해 아래 정보를 남겨주세요.
              7개 항목 상세 점수 + <strong>“무엇을·어떻게 고쳐야 하는지”</strong> + 의료광고법 리스크 상세를
              위서클 의료 GEO 전문가가 정리해 드립니다. <strong className="text-brand">상담은 강요하지 않습니다.</strong>
            </p>
            <form onSubmit={submitLead} className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">담당자 성함 *</label>
                <input value={lName} onChange={(e) => setLName(e.target.value)} placeholder="홍길동" className="input-base" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">병원 · 기관명 *</label>
                <input value={lOrg} onChange={(e) => setLOrg(e.target.value)} placeholder="○○의원" className="input-base" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">이메일 *</label>
                <input value={lEmail} onChange={(e) => setLEmail(e.target.value)} placeholder="you@clinic.co.kr" type="email" className="input-base" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">전화번호 *</label>
                <input value={lPhone} onChange={(e) => setLPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" className="input-base" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-ink-soft">문의 · 궁금한 점 (선택)</label>
                <textarea value={lMsg} onChange={(e) => setLMsg(e.target.value)} rows={2} placeholder="예: 라식·라섹 키워드에서 AI 노출을 높이고 싶어요" className="input-base resize-none" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={lLoading} className="btn-primary w-full py-3 text-base">
                  {lLoading ? '리포트 준비 중…' : '상세 리포트 무료로 받기 →'}
                </button>
                {lErr && <p className="mt-2 text-sm text-rose-500">{lErr}</p>}
                <p className="mt-2 text-center text-xs text-ink-faint">입력하신 정보는 리포트 발송·상담 목적으로만 사용됩니다.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
