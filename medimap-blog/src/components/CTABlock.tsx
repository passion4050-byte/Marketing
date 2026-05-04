import { siteConfig } from "@/lib/site";
import { MessageCircle, MapPin, Phone } from "lucide-react";

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
      className="my-12 rounded-card bg-gradient-to-br from-brand to-brand-700 p-8 text-white shadow-cta"
      data-cta-block="standard"
    >
      <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-xl text-white/85">{description}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <a
          href={kakao}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-pill bg-white/15 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
        >
          <MessageCircle size={18} /> 카카오톡 상담
        </a>
        <a
          href={naver}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-pill bg-white/15 px-5 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
        >
          <MapPin size={18} /> 네이버 플레이스
        </a>
        <a
          href={`tel:${siteConfig.contact.phone}`}
          className="flex items-center gap-2 rounded-pill bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand-50"
        >
          <Phone size={18} /> 전화 상담
        </a>
      </div>
    </aside>
  );
}
