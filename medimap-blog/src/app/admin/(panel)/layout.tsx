import type { Metadata } from "next";
import Link from "next/link";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export const metadata: Metadata = {
  title: "관리자 — 메디맵",
  description: "메디맵 어드민 콘솔",
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F8FB]">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
          <footer className="border-t border-line/60 bg-white/60 px-6 py-3 text-center text-[12px] text-ink-subtle lg:px-10">
            <Link href="/" className="hover:text-brand">
              ← 사이트로 돌아가기
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
