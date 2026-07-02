import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClientSidebar } from "@/components/admin/ClientSidebar";
import { getClientPersona } from "@/lib/client-data";
import { CLIENT_COOKIE_NAME, isClientConfigured, verifyClientCookie } from "@/lib/client-auth";

export const metadata: Metadata = {
  title: "클라이언트 포털 — 위서클",
  description: "병원 콘텐츠 운영 현황 + 키워드 관리",
  robots: { index: false, follow: false },
};

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  // 2026-05-24: tenant 인증 가드. CLIENT_PASSWORD env 미설정 시는 우회 (개발/MVP 호환).
  if (isClientConfigured()) {
    const cookie = cookies().get(CLIENT_COOKIE_NAME)?.value;
    const ok = await verifyClientCookie(cookie);
    if (!ok) redirect("/client/login");
  }
  const persona = await getClientPersona();
  return (
    <div className="min-h-screen bg-[#F7F8FB]">
      <div className="flex min-h-screen">
        <ClientSidebar tenantName={persona?.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
          <footer className="border-t border-line/60 bg-white/60 px-6 py-3 text-center text-[12px] text-ink-subtle lg:px-10">
            <Link href="/" className="hover:text-brand">← 위서클 홈으로</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
