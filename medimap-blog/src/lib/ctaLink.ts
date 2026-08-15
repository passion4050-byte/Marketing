/**
 * Round 144c (2026-08-02) — CTA 추적 링크.
 *
 * 문제였던 것: 발행 콘텐츠의 카카오 상담 CTA 가 오픈카톡 직링크를 그대로 써서
 *   클릭이 서버에 기록되지 않았다. 그 결과 어드민 유입·전환 표의
 *   ShortLink/클릭/CTR 이 상시 0 이었고, "AI 노출 → 실제 문의" 전환을
 *   측정할 방법이 없었다.
 *
 * 인프라는 이미 완성돼 있었다:
 *   `/r/[slug]` → lib/db.lookupShortlink(shortlinks) → recordClick(shortlink_clicks) → 302
 * 빠진 건 (a) shortlinks 행 (b) CTA 가 그 경로를 경유하지 않는다는 것 둘뿐이었다.
 *
 * slug 규칙은 **결정적**이어야 한다 — 코드에서 계산해야 하므로 랜덤 nanoid 금지.
 *   카카오 상담: `k-{partner_slug}`
 * DB 시딩은 tenants.partner_slug 기준으로 생성돼 있다.
 */

/** 추적 링크가 없을 때 되돌아갈 원본 채널 (링크가 죽는 것보다 낫다). */
import { siteConfig } from "@/lib/site";

/**
 * 파트너 카카오 상담 추적 링크.
 * @param partnerSlug tenants.partner_slug — 없으면 원본 카카오 링크로 폴백
 */
export function kakaoTrackHref(partnerSlug?: string | null): string {
  const s = (partnerSlug ?? "").trim();
  if (!s) return siteConfig.contact.kakao;
  return `/r/k-${s}`;
}

/**
 * 자사(위서클) 블로그용 카카오 상담 추적 링크.
 * tenants 의 자사 partner_slug 는 'wecircle-self'.
 */
export function kakaoTrackHrefSelf(): string {
  return "/r/k-wecircle-self";
}

/**
 * 추적 링크는 같은 도메인 경유라 target="_blank" 를 쓰면 중간 탭이 열린다.
 * `/r/*` 가 302 로 카카오로 넘기므로 새 탭 자체는 유지하되 rel 은 유지.
 */
export const TRACK_LINK_REL = "noopener noreferrer";

/**
 * Round 146 — WhatsApp 프리필.
 *
 * 페르소나 3인 감사의 공통 최종 이탈점: 버튼("Get my free quote")을 눌렀는데
 * **프리필 없는 빈 채팅창** — "뭐라고 보내지?"의 3초에서 비원어민이 갇힌다.
 * wa.me 는 `?text=` 프리필을 지원하므로, 버튼의 약속(견적)과 눌렀을 때의
 * 화면(빈칸만 채우면 되는 초안)을 일치시킨다.
 *
 * LINE 은 개인 계정 링크(ti/p/~)라 프리필 불가 — 공식계정 전환 전까지 원링크 유지.
 */
const WA_PREFILL: Record<string, string> = {
  en: "Hi! I'm considering treatment in Korea.\nProcedure: \nPreferred dates: \nCould I get a free quote from partner clinics?",
  ja: "こんにちは。韓国での施術を検討しています。\n施術内容：\n希望時期：\n無料見積もりをお願いできますか？",
  zh: "您好！我在考虑赴韩接受治疗。\n项目：\n期望时间：\n可以获取合作诊所的免费报价吗？",
};

/**
 * 언어별 프리필이 붙은 WhatsApp 링크. 알 수 없는 lang 은 en 프리필.
 * Round 150 — clinic 인자: 클리닉 상세에서 누르면 병원명이 프리필 첫 줄에 박혀
 * 상담 시작 즉시 어느 병원 문의인지 식별된다 (이탈 방지 인플랫폼 예약 동선).
 */
export function waHref(lang?: string, clinic?: string): string {
  const base = siteConfig.contact.whatsapp;
  let text = WA_PREFILL[lang ?? "en"] ?? WA_PREFILL.en;
  const c = (clinic ?? "").trim();
  if (c) {
    const clinicLine: Record<string, string> = {
      en: `Clinic: ${c}\n`,
      ja: `クリニック：${c}\n`,
      zh: `诊所：${c}\n`,
    };
    text = (clinicLine[lang ?? "en"] ?? clinicLine.en) + text;
  }
  try {
    const u = new URL(base);
    u.searchParams.set("text", text);
    return u.toString();
  } catch {
    return base;
  }
}
