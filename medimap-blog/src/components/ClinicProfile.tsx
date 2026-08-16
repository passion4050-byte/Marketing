import Link from "next/link";
import { ContactButtons } from "@/components/ContactButtons";
import type { OverseasCard } from "@/lib/guides";

/**
 * Round 150 (2026-08-15) — 해외 클리닉 상세: 인플랫폼 프로필 (en/ja/zh 공용).
 *
 * 배경(사용자 지시): 병원 외부 홈페이지 링크를 보여주면 유저가 플랫폼에서 이탈 —
 * 중개 모델(메신저 상담 → 서면 견적)에서 전환 유출구. 외부 링크를 제거하고
 * 병원 콘텐츠·상담(예약 요청)을 전부 이 페이지 안에서 소화한다.
 *
 * 구성 (상위 5사 고정필드 + 바비톡 인플랫폼 모델):
 *   헤더(위치·Best for·대표 시술) → 왜 위서클 경유(무료·서면견적·언어) →
 *   상담 흐름 01~04 → 병원 발행 가이드 목록 → FAQ → 최종 CTA.
 * 의료법: 최상급·효과 보장 없음, 중개 고지 명시. WhatsApp 프리필에 병원명 주입.
 */

// Round 159b (2026-08-16) — tw(대만·번체) 추가. 대만 용어: 雷射·植牙·健檢·植髮.
type Lang = "en" | "ja" | "zh" | "tw";

const TREATMENTS: Record<string, Record<Lang, string>> = {
  eyeclinic: {
    en: "SMILE LASIK · LASIK · LASEK · ICL · cataract",
    ja: "スマイルラシック · ラシック · ラセック · ICL · 白内障",
    zh: "SMILE全飞秒 · LASIK · LASEK · ICL · 白内障",
    tw: "SMILE全飛秒 · LASIK · LASEK · ICL · 白內障",
  },
  derma: {
    en: "acne scars · pigmentation · laser toning · skin boosters · lifting",
    ja: "ニキビ跡 · 色素沈着 · レーザートーニング · スキンブースター · リフティング",
    zh: "痘坑 · 色素沉着 · 激光净肤 · 水光针 · 提升",
    tw: "痘疤 · 色素沉澱 · 雷射淨膚 · 水光針 · 拉提",
  },
  plastic: {
    en: "rhinoplasty · eyelid surgery · facial contouring",
    ja: "鼻整形 · 目元整形 · 輪郭形成",
    zh: "隆鼻 · 双眼皮 · 面部轮廓",
    tw: "隆鼻 · 雙眼皮 · 臉部輪廓",
  },
  dental: {
    en: "implants · veneers · orthodontics",
    ja: "インプラント · ラミネート · 歯列矯正",
    zh: "种植牙 · 贴面 · 正畸",
    tw: "植牙 · 陶瓷貼片 · 齒列矯正",
  },
  hair: {
    en: "FUE hair transplant · hairline design · crown restoration",
    ja: "FUE植毛 · ヘアライン矯正 · 頭頂部移植",
    zh: "FUE植发 · 发际线设计 · 头顶加密",
    tw: "FUE植髮 · 髮際線設計 · 頭頂加密",
  },
  internal: {
    en: "premium health checkup · IV therapy",
    ja: "プレミアム健診 · 点滴療法",
    zh: "高端体检 · 输液疗法",
    tw: "高階健檢 · 點滴療程",
  },
  oriental: {
    en: "herbal medicine · diet program · body balancing",
    ja: "韓方薬 · ダイエットプログラム · 体質改善",
    zh: "韩方药 · 减重项目 · 体质调理",
    tw: "韓方藥 · 減重療程 · 體質調理",
  },
};

const L10N: Record<
  Lang,
  {
    partnerClinic: string;
    intro: (name: string) => string;
    location: string;
    treatments: string;
    whyTitle: string;
    why: Array<{ t: string; d: string }>;
    flowTitle: string;
    flow: Array<{ t: string; d: string }>;
    guidesTitle: (name: string) => string;
    guidesEmpty: string;
    faqTitle: string;
    faq: Array<{ q: string; a: string }>;
    ctaTitle: string;
    ctaDesc: (name: string) => string;
    ctaBtn: string;
    disclosure: (name: string) => string;
  }
