import type { Metadata } from "next";
import Link from "next/link";
import { ClientSidebar } from "@/components/admin/ClientSidebar";
import { getClientPersona } from "@/lib/client-data";

export const metadata: Metadata = {
  title: "클라이언트 포털 — 메디맵",
  description: "병원 콘텐츠 운영 현황 + 키워드 관리",
  robots: { index: false, follow: false },
};

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const persona = await getClientPersona();
  return (
    <div className="min-h-screen bg-[#F7F8FB]">
      <div className="flex min-h-screen">
        <ClientSidebar tenantName={persona?.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
          <footer className="border-t border-line/60 bg-white/60 px-6 py-3 text-center text-[12px] text-ink-subtle lg:px-10">
            <Link href="/" className="hover:text-brand">← 메디맵 홈으로</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
