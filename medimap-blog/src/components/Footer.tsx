import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-content grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-2xl font-extrabold tracking-tight">
            {siteConfig.brand}
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            {siteConfig.description}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white/80">바로가기</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li><Link href="/about" className="hover:text-white">회사소개</Link></li>
            <li><Link href="/guide" className="hover:text-white">병원 입점 가이드</Link></li>
            <li><Link href="/blog" className="hover:text-white">블로그</Link></li>
            <li><Link href="/contact" className="hover:text-white">제휴 문의</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white/80">고객 지원</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <a
                href={siteConfig.contact.kakao}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                카카오톡 채널
              </a>
            </li>
            <li>
              <a
                href={siteConfig.contact.naverPlace}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                네이버 플레이스
              </a>
            </li>
            <li>
              <a href={`tel:${siteConfig.contact.phone}`} className="hover:text-white">
                전화 {siteConfig.contact.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-content flex flex-col items-start justify-between gap-2 py-6 text-xs text-white/50 md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()} {siteConfig.publisher.legalName}. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-white">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
