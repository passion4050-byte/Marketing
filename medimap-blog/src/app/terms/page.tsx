/**
 * Round 98 (2026-06-28) — 이용약관 페이지.
 *
 * Footer 의 /terms 링크 404 방지 + B2B SaaS 기본 약관 항목 명시.
 * 변호사 검토 전 placeholder. 정식 공시 전 사용자가 실제 운영 정보로 보완 필수.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/schema";
import { siteConfig } from "@/lib/site";

export const revalidate = false;

export const metadata: Metadata = {
  title: "이용약관 | WECIRCLE",
  description: `${siteConfig.publisher.legalName}(WECIRCLE) 서비스 이용약관.`,
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "이용약관", href: "/terms" },
        ])}
      />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-16 md:py-24 lg:px-10">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          <span className="inline-block h-px w-6 bg-stone-400" />
          <Link href="/" className="hover:text-stone-900">{siteConfig.brand}</Link>
          <span className="text-stone-300">/</span>
          <span className="text-stone-900">Terms of Service</span>
        </div>
        <header className="my-12 max-w-3xl">
          <h1 className="text-[36px] font-black tracking-[-0.025em] text-stone-950 md:text-[52px]">
            이용약관
          </h1>
          <p className="mt-4 text-sm tabular-nums text-stone-500">최종 갱신 · 2026-06-28</p>
        </header>

        <article className="prose prose-sm max-w-3xl text-stone-700 prose-headings:text-stone-950 prose-headings:tracking-tight prose-a:text-stone-900 md:prose-base">
          <p>
            본 약관은 {siteConfig.publisher.legalName}(이하 &ldquo;회사&rdquo;)이 제공하는 AI 검색
            최적화 SaaS 서비스(이하 &ldquo;서비스&rdquo;) 이용에 관한 조건과 절차, 회원의 권리·의무
            및 책임사항을 규정함을 목적으로 합니다.
          </p>

          <h2>제1조 (정의)</h2>
          <ul>
            <li>&ldquo;서비스&rdquo;: 회사가 제공하는 GEO/AEO 콘텐츠 자동 생성·AI 인용 측정 SaaS</li>
            <li>&ldquo;회원&rdquo;: 회사와 서비스 이용 계약을 체결한 의료기관 및 사업자</li>
          </ul>

          <h2>제2조 (약관의 효력 및 변경)</h2>
          <p>
            본 약관은 서비스 화면에 공지함으로써 효력을 발생합니다. 회사는 관련 법령에 위배되지
            않는 범위 내에서 약관을 개정할 수 있으며, 개정 시 시행 7일 전에 공지합니다.
          </p>

          <h2>제3조 (서비스의 제공)</h2>
          <ul>
            <li>AI 검색엔진(ChatGPT · Gemini · Claude · Perplexity 등) 대상 콘텐츠 최적화</li>
            <li>AI 인용 측정 및 분석 리포트</li>
            <li>경쟁사 분석 및 학습 인사이트</li>
            <li>기타 회사가 추가 개발하는 부가 서비스</li>
          </ul>

          <h2>제4조 (요금 및 결제)</h2>
          <p>
            서비스 이용 요금은 회사와 회원이 체결한 계약서에 따릅니다. 요금 변경 시 1개월 전
            사전 통지합니다.
          </p>

          <h2>제5조 (회원의 의무)</h2>
          <ul>
            <li>의료법, 광고 관련 법령 등 관계 법령 준수</li>
            <li>발행 콘텐츠 최종 검수 및 게시 책임</li>
            <li>타인의 권리 침해 금지</li>
          </ul>

          <h2>제6조 (책임 제한)</h2>
          <p>
            회사는 AI 모델의 학습 데이터 및 응답 패턴 변화로 인한 인용 결과의 변동에 대해
            책임지지 않습니다. 또한 회원이 발행한 콘텐츠의 의료법 준수 여부는 최종적으로 회원의
            책임입니다.
          </p>

          <h2>제7조 (개인정보 보호)</h2>
          <p>
            회사의 개인정보 처리에 관한 사항은 <Link href="/privacy" className="text-brand hover:underline">개인정보처리방침</Link>을
            따릅니다.
          </p>

          <h2>제8조 (분쟁 해결)</h2>
          <p>
            본 약관과 관련하여 발생한 분쟁은 회사 본사 소재지를 관할하는 법원을 제1심 관할 법원으로
            합니다.
          </p>

          <hr />
          <p className="text-[11px] text-ink-muted">
            <strong>법인:</strong> {siteConfig.publisher.legalName} ·{" "}
            <strong>주소:</strong> {siteConfig.contact.address} ·{" "}
            <strong>사업자등록번호:</strong> {siteConfig.contact.businessNumber}
          </p>
          <p className="text-[11px] text-ink-muted">
            ⚠️ 본 페이지는 초안입니다. 정식 시행 전 법률 자문 후 보완하시기 바랍니다.
          </p>
        </article>
      </main>
    </>
  );
}
