"use client";

import { usePathname } from "next/navigation";

const TITLES: { test: (p: string) => boolean; title: string; sub?: string }[] = [
  { test: (p) => p === "/admin", title: "관리자 대시보드", sub: "메디맵 운영 현황" },
  {
    test: (p) => /^\/admin\/inquiries\/\d+$/.test(p),
    title: "문의 상세",
    sub: "내용 확인 및 상태 변경",
  },
  { test: (p) => p.startsWith("/admin/inquiries"), title: "문의 관리", sub: "/about · /contact 폼 제출 내역" },
  { test: (p) => p.startsWith("/admin/shortlinks"), title: "단축링크", sub: "발급된 단축 URL 통계" },
  { test: (p) => p.startsWith("/admin/settings"), title: "환경설정", sub: "어드민 운영 옵션" },
];

export function AdminTopbar() {
  const pathname = usePathname() ?? "/admin";
  const match = TITLES.find((t) => t.test(pathname));
  return (
    <header className="z-10 flex items-center justify-between border-b border-line/70 bg-white/85 px-6 py-4 backdrop-blur lg:sticky lg:top-0 lg:px-10">
      <div>
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink">
          {match?.title ?? "관리자"}
        </h1>
        {match?.sub && (
          <p className="mt-0.5 text-[12.5px] text-ink-subtle">{match.sub}</p>
        )}
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <span className="rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          ● 운영 중
        </span>
      </div>
    </header>
  );
}
