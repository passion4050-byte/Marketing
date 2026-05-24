import { BookOpen, Zap, Shield, ImageIcon, Database, Clock, AlertTriangle, ExternalLink } from "lucide-react";

export const dynamic = "force-static";

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">테크블로그 운영 가이드</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          medimap-blog 자사 운영자용 매뉴얼. 자동 발행 흐름, 의료법 가드, 트러블슈팅.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <Zap size={16} className="text-brand" /> 자동 발행 흐름
        </h2>
        <ol className="space-y-2 text-[13.5px] text-ink-muted">
          <li><b className="text-ink">1. 매 시간 GH Actions cron</b> → <code className="text-brand-700">scripts/run_auto_content_once.py</code> 실행</li>
          <li><b className="text-ink">2. daily_auto_content_job</b> — keywords × channels 라운드로빈 (tenant 의 daily_count 만큼)</li>
          <li><b className="text-ink">3. LLM 콘텐츠 생성</b> (gemini/openai/anthropic 환경변수 LLM_PROVIDER 로 선택)</li>
          <li><b className="text-ink">4. 의료법 린터 9룰 검수</b> — pass/warn/fail 분류</li>
          <li><b className="text-ink">5. auto_publish=true + pass</b> 일 때만 즉시 <code>published</code>, 아니면 <code>draft</code></li>
          <li><b className="text-ink">6. medimap-blog ISR (60초)</b> 으로 /blog 인덱스 + /blog/[slug] 자동 노출</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <Shield size={16} className="text-brand" /> 의료법 9룰 검수
        </h2>
        <p className="text-[13.5px] text-ink-muted">
          모든 콘텐츠 생성 경로에 강제 적용. <code className="text-brand-700">src/compliance/</code> 규칙 풀. 위반 패턴:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-[13px] text-ink-muted marker:text-brand/60">
          <li>과장 표현 (EXAG_001/002), 보장 약속 (GUAR_001)</li>
          <li>경쟁사 비교 광고 (COMP_001), 환자 유인 (SOLI_001), 공포 자극 (FEAR_001)</li>
          <li>warn: 가격 명시, 후기 인용, 비의료적 표현, 시술 전후 사진 (instagram/video 채널에선 fail 로 escalate)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <ImageIcon size={16} className="text-brand" /> 이미지 첨부 정책
        </h2>
        <div className="rounded-card border border-line bg-surface-alt/40 p-4 text-[13px] text-ink-muted">
          <p><b className="text-ink">자동 생성</b>: Pollinations.AI (무료, 픽사 일러스트 스타일). <code className="text-brand-700">IMAGE_GEN_ENABLED=true</code> 토글 시 활성.</p>
          <p className="mt-2"><b className="text-ink">수동 교체</b>: 특정 글에 미드저니/캔바로 만든 고품질 이미지를 admin/publications 에서 업로드 가능 (향후 PR).</p>
          <p className="mt-2"><b className="text-ink">의료법 안전</b>: 일러스트 스타일이라 &ldquo;실제 효과&rdquo; 광고 위험 0. 단 시술 전후 비교 사진은 절대 자동 금지.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <Database size={16} className="text-brand" /> 키워드 추가 (Streamlit blogkey)
        </h2>
        <p className="text-[13.5px] text-ink-muted">
          현재 키워드 1개만 (강남라식). 매일 같은 글 반복 회피 위해 5-10개 추가 권장.
        </p>
        <a href="https://blogkey.streamlit.app/" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          blogkey 키워드 관리 열기 <ExternalLink size={12} />
        </a>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <Clock size={16} className="text-brand" /> Streamlit Cloud 슬립 영구 해결
        </h2>
        <p className="text-[13.5px] text-ink-muted">
          Streamlit Cloud 는 무트래픽 시 컨테이너 슬립 → 그 안에서 돌던 APScheduler 죽음.
          이 문제를 우회하기 위해 <b className="text-ink">GitHub Actions cron</b> 신설 (매 시간 정각 UTC).
          Streamlit UI 슬립과 무관하게 콘텐츠 생성 + DB write 가 매 시간 작동.
        </p>
        <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
          <b>필수 secrets</b>: DATABASE_URL, LLM_PROVIDER, GEMINI_API_KEY (또는 OPENAI/ANTHROPIC), VERCEL_DEPLOY_HOOK
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <AlertTriangle size={16} className="text-status-warning" /> 알려진 함정 + 트러블슈팅
        </h2>
        <ul className="ml-4 list-disc space-y-1.5 text-[13px] text-ink-muted marker:text-brand/60">
          <li><b className="text-ink">SQLite silent fallback</b>: 2026-05-24 사고. DATABASE_URL 미설정 시 Streamlit 이 SQLite 임시 저장으로 fallback → 컨테이너 휘발. fix: db.py 가 명시 RuntimeError 던지도록 강화 + 배너 표시.</li>
          <li><b className="text-ink">한글 slug URL</b>: /blog/강남라식-6 같은 한글 라우트. Link href 에 encodeURIComponent 명시. getPostBySlug 에서 decodeURIComponent.</li>
          <li><b className="text-ink">SSG 빌드 timeout</b>: 60초 SIGTERM. fix: next.config.js staticPageGenerationTimeout=180 + lib/posts.ts DB 쿼리 8초 Promise.race + generateStaticParams mdx only.</li>
          <li><b className="text-ink">Vercel deploy 실패</b>: 같은 commit 5회 실패 케이스. 빌드 로그의 &ldquo;Restarted static page generation&rdquo; 키워드 찾기.</li>
          <li><b className="text-ink">CTA 중복</b>: generator 가 본문 끝에 부착하던 cta-block 이 페이지 자체 CTA 와 중복. blog_html/schema_org/own_blog 채널은 no-op 처리.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink">
          <ExternalLink size={16} className="text-brand" /> 외부 도구 링크
        </h2>
        <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
          <a href="https://vercel.com/medimaps-projects/medimap-blog" target="_blank" rel="noopener noreferrer"
             className="rounded-card border border-line bg-white p-3 hover:border-brand-200 hover:bg-surface-hover">
            Vercel — medimap-blog →
          </a>
          <a href="https://supabase.com/dashboard/project/gifopyowyankfsfghhdi" target="_blank" rel="noopener noreferrer"
             className="rounded-card border border-line bg-white p-3 hover:border-brand-200 hover:bg-surface-hover">
            Supabase Dashboard →
          </a>
          <a href="https://github.com/passion4050-byte/Marketing/actions" target="_blank" rel="noopener noreferrer"
             className="rounded-card border border-line bg-white p-3 hover:border-brand-200 hover:bg-surface-hover">
            GitHub Actions (cron) →
          </a>
          <a href="https://blogkey-adm.streamlit.app/" target="_blank" rel="noopener noreferrer"
             className="rounded-card border border-line bg-white p-3 hover:border-brand-200 hover:bg-surface-hover">
            Streamlit blogkey-adm →
          </a>
        </ul>
      </section>
    </div>
  );
}
