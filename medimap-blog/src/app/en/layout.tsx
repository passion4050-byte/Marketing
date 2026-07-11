import type { Metadata } from "next";
import { OverseasShell } from "@/components/OverseasShell";

export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — Get Your Korean Clinic Cited by AI",
    template: "%s · WECIRCLE Global",
  },
  description:
    "We publish English, Japanese & Chinese GEO/AEO content so ChatGPT, Perplexity & Gemini recommend your Korean clinic to foreign patients — and we measure every AI citation.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "WECIRCLE Global",
    title: "WECIRCLE Global — Get Your Korean Clinic Cited by AI",
    description:
      "GEO/AEO content in EN/JA/ZH so AI search recommends your clinic to foreign patients.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/en",
    languages: { en: "/en", ja: "/ja", "zh-Hans": "/zh", ko: "/" },
  },
};

const NAV = [
  { href: "/en#how", label: "How it works" },
  { href: "/en#specialties", label: "Specialties" },
  { href: "/en#proof", label: "Proof" },
  { href: "/en/guides/smile-lasik-in-korea", label: "Sample" },
];

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverseasShell
      lang="en"
      nav={NAV}
      ctaLabel="Talk to us"
      footerTagline="AI search visibility for Korean clinics"
    >
      {children}
    </OverseasShell>
  );
}
