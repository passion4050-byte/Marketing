import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Round 111 v3 (2026-07-02) — Editorial 404. Off-white + serif numeral + hairline.

export default function NotFound() {
  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      <section className="mx-auto w-full max-w-[1280px] px-6 pt-24 pb-32 md:pt-36 md:pb-40 lg:px-10">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          <span className="inline-block h-px w-6 bg-stone-400" />
          Error · 404
        </div>

        <div className="mt-16 grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <div className="font-serif text-[120px] font-light leading-none tabular-nums tracking-tight text-stone-300 md:text-[180px]">
              404
            </div>
            <h1 className="mt-6 text-[36px] font-black leading-[1.1] tracking-[-0.025em] text-stone-950 md:text-[52px]">
              찾으시는 페이지가
              <br />
              <span className="font-serif italic font-normal text-stone-500">이 아카이브에 없습니다.</span>
            </h1>
          </div>

          <div className="lg:pb-4">
            <p className="max-w-md text-[15px] leading-[1.75] text-stone-600">
              요청하신 페이지가 이동되었거나 삭제되었을 수 있습니다. 위서클 인사이트 또는 파트너 아카이브에서 관련 콘텐츠를 찾아보세요.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/"
                className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-4 text-white transition hover:bg-stone-800"
              >
                <span className="text-sm font-bold tracking-tight">홈으로 돌아가기</span>
                <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/blog"
                className="group inline-flex items-center justify-between gap-4 border border-stone-300 bg-white px-6 py-4 text-stone-900 transition hover:border-stone-900"
              >
                <span className="text-sm font-bold tracking-tight">위서클 인사이트</span>
                <ArrowUpRight size={16} strokeWidth={2} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
