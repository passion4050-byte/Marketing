import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Stethoscope } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-brand-mesh opacity-90" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-white/0 via-brand-50/40 to-white"
        aria-hidden
      />
      <div className="container-content relative grid items-center gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-pill border border-brand-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 backdrop-blur">
            <Sparkles size={14} className="text-accent" />
            AI 검색 시대의 메디컬 인사이트
          </span>
          <h1 className="mt-6 text-display-md balance-text md:text-display-lg">
            헬스케어의{" "}
            <span className="bg-gradient-to-br from-brand to-accent bg-clip-text text-transparent">
              미래
            </span>
            <br className="hidden md:block" />를 함께 만들어갑니다
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted pretty-text">
            MEDIMAP은 Medical과 Map의 합성어로 &ldquo;건강을 찾을 수 있는 지도를 완성해
            나간다&rdquo;는 의미를 담고 있습니다. 병원 정보부터 진료비까지, 메디맵 한
            곳에서 안심하세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/blog" className="btn-primary">
              메디맵 인사이트 읽기
              <ArrowRight size={18} />
            </Link>
            <Link href="/contact" className="btn-secondary">
              제휴 문의하기
            </Link>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            <TrustChip
              icon={<ShieldCheck size={18} />}
              label="의료법 검수"
              desc="9개 룰 자동 린트"
            />
            <TrustChip
              icon={<Stethoscope size={18} />}
              label="전문의 자문"
              desc="실명 검수 표기"
            />
            <TrustChip
              icon={<Sparkles size={18} />}
              label="AI 검색 인용"
              desc="Schema.org 구조화"
            />
          </div>
        </div>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm animate-fade-in-up [animation-delay:120ms]">
          <div className="absolute -inset-6 rotate-3 rounded-[40px] bg-gradient-to-br from-brand-100 via-accent-50 to-brand-50 blur-2xl" />
          <div
            className="relative h-full w-full overflow-hidden rounded-[36px] border border-line bg-white shadow-card"
            aria-hidden
          >
            <div className="absolute left-1/2 top-3 h-1.5 w-20 -translate-x-1/2 rounded-full bg-ink/10" />
            <div className="flex h-full flex-col gap-4 p-6 pt-12">
              <div className="rounded-card bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100/60">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700">
                    추천 병원
                  </div>
                  <span className="rounded-pill bg-brand text-white px-2 py-0.5 text-[10px] font-bold">
                    AI 픽
                  </span>
                </div>
                <div className="mt-3 h-3 w-32 rounded bg-brand/35" />
                <div className="mt-2 h-3 w-24 rounded bg-brand/15" />
                <div className="mt-3 flex items-center gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${i < 4 ? "bg-brand" : "bg-line"}`}
                    />
                  ))}
                  <span className="ml-1 text-[10px] font-semibold text-ink-muted">
                    4.0
                  </span>
                </div>
              </div>
              <div className="rounded-card bg-surface-alt p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  최신 인사이트
                </div>
                <div className="mt-2 h-3 w-28 rounded bg-ink/15" />
                <div className="mt-2 h-3 w-36 rounded bg-ink/10" />
                <div className="mt-2 h-3 w-20 rounded bg-ink/10" />
              </div>
              <div className="rounded-card border border-line p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                    진료비 비교
                  </div>
                  <div className="text-[10px] font-semibold text-brand">↑ 12%</div>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  {[40, 56, 32, 48, 38, 60].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: h }}
                      className={`w-5 rounded-t ${
                        i === 5
                          ? "bg-gradient-to-t from-brand to-accent"
                          : "bg-brand/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustChip({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-white/80 px-4 py-3 backdrop-blur">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <div className="text-xs text-ink-subtle">{desc}</div>
      </div>
    </div>
  );
}
