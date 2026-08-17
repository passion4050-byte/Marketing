import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getSql } from "@/lib/db";
import { detectAiCrawler } from "@/lib/crawler-detect";

// Round 163d — 봇 무기록 (상담 클릭 오염 실사고와 동일 원칙)
const GENERIC_BOT_RE =
  /bot|crawl|spider|preview|scrap|python|curl|wget|httpclient|headless|phantom|lighthouse|monitor|slurp|mj12|facebookexternalhit|kakaotalk-scrap|whatsapp|telegram|slack|discord/i;
function isBotUa(ua: string | null): boolean {
  if (!ua) return true;
  return detectAiCrawler(ua) !== null || GENERIC_BOT_RE.test(ua);
}

/**
 * Round 162 (2026-08-16) — 리뷰 요청 퍼널 랜딩 (/review/{partner_slug}).
 *
 * 용도: 시술을 마친 "실제" 고객에게 병원이 QR/링크로 전달 — 구글 리뷰 작성으로
 * 원탭 연결. (지도 축: 영어 리뷰 최신성·양이 Gemini 계열 노출의 재료)
 * 병원 동의 확보(사용자 고지). 리뷰 내용 생성·대리 작성은 하지 않는다 —
 * 이 페이지는 '요청과 이동'만 담당한다 (Google 리뷰 정책 준수: 대가 제공·
 * 게이팅(만족 고객만 선별 유도) 금지 — 모든 고객에게 동일 링크).
 *
 * 추적: 방문(scan)은 이 서버 컴포넌트에서, 클릭(click)은 /review/{code}/go 에서
 * review_funnel_events 에 기록. QR 스캔→클릭 전환율을 어드민에서 볼 수 있다.
 * noindex — 검색 유입용 페이지가 아님.
 */

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ l?: string }>;
}

interface FunnelTenant {
  id: number;
  name: string;
  name_en: string | null;
  google_review_url: string | null;
  gmaps_url: string | null;
  google_rating: number | null;
}

async function getFunnelTenant(code: string): Promise<FunnelTenant | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql<FunnelTenant[]>`
      SELECT id, name, name_en, google_review_url, gmaps_url, google_rating
      FROM tenants
      WHERE partner_slug = ${code}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function logScan(tenantId: number, code: string, lang: string, referer: string | null) {
  const sql = getSql();
  if (!sql) return;
  try {
    await sql`
      INSERT INTO review_funnel_events (tenant_id, code, event, lang, referer)
      VALUES (${tenantId}, ${code}, 'scan', ${lang}, ${referer})
    `;
  } catch {
    /* 추적 실패가 UX 를 막으면 안 됨 */
  }
}

type FunnelLang = "ko" | "en" | "ja" | "zh" | "tw";

const COPY: Record<
  FunnelLang,
  { title: (n: string) => string; body: string; btn: string; note: string; alt: string }
> = {
  ko: {
    title: (n) => `${n} 방문은 어떠셨나요?`,
    body: "소중한 후기는 다음 환자분들께 큰 도움이 됩니다. 1분이면 충분해요.",
    btn: "구글 리뷰 남기기",
    note: "리뷰는 Google 계정으로 작성되며, 솔직한 경험 그대로 남겨주시면 됩니다.",
    alt: "Google 지도에서 보기",
  },
  en: {
    title: (n) => `How was your visit to ${n}?`,
    body: "Your honest review helps other international patients decide. It takes about a minute.",
    btn: "Leave a Google review",
    note: "You'll be taken to Google — please share your experience exactly as it was.",
    alt: "Open in Google Maps",
  },
  ja: {
    title: (n) => `${n} のご来院はいかがでしたか？`,
    body: "正直なレビューが、次の患者さんの助けになります。1分ほどで完了します。",
    btn: "Googleレビューを書く",
    note: "Googleに移動します。体験をそのままお聞かせください。",
    alt: "Google マップで開く",
  },
  zh: {
    title: (n) => `您在 ${n} 的就诊体验如何？`,
    body: "您的真实评价能帮助更多海外患者做决定，只需一分钟。",
    btn: "写Google评价",
    note: "将跳转至Google——请如实分享您的体验。",
    alt: "在 Google 地图中打开",
  },
  tw: {
    title: (n) => `您在 ${n} 的就診體驗如何？`,
    body: "您的真實評論能幫助更多海外患者做決定，只需一分鐘。",
    btn: "撰寫Google評論",
    note: "將前往Google——請如實分享您的體驗。",
    alt: "在 Google 地圖中開啟",
  },
};

function pickLang(param: string | undefined, acceptLanguage: string): FunnelLang {
  if (param && ["ko", "en", "ja", "zh", "tw"].includes(param)) return param as FunnelLang;
  const al = acceptLanguage.toLowerCase();
  if (al.startsWith("ko")) return "ko";
  if (al.startsWith("ja")) return "ja";
  if (al.includes("zh-tw") || al.includes("zh-hant") || al.includes("zh-hk")) return "tw";
  if (al.startsWith("zh")) return "zh";
  return "en";
}

export const metadata: Metadata = {
  title: "Review",
  robots: { index: false, follow: false },
};

export default async function ReviewFunnelPage({ params, searchParams }: Props) {
  const [{ code }, sp, h] = await Promise.all([params, searchParams, headers()]);
  const tenant = await getFunnelTenant(code);
  if (!tenant || (!tenant.google_review_url && !tenant.gmaps_url)) notFound();

  const lang = pickLang(sp.l, h.get("accept-language") ?? "");
  const t = COPY[lang];
  const name = lang === "ko" ? tenant.name : tenant.name_en ?? tenant.name;

  if (!isBotUa(h.get("user-agent"))) await logScan(tenant.id, code, lang, h.get("referer"));

  const langs: Array<{ k: FunnelLang; label: string }> = [
    { k: "ko", label: "한국어" },
    { k: "en", label: "English" },
    { k: "ja", label: "日本語" },
    { k: "zh", label: "简体" },
    { k: "tw", label: "繁體" },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5">
      <div className="w-full max-w-md border border-stone-300 bg-white px-8 py-12 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
          WECIRCLE · Partner Clinic
        </div>
        <h1 className="mt-4 text-2xl font-black leading-snug tracking-tight text-stone-950">
          {t.title(name)}
        </h1>
        <div className="mt-4 text-2xl tracking-[0.3em] text-amber-500" aria-hidden>
          ★★★★★
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">{t.body}</p>
        <a
          href={`/review/${code}/go?l=${lang}`}
          className="mt-8 block w-full bg-stone-950 px-6 py-4 text-base font-bold text-white transition hover:bg-stone-800"
        >
          {t.btn}
        </a>
        {tenant.gmaps_url ? (
          <a
            href={tenant.gmaps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-[12px] font-semibold text-stone-500 hover:text-stone-800"
          >
            {t.alt}
          </a>
        ) : null}
        <p className="mt-6 text-[11px] leading-relaxed text-stone-400">{t.note}</p>
        <div className="mt-8 flex items-center justify-center gap-3 border-t border-stone-200 pt-5 text-[11px] text-stone-400">
          {langs.map((l) => (
            <a
              key={l.k}
              href={`/review/${code}?l=${l.k}`}
              className={l.k === lang ? "font-bold text-stone-900" : "hover:text-stone-700"}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
