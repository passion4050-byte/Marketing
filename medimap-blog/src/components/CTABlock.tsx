import { siteConfig } from "@/lib/site";
import { TrackedLink } from "./TrackedLink";
import { kakaoTrackHref, kakaoTrackHrefSelf } from "@/lib/ctaLink";

interface CTABlockProps {
  title?: string;
  description?: string;
  utmSource?: string;
  utmCampaign?: string;
  /**
   * Round 146 (A2) — 파트너 병원 글이면 환자용 CTA 로 분기.
   * 페르소나 감사(민지): 필러 글을 다 읽은 환자에게 "위서클 파트너십 팀이
   * 안내합니다"(B2B) 를 보여주는 게 유일한 말미 CTA 였음 — 실제 상담 클릭을
   * 만드는 /blog 페이지의 CTA 가 타깃 불일치. 파트너 글이면
   * "이 글의 시술, {병원}에 직접 물어보기" + /r/k-{partner} 로.
   */
  partnerSlug?: string;
  partnerName?: string;
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
  title,
  description,
  utmSource = "blog",
  utmCampaign = "blog_cta",
  partnerSlug,
  partnerName,
}: CTABlockProps) {
  /*
   * Round 144c — 추적 링크 경유(/r/k-*) → shortlink_clicks 적재.
   * Round 146 (A2) — 파트너 글이면 환자 카피 + 그 병원 추적 링크로 분기.
   *   B2B 카피는 자사(위서클 인사이트) 글에만.
   */
  const isPartner = Boolean(partnerSlug);
  const kakao = isPartner ? kakaoTrackHref(partnerSlug) : kakaoTrackHrefSelf();
  const heading =
    title ?? (isPartner ? "이 글의 시술, 궁금한 점이 있다면." : "더 자세한 상담이 필요하다면.");
  const desc =
    description ??
    (isPartner
      ? `${partnerName ?? "파트너 병원"}에 직접 물어보세요. 비용·예약·시술 적합 여부까지, 카카오톡으로 무료 안내합니다.`
      : "AI 검색 시대의 의료 마케팅, 위서클 파트너십 팀이 카카오톡으로 안내합니다.");
  const btnLabel = isPartner
    ? `${partnerName ?? "병원"}에 물어보기`
    : "카카오톡으로 상담받기";
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
            &ldquo;{heading}&rdquo;
          </h3>
          <p className="mt-3 max-w-md text-[14px] leading-[1.75] text-stone-600">
            {desc}
          </p>
          {isPartner && (
            <p className="mt-2 text-[12px] text-stone-500">
              무료 · 상담은 위서클 채널을 통해 {partnerName ?? "파트너 병원"}과 연결됩니다
            </p>
          )}
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
          <span className="text-sm font-bold tracking-tight">{btnLabel}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden>
            <path stroke="currentColor" d="M7 17L17 7" />
            <path stroke="currentColor" d="M7 7h10v10" />
          </svg>
        </TrackedLink>
      </div>
    </aside>
  );
}
