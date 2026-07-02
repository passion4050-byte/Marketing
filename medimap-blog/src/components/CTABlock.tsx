import { siteConfig } from "@/lib/site";
import { MessageCircle } from "lucide-react";
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

/**
 * Round 108-e (2026-07-03) — CTA 심플화.
 * 이전: 카카오톡 + 네이버 플레이스 + 외부 medimap 링크 3개 (외부 이탈 유도)
 * 개선: 카카오톡 오픈챗 CTA 하나만 크게 (wecircle.co.kr 내부 유도 정책).
 */
export function CTABlock({
  title = "지금 바로 위서클 상담받기",
  description = "AI 검색 시대의 의료 마케팅, 위서클 운영자가 직접 안내합니다.",
  utmSource = "blog",
  utmCampaign = "blog_cta",
}: CTABlockProps) {
  const kakao = withUtm(siteConfig.contact.kakao, utmSource, utmCampaign);
  return (
    <aside
      className="relative my-12 overflow-hidden rounded-card bg-gradient-to-br from-brand to-brand-700 p-8 text-white shadow-cta"
      data-cta-block="standard"
      style={{ contain: "paint", willChange: "transform" }}
    >
      <div
        className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl"
        aria-hidden
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />
      <div
        className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl"
        aria-hidden
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      />
      <div className="relative text-center">
        <h3 className="text-[22px] font-bold tracking-tight md:text-2xl">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-white/85">{description}</p>
        <TrackedLink
          href={kakao}
          target="_blank"
          rel="noopener noreferrer"
          trackChannel="kakao"
          trackSource={utmSource}
          trackCampaign={utmCampaign}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#FEE500] px-8 py-4 text-base font-extrabold text-[#3C1E1E] shadow-md transition hover:scale-105 hover:shadow-lg"
        >
          <MessageCircle size={20} /> 카카오톡으로 상담받기
        </TrackedLink>
      </div>
    </aside>
  );
}