> = {
  en: {
    partnerClinic: "Partner Clinic",
    intro: (n) =>
      `${n} is a WECIRCLE partner clinic accepting international patients. Ask us anything about this clinic — we relay your questions and arrange your visit, free of charge.`,
    location: "Location",
    treatments: "Popular treatments",
    whyTitle: "Why book through WECIRCLE",
    why: [
      { t: "Free for you", d: "Our service costs you nothing — no booking fee, no markup." },
      {
        t: "Written quote first",
        d: "We request an itemized written quote from the clinic before you commit.",
      },
      {
        t: "English support",
        d: "Message in English — we handle the Korean with the clinic for you.",
      },
      {
        t: "One chat, everything",
        d: "Availability, pricing questions, visit scheduling — all in one conversation.",
      },
    ],
    flowTitle: "How booking works",
    flow: [
      { t: "Message us", d: "Tell us your procedure and preferred dates on WhatsApp." },
      { t: "Written quote", d: "We bring back the clinic's itemized quote and answers." },
      { t: "Schedule", d: "We confirm your consultation date with the clinic." },
      { t: "Visit & aftercare", d: "Visit the clinic; we stay reachable through recovery." },
    ],
    guidesTitle: (n) => `Guides featuring ${n}`,
    guidesEmpty:
      "Detailed guides for this clinic are on the way. Meanwhile, message us — we answer questions about this clinic directly.",
    faqTitle: "FAQ",
    faq: [
      {
        q: "Is the consultation really free?",
        a: "Yes. You pay the clinic only for treatment; WECIRCLE's coordination is free for patients.",
      },
      {
        q: "Can I visit without speaking Korean?",
        a: "Yes. We coordinate in your language before the visit, and prepare what to show at reception.",
      },
      {
        q: "How fast do I get a quote?",
        a: "Usually within 1 business day after you tell us the procedure and rough dates.",
      },
    ],
    ctaTitle: "Interested in this clinic?",
    ctaDesc: (n) =>
      `Ask for a specialist consultation first and request a written quote from ${n}. We arrange it for you — free.`,
    ctaBtn: "Get my free quote",
    disclosure: (n) =>
      `WECIRCLE is a marketing and coordination partner of ${n}. All medical consultation, diagnosis and treatment are provided by the clinic's medical staff.`,
  },
  ja: {
    partnerClinic: "パートナークリニック",
    intro: (n) =>
      `${n}はWECIRCLEのパートナークリニックです。このクリニックへの質問・予約の調整は、私たちが無料で代行します。`,
    location: "所在地",
    treatments: "主な施術",
    whyTitle: "WECIRCLE経由のメリット",
    why: [
      { t: "完全無料", d: "予約手数料・上乗せは一切ありません。" },
      { t: "書面見積もり", d: "施術前にクリニックから項目別の見積もりを取り寄せます。" },
      { t: "日本語サポート", d: "日本語でOK — クリニックとのやり取りは私たちが行います。" },
      { t: "一つのチャットで完結", d: "空き状況・料金・日程調整まで、一つの会話で。" },
    ],
    flowTitle: "予約の流れ",
    flow: [
      { t: "メッセージ送信", d: "LINEで施術内容と希望時期をお知らせください。" },
      { t: "書面見積もり", d: "クリニックの項目別見積もりと回答をお届けします。" },
      { t: "日程確定", d: "カウンセリング日をクリニックと確定します。" },
      { t: "来院・アフターケア", d: "来院後も回復まで連絡が取れます。" },
    ],
    guidesTitle: (n) => `${n}のガイド記事`,
    guidesEmpty:
      "このクリニックの詳しいガイドは準備中です。ご質問はメッセージでどうぞ — 直接お答えします。",
    faqTitle: "よくある質問",
    faq: [
      {
        q: "相談は本当に無料ですか？",
        a: "はい。お支払いは施術費のみで、WECIRCLEの調整サービスは無料です。",
      },
      {
        q: "韓国語ができなくても大丈夫？",
        a: "はい。来院前に日本語で調整し、受付で見せる案内も準備します。",
      },
      {
        q: "見積もりはどのくらいで届きますか？",
        a: "施術内容と時期をお知らせいただければ、通常1営業日以内にお届けします。",
      },
    ],
    ctaTitle: "このクリニックが気になりますか？",
    ctaDesc: (n) => `まず専門医カウンセリングを依頼し、${n}の書面見積もりを受け取りましょう。手配は無料です。`,
    ctaBtn: "LINEで無料見積もり",
    disclosure: (n) =>
      `WECIRCLEは${n}のマーケティング・コーディネートパートナーです。医療相談・診断・施術はすべてクリニックの医療スタッフが行います。`,
  },
  zh: {
    partnerClinic: "合作诊所",
    intro: (n) =>
      `${n}是WECIRCLE的合作诊所。关于这家诊所的咨询与预约安排，我们免费为您代办。`,
    location: "位置",
    treatments: "热门项目",
    whyTitle: "通过WECIRCLE预约的好处",
    why: [
      { t: "完全免费", d: "无预约费、无加价。" },
      { t: "先拿书面报价", d: "治疗前我们为您向诊所索取分项书面报价。" },
      { t: "中文支持", d: "用中文沟通即可 — 与诊所的韩语对接由我们完成。" },
      { t: "一个对话搞定", d: "档期、价格、日程安排，都在一个聊天里完成。" },
    ],
    flowTitle: "预约流程",
    flow: [
      { t: "发消息给我们", d: "告诉我们项目与期望时间。" },
      { t: "书面报价", d: "我们带回诊所的分项报价与解答。" },
      { t: "确定日程", d: "与诊所确认您的面诊日期。" },
      { t: "到院与术后", d: "到院之后，恢复期内也可随时联系我们。" },
    ],
    guidesTitle: (n) => `${n}相关攻略`,
    guidesEmpty: "这家诊所的详细攻略即将上线。有问题可直接发消息 — 我们直接解答。",
    faqTitle: "常见问题",
    faq: [
      { q: "咨询真的免费吗？", a: "是的。您只需支付诊所的治疗费用，WECIRCLE的协调服务对患者免费。" },
      { q: "不会韩语可以吗？", a: "可以。到院前我们用中文为您协调，并准备好前台出示的说明。" },
      { q: "报价多久能拿到？", a: "告知项目与大致时间后，通常1个工作日内送达。" },
    ],
    ctaTitle: "对这家诊所感兴趣？",
    ctaDesc: (n) => `先请求专科医生面诊，并向${n}索取书面报价。我们免费为您安排。`,
    ctaBtn: "免费获取报价",
    disclosure: (n) =>
      `WECIRCLE是${n}的市场与协调合作方。所有医疗咨询、诊断与治疗均由诊所医疗团队提供。`,
  },
  tw: {
    partnerClinic: "合作診所",
    intro: (n) =>
      `${n}是WECIRCLE的合作診所。關於這家診所的諮詢與預約安排，我們免費為您代辦。`,
    location: "位置",
    treatments: "熱門項目",
    whyTitle: "透過WECIRCLE預約的好處",
    why: [
      { t: "完全免費", d: "無預約費、無加價。" },
      { t: "先拿書面報價", d: "治療前我們為您向診所索取分項書面報價。" },
      { t: "中文支援", d: "用中文溝通即可 — 與診所的韓語對接由我們完成。" },
      { t: "一個對話搞定", d: "檔期、價格、日程安排，都在一個聊天裡完成。" },
    ],
    flowTitle: "預約流程",
    flow: [
      { t: "發訊息給我們", d: "告訴我們項目與期望時間。" },
      { t: "書面報價", d: "我們帶回診所的分項報價與解答。" },
      { t: "確定日程", d: "與診所確認您的面診日期。" },
      { t: "到院與術後", d: "到院之後，恢復期內也可隨時聯繫我們。" },
    ],
    guidesTitle: (n) => `${n}相關攻略`,
    guidesEmpty: "這家診所的詳細攻略即將上線。有問題可直接發訊息 — 我們直接解答。",
    faqTitle: "常見問題",
    faq: [
      { q: "諮詢真的免費嗎？", a: "是的。您只需支付診所的治療費用，WECIRCLE的協調服務對患者免費。" },
      { q: "不會韓語可以嗎？", a: "可以。到院前我們用中文為您協調，並準備好櫃檯出示的說明。" },
      { q: "報價多久能拿到？", a: "告知項目與大致時間後，通常1個工作天內送達。" },
    ],
    ctaTitle: "對這家診所感興趣？",
    ctaDesc: (n) => `先請求專科醫師面診，並向${n}索取書面報價。我們免費為您安排。`,
    ctaBtn: "免費取得報價",
    disclosure: (n) =>
      `WECIRCLE是${n}的行銷與協調合作方。所有醫療諮詢、診斷與治療均由診所醫療團隊提供。`,
  },
};

