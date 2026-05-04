import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-50/40">
      <div className="container-content grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="pill-label">메디맵의 미래</span>
          <h1 className="mt-5 text-display-md md:text-display-lg">
            헬스케어의 <span className="text-brand">미래</span>
            <br />
            함께 만들어갑니다
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted">
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
        </div>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
          <div className="absolute inset-0 rotate-3 rounded-[36px] bg-gradient-to-br from-brand-100 to-brand-50 blur-2xl" />
          <div className="relative h-full w-full rounded-[36px] border border-line bg-white shadow-card" aria-hidden>
            <div className="absolute left-1/2 top-3 h-1.5 w-20 -translate-x-1/2 rounded-full bg-ink/10" />
            <div className="flex h-full flex-col gap-4 p-6 pt-12">
              <div className="rounded-card bg-brand-50 p-4">
                <div className="text-xs font-semibold text-brand">추천 병원</div>
                <div className="mt-2 h-3 w-24 rounded bg-brand/30" />
                <div className="mt-2 h-3 w-32 rounded bg-brand/15" />
              </div>
              <div className="rounded-card bg-surface-alt p-4">
                <div className="text-xs font-semibold text-ink-muted">최신 인사이트</div>
                <div className="mt-2 h-3 w-28 rounded bg-ink/15" />
                <div className="mt-2 h-3 w-36 rounded bg-ink/10" />
              </div>
              <div className="rounded-card border border-line p-4">
                <div className="text-xs font-semibold text-ink-muted">진료비 비교</div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="h-10 w-6 rounded bg-brand/20" />
                  <div className="h-14 w-6 rounded bg-brand/40" />
                  <div className="h-8 w-6 rounded bg-brand/15" />
                  <div className="h-12 w-6 rounded bg-brand/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
