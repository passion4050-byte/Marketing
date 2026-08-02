import { siteConfig } from "@/lib/site";
import { TrackedLink } from "./TrackedLink";
import { kakaoTrackHrefSelf } from "@/lib/ctaLink";

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
 * Round 111 v4 (2026-07-02) — Editorial CTA. Off-white, hairline top divider,
 * italic serif quote, ink black button. Blog post 본문에서 사용.
 */
export function CTABlock({
  title = "더 자세한 상담이 필요하다면.",
  description = "AI 검색 시대의 의료 마케팅, 위서클 파트너십 팀이 카카오톡으로 안내합니다.",
  utmSource = "blog",
  utmCampaign = "blog_cta",
}: CTABlockProps) {
  /*
   * Round 144c — 자사 블로그 CTA 도 추적 링크 경유.
   * 기존엔 오픈카톡 직링크 + 클라이언트 beacon 뿐이라 서버 기록이 없었고,
   * 어드민 유입·전환 표의 클릭·CTR 이 상시 0 이었다.
   * `/r/k-wecircle-self` → shortlink_clicks 적재 → 302.
   * UTM 은 shortlinks.target_url 에 이미 심어져 있어 여기서 재부착하지 않는다.
   */
  const kakao = kakaoTrackHrefSelf();
  void withUtm; // 원본 채널 직링크가 필요해질 때를 위해 헬퍼는 남겨둠
  return (
    <aside
      className="my-14 border-t border-stone-300 pt-10"
      data-cta-block="editorial"
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
            Get in touch
          </div>
          <h3 className="mt-4 font-serif text-2xl italic leading-tight text-stone-900 md:text-[28px]">
            &ldquo;{title}&rdquo;
          </h3>
          <p className="mt-3 max-w-md text-[14px] leading-[1.75] text-stone-600">
            {description}
          </p>
        </div>
        <TrackedLink
          href={kakao}
          target="_blank"
          rel="noopener noreferrer"
          trackChannel="kakao"
          trackSource={utmSource}
          trackCampaign={utmCampaign}
          kakaoMedium="cta"
          className="group inline-flex items-center justify-between gap-4 border border-stone-900 bg-stone-900 px-6 py-5 text-white transition hover:bg-stone-800"
        >
          <span className="text-sm font-bold tracking-tight">카카오톡으로 상담받기</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>
            <path stroke="currentColor" d="M7 17L17 7" />
            <path stroke="currentColor" d="M7 7h10v10" />
          </svg>
        </TrackedLink>
      </div>
    </aside>
  );
}