export function ClinicProfile({
  lang,
  name,
  category,
  address,
  cards,
  hrefFor,
}: {
  lang: Lang;
  name: string;
  category: string;
  address?: string | null;
  cards: OverseasCard[];
  hrefFor: (c: OverseasCard) => string;
}) {
  const t = L10N[lang];
  const treatments = TREATMENTS[category]?.[lang];

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-12">
      {/* 헤더 — 외부 홈페이지 링크 없음 (인플랫폼 원칙) */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
        {t.partnerClinic}
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-950 md:text-5xl">{name}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-stone-600">{t.intro(name)}</p>

      {/* 고정필드 스트립 (상위 5사 실측 패턴) */}
      <dl className="mt-8 grid gap-4 border-y border-stone-300/70 py-5 text-sm md:grid-cols-2">
        {address ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              {t.location}
            </dt>
            <dd className="mt-1 text-stone-800">{address}</dd>
          </div>
        ) : null}
        {treatments ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              {t.treatments}
            </dt>
            <dd className="mt-1 text-stone-800">{treatments}</dd>
          </div>
        ) : null}
      </dl>

      {/* 상단 CTA — 병원명 프리필 */}
      <div className="mt-8">
        <ContactButtons lang={lang} clinic={name} waLabel={t.ctaBtn} />
      </div>

      {/* 왜 위서클 경유 — 이탈 대신 인플랫폼의 가치 */}
      <section className="mt-14">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{t.whyTitle}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {t.why.map((w, i) => (
            <div key={w.t} className="border-t border-stone-300/70 pt-4">
              <div className="text-2xl font-black tabular-nums text-stone-300">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-1 font-bold text-stone-900">{w.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 예약 흐름 */}
      <section className="mt-14">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{t.flowTitle}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-4">
          {t.flow.map((f, i) => (
            <div key={f.t} className="border-t border-stone-300/70 pt-4">
              <div className="text-2xl font-black tabular-nums text-stone-300">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-1 font-bold text-stone-900">{f.t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 병원 발행 콘텐츠 — 인플랫폼 소비 */}
      <section className="mt-14">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{t.guidesTitle(name)}</h2>
        {cards.length === 0 ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{t.guidesEmpty}</p>
        ) : (
          <div className="mt-6 divide-y divide-stone-200 border-t border-stone-300/70">
            {cards.map((c, i) => (
              <Link
                key={c.slug}
                href={hrefFor(c)}
                className="group flex items-baseline gap-4 py-4"
              >
                <span className="w-8 shrink-0 text-lg font-black tabular-nums text-stone-300 transition group-hover:text-stone-900">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold leading-snug text-stone-900 group-hover:underline group-hover:underline-offset-4">
                    {c.title}
                  </span>
                  {c.excerpt ? (
                    <span className="mt-1 block truncate text-sm text-stone-500">{c.excerpt}</span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-xl font-black tracking-tight text-stone-950">{t.faqTitle}</h2>
        <div className="mt-6 divide-y divide-stone-200 border-t border-stone-300/70">
          {t.faq.map((f, i) => (
            <div key={f.q} className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-black tabular-nums text-stone-300">
                  Q{i + 1}
                </span>
                <span className="font-bold text-stone-900">{f.q}</span>
              </div>
              <p className="text-sm leading-relaxed text-stone-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 최종 CTA */}
      <section className="mt-14 bg-stone-950 px-6 py-10 text-white md:px-10">
        <h2 className="text-2xl font-black tracking-tight">{t.ctaTitle}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-300">{t.ctaDesc(name)}</p>
        <ContactButtons lang={lang} clinic={name} waLabel={t.ctaBtn} className="mt-6" />
      </section>

      {/* 중개 고지 (의료광고 컴플라이언스) */}
      <p className="mt-6 text-[11px] leading-relaxed text-stone-400">{t.disclosure(name)}</p>
    </div>
  );
}
