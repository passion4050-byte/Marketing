import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Round 111 v3 (2026-07-02) — Editorial 404. Off-white + serif numeral + hairline.

export default function NotFound() {
  return (
    <main className="bg-[#FAFAF7] text-stone-900">
      <section className="mx-auto w-full max-w-[1280px] px-5 sm:px-6 pt-24 pb-32 md:pt-36 md:pb-40 lg:px-10">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          <span className="inline-block h-px w-6 bg-stone-400" />
          Error · 404
        </div>

        <div className="mt-16 grid gap-12 md:gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div>
            <div className="font-serif text-[120px] font-light leading-none tabular-nums tracking-tight text-stone-300 md:text-[180px]">
              404
            </div>
            <h1 className="mt-6 text-[28px] font-black leading-[1.15] tracking-[-0.02em] text-stone-950 sm:text-[34px] md:text-[52px] md:tracking-[-0.025em]">
              찾으시는 페이지가
              <br />
              <span className="font-serif italic font-normal text-stone-500">이 아카이브에 없습니다.</span>
         