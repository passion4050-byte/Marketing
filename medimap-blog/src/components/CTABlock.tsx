import { siteConfig } from "@/lib/site";
import { MessageCircle, MapPin, Phone } from "lucide-react";
import { TrackedLink } from "./TrackedLink";

interface CTABlockProps {
  title?: string;
  description?: string;
  utmSource?: string;
  utmCampaign?: string;
}

function withUtm(url: string, source: string, campaign: string): string {
  if (!url || url.startsWith("tel:")) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "ai_cite");
    u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export function CTABlock({
  title = "메디맵에 상담하기",
  description = "병원/시술 정보부터 가격 비교까지, 메디맵 운영자가 직접 안내합니다.",
  utmSource = "blog",
  utmCampaign = "blog_cta",
}: CTABlockProps) {
  const kakao = withUtm(siteConfig.contact.kakao, utmSource, utmCampaign);
  const naver = withUtm(siteConfig.contact.naverPlace, utmSource, utmCampaign);
  return (
    <aside
      className="relative my-12 overflow-hidden rounded-card bg-gradient-to-br from-brand to-brand-700 p-8 text-white shadow-cta"
      data-cta-block="standard"
    >
      <div
        className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <h3 className="text-[22px] font-bold tracking-tight md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 max-w-xl text-white/85">{description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TrackedLink
            href={kakao}
            target="_blank"
            rel="noopener noreferrer"
            trackChannel="kakao"
            trackSource={utmSource}
            trackCampaign={utmCampaign}
            className="group inline-flex items-center justify-center gap-2 rounded-pill bg-white/15 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25"
          >
            <MessageCircle size={17} /> 카카오톡 상담
          </TrackedLink>
          <TrackedLink
            href={naver}
            target="_blank"
            rel="noopener noreferrer"
            trackChannel="naver_place"
            trackSource={utmSource}
            trackCampaign={utmCampaign}
            className="group inline-flex items-center justify-center gap-2 rounded-pill bg-white/15 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25"
          >
            <MapPin size={17} /> 네이버 플레이스
          </TrackedLink>
          <TrackedLink
            href={`tel:${siteConfig.contact.phone}`}
            trackChannel="phone"
            trackSource={utmSource}
            trackCampaign={utmCampaign}
            className="group inline-flex items-center justify-center gap-2 rounded-pill bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:-translate-y-0.5 hover:bg-brand-50"
          >
            <Phone size={17} /> 전화 상담
          </TrackedLink>
        </div>
      </div>
    </aside>
  );
}
