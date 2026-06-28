import Link from "next/link";
import { Mail, MessageCircle, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-content grid gap-10 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={siteConfig.publisher.logo}
              alt={siteConfig.brand}
              width={134}
              height={22}
              className="h-7 w-auto brightness-0 invert"
            />
          </div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            {siteConfig.description}
          </p>
          {/* Round 90 — 사업자 정보 (한국 전자상거래법 준수) */}
          <div className="mt-4 space-y-0.5 text-[11px] leading-relaxed text-white/55">
            <div>{siteConfig.publisher.legalName}</div>
            <div>주소: {siteConfig.contact.address}</div>
            <div>사업자등록번호: {siteConfig.contact.businessNumber}</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={siteConfig.contact.kakao}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <MessageCircle size={13} /> 카카오톡
            </a>
            <a
              href={siteConfig.contact.naverPlace}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
            >
              <MapPin size={13} /> 네이버
            </a>
            {/* Round 21 (2026-05-28): 사용자 요청으로 전화번호 표시 제거 */}
          </div>
        </div>
        <div className="md:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
            바로가기
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-white/75">
            <li>
              <Link href="/about" className="transition hover:text-white">
                회사소개
              </Link>
            </li>
            <li>
              <Link href="/guide" className="transition hover:text-white">
                병원 입점 가이드
              </Link>
            </li>
            <li>
              <Link href="/blog" className="transition hover:text-white">
                블로그
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition hover:text-white">
                제휴 문의
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
            제휴/문의
          </h4>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            병원·의료기관 제휴 문의는 카카오톡 채널 또는 이메일로 보내주세요.
            영업일 기준 1~2일 내 회신드립니다.
          </p>
          <a
            href={`mailto:sales@medimap.team`}
            className="mt-4 inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
          >
            <Mail size={14} /> sales@medimap.team
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-content flex flex-col items-start justify-between gap-2 py-6 text-xs text-white/50 md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()} {siteConfig.publisher.legalName}. All
            rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/80">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:text-white/80">
              이용약관
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
