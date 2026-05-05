import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Train,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { ContactInquiryForm } from "@/components/ContactInquiryForm";
import { breadcrumbLd, organizationLd } from "@/lib/schema";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const revalidate = false;

const CONTACT = {
  phone: "010-9024-8500",
  phoneTel: "01090248500",
  email: "cs@medimap.co.kr",
  website: "www.medi-map.co.kr",
  websiteUrl: "https://www.medi-map.co.kr",
  office: "서울시 강남구 봉은사로 215, 11층",
  officeShort: "서울시 강남구 봉은사로215, 11층",
  subway: "9호선 언주역 4번 출구",
  hours: ["평일 09:00 - 18:00", "주말·공휴일 휴무"],
  mapQuery: "서울특별시 강남구 봉은사로 215 KTS빌딩",
} as const;

export const metadata: Metadata = {
  title: "문의하기 | 메디맵",
  description:
    "광고 문의, 파트너십 제안 등 어떤 내용이든 편하게 연락주세요. 메디맵 본사: 서울시 강남구 봉은사로 215, 11층 · 9호선 언주역 4번 출구.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "문의하기 | 메디맵",
    description:
      "함께 성장할 파트너를 찾고 있습니다. 광고 문의, 파트너십 제안 등 어떤 내용이든 편하게 연락주세요.",
    type: "website",
  },
};

const contactPageLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "메디맵 문의하기",
  url: absoluteUrl("/contact"),
  inLanguage: "ko-KR",
  about: {
    "@type": "Organization",
    name: siteConfig.publisher.name,
    legalName: siteConfig.publisher.legalName,
    url: siteConfig.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: "봉은사로 215, 11층",
      addressLocality: "강남구",
      addressRegion: "서울특별시",
      addressCountry: "KR",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+82-10-9024-8500",
        email: CONTACT.email,
        contactType: "customer service",
        areaServed: "KR",
        availableLanguage: ["ko"],
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", href: "/" },
          { name: "문의하기", href: "/contact" },
        ])}
      />
      <JsonLd data={contactPageLd} />

      <PageHeader />
      <ContactSection />
      <LocationSection />
    </>
  );
}

/* ────────────────── 1. Page header ────────────────── */

function PageHeader() {
  return (
    <section className="container-content pt-16 pb-4 md:pt-20">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
        Contact
      </div>
      <h1 className="mt-3 text-[36px] font-extrabold tracking-[-0.025em] text-ink md:text-[44px]">
        문의하기
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
        광고 문의, 파트너십 제안 등 어떤 내용이든 편하게 연락주세요.
      </p>
      <div
        className="mt-8 h-[2px] w-full max-w-[120px] rounded-full bg-gradient-to-r from-brand to-accent"
        aria-hidden
      />
    </section>
  );
}

/* ────────────────── 2. Contact (info | form) ────────────────── */

function ContactSection() {
  return (
    <section className="container-content py-14 md:py-20">
      <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:gap-14">
        {/* 좌 — 텍스트 정보 */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
            Contact
          </div>
          <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.02em] balance-text md:text-[32px]">
            함께 성장할
            <br />
            파트너를{" "}
            <span className="bg-gradient-to-br from-brand to-accent bg-clip-text text-transparent">
              찾고 있습니다.
            </span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
            광고 문의, 파트너십 제안 등 어떤 내용이든 편하게 연락주세요.
          </p>

          <div className="mt-10 space-y-6">
            <InfoRow
              icon={<Phone size={16} />}
              label="Phone"
              value={CONTACT.phone}
              href={`tel:${CONTACT.phoneTel}`}
            />
            <InfoRow
              icon={<Mail size={16} />}
              label="Email"
              value={CONTACT.email}
              href={`mailto:${CONTACT.email}`}
            />
            <InfoRow
              icon={<Globe size={16} />}
              label="Website"
              value={CONTACT.website}
              href={CONTACT.websiteUrl}
              external
            />
            <InfoRow
              icon={<MapPin size={16} />}
              label="Office"
              value={CONTACT.officeShort}
            />
          </div>
        </div>

        {/* 우 — 폼 */}
        <ContactInquiryForm />
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand transition group-hover:bg-brand group-hover:text-white">
        {icon}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
          {label}
        </span>
        <span className="mt-1 text-[15px] font-semibold text-ink num">
          {value}
        </span>
      </div>
      {href && (
        <ArrowUpRight
          size={14}
          className="ml-auto text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-brand"
        />
      )}
    </>
  );

  if (!href) {
    return <div className="group flex items-center gap-3">{content}</div>;
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3"
      >
        {content}
      </a>
    );
  }

  return (
    <a href={href} className="group flex items-center gap-3">
      {content}
    </a>
  );
}

/* ────────────────── 3. Location (map | info table) ────────────────── */

function LocationSection() {
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    CONTACT.mapQuery,
  )}&hl=ko&z=17&output=embed`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    CONTACT.mapQuery,
  )}`;

  return (
    <section className="bg-surface-alt/70 py-14 md:py-20">
      <div className="container-content">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
          Location
        </div>
        <h2 className="mt-3 text-[28px] font-bold tracking-[-0.02em] text-ink md:text-[32px]">
          찾아오시는 길
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-10">
          {/* 지도 */}
          <div className="relative overflow-hidden rounded-card border border-line/70 bg-white shadow-soft">
            <div className="aspect-[4/3] w-full md:aspect-[5/4]">
              <iframe
                src={mapSrc}
                title="메디맵 본사 위치 — 서울시 강남구 봉은사로 215 KTS빌딩"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-soft backdrop-blur transition hover:bg-brand hover:text-white"
            >
              구글 지도에서 보기
              <ArrowUpRight size={11} />
            </a>
          </div>

          {/* 정보 테이블 */}
          <dl className="rounded-card border border-line/70 bg-white p-6 shadow-soft md:p-8">
            <Row icon={<MapPin size={15} />} label="주소" value={CONTACT.office} />
            <Row icon={<Train size={15} />} label="지하철" value={CONTACT.subway} />
            <Row
              icon={<Phone size={15} />}
              label="전화"
              value={
                <a
                  href={`tel:${CONTACT.phoneTel}`}
                  className="num transition hover:text-brand"
                >
                  {CONTACT.phone}
                </a>
              }
            />
            <Row
              icon={<Mail size={15} />}
              label="이메일"
              value={
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="transition hover:text-brand"
                >
                  {CONTACT.email}
                </a>
              }
            />
            <Row
              icon={<Clock size={15} />}
              label="운영시간"
              last
              value={
                <span className="flex flex-col gap-0.5">
                  {CONTACT.hours.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </span>
              }
            />

            <div className="mt-6 flex flex-wrap gap-2 border-t border-line/70 pt-5">
              <a
                href={`tel:${CONTACT.phoneTel}`}
                className="inline-flex items-center gap-1.5 rounded-pill bg-brand px-4 py-2 text-[13px] font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <Phone size={13} /> 전화
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-bold text-ink-muted transition hover:border-brand-200 hover:text-brand"
              >
                <Mail size={13} /> 이메일
              </a>
              <Link
                href={siteConfig.contact.kakao}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-4 py-2 text-[13px] font-bold text-ink-muted transition hover:border-brand-200 hover:text-brand"
              >
                카카오톡
              </Link>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[88px_1fr] items-start gap-4 py-3.5 ${
        last ? "" : "border-b border-line/60"
      }`}
    >
      <dt className="flex items-center gap-2 text-[13px] font-semibold text-ink-subtle">
        <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-brand-50 text-brand">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-[14.5px] leading-relaxed text-ink">{value}</dd>
    </div>
  );
}
