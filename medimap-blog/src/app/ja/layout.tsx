import type { Metadata } from "next";
import { OverseasShell } from "@/components/OverseasShell";

export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — 韓国クリニックをAIに引用させる",
    template: "%s · WECIRCLE Global",
  },
  description:
    "外国人患者はChatGPT・Perplexity・Geminiで韓国のクリニックを探します。WECIRCLEは英語・日本語・中国語のGEO/AEOコンテンツを発信し、AIに引用される仕組みを作り、その引用を計測します。",
  openGraph: { type: "website", locale: "ja_JP", siteName: "WECIRCLE Global" },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/ja",
    languages: { en: "/en", ja: "/ja", "zh-Hans": "/zh", ko: "/" },
  },
};

const NAV = [
  { href: "/ja#how", label: "仕組み" },
  { href: "/ja#specialties", label: "診療科" },
  { href: "/ja/clinics", label: "クリニック" },
  { href: "/ja/blog", label: "ブログ" },
  { href: "/ja/guides/smile-lasik-in-korea", label: "サンプル" },
];

export default function JaLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverseasShell
      lang="ja"
      nav={NAV}
      ctaLabel="相談する"
      footerTagline="韓国クリニックのAI検索可視化"
    >
      {children}
    </OverseasShell>
  );
}
