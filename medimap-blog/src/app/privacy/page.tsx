/**
 * Round 98 (2026-06-28) — 개인정보처리방침 페이지.
 *
 * Footer 의 /privacy 링크 404 방지 + 한국 개인정보보호법 (PIPA) 기본 항목 명시.
 * 변호사 검토 전 placeholder. 정식 공시 전 사용자가 실제 운영 정보로 보완 필수.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

export const revalidate = false;

export const metadata: Metadata = {
  title: "개인정보처리방침 | WECIRCLE",
  description: `${siteConfig.publisher.legalName}(WECIRCLE) 개인정보처리방침.`,
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "개인정보처리방침", href: "/privacy" },
        ])}
      />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-24 lg:px-10">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          <span className="inline-block h-px w-6 bg-stone-400" />
          <Link href="/" className="hover:text-stone-900">{siteConfig.brand}</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900">Privacy Policy</span>
        </div>
        <header className="my-12 max-w-3xl">
          <h1 className="text-[28px] font-black tracking-[-0.02em] text-stone-950 sm:text-[34px] md:text-[52px] md:tracking-[-0.025em]">
            개인정보처리방침
          </h1>
          <p className="mt-4 text-sm tabular-nums text-stone-500">최종 갱신 · 2026-06-28</p>
        </header>

        <article className="prose prose-sm max-w-3xl text-stone-700 prose-headings:text-stone-950 prose-headings:tracking-tight prose-a:text-stone-900 md:prose-base">
          <p>
            {siteConfig.publisher.legalName}(이하 &ldquo;회사&rdquo;)는 정보주체의 자유와 권리를
            보호하기 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수합니다.
          </p>

          <h2>1. 수집하는 개인정보 항목</h2>
          <ul>
            <li>제휴 문의: 이름, 회사명, 이메일, 연락처</li>
            <li>서비스 이용 기록: 접속 IP, 쿠키, 방문 일시</li>
            <li>분석 도구: Google Analytics 4 (익명 ID 기반)</li>
          </ul>

          <h2>2. 개인정보 수집 및 이용 목적</h2>
          <ul>
            <li>제휴/상담 문의 응대</li>
            <li>서비스 품질 개선 및 운영 통계</li>
            <li>법령상 의무 이행</li>
          </ul>

          <h2>3. 개인정보 보유 및 이용 기간</h2>
          <p>
            수집한 개인정보는 목적 달성 후 지체 없이 파기합니다. 다만 관계 법령에 의해 보존이
            필요한 경우 해당 기간 동안 보관합니다.
          </p>

          <h2>4. 개인정보 보호책임자</h2>
          <ul>
            <li>법인: {siteConfig.publisher.legalName}</li>
            <li>이메일: {siteConfig.contact.email}</li>
            <li>주소: {siteConfig.contact.address}</li>
          </ul>

          <h2>5. 권리·의무 및 행사 방법</h2>
          <p>
            정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 등의 권리를
            행사할 수 있습니다.
          </p>

          <h2>6. 변경 사항 고지</h2>
          <p>
            본 방침의 내용이 변경되는 경우 변경 사항은 시행일 7일 전에 본 페이지를 통해
            공지합니다.
          </p>

          <hr />
          <p className="text-[11px] text-ink-muted">
            ⚠️ 본 페이지는 초안입니다. 정식 시행 전 법률 자문 후 보완하시기 바랍니다.
          </p>
        </article>
      </main>
    </>
  );
}
