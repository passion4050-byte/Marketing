import type { Metadata } from "next";
import { OverseasShell } from "@/components/OverseasShell";

export const metadata: Metadata = {
  title: {
    default: "WECIRCLE Global — 让AI引用您的韩国诊所",
    template: "%s · WECIRCLE Global",
  },
  description:
    "外国患者通过ChatGPT、Perplexity和Gemini寻找韩国诊所。WECIRCLE发布英语、日语、中文的GEO/AEO内容，让您在Google排名靠前并被AI引用。",
  openGraph: { type: "website", locale: "zh_CN", siteName: "WECIRCLE Global" },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/zh",
    languages: { en: "/en", ja: "/ja", "zh-Hans": "/zh", ko: "/" },
  },
};

const NAV = [
  { href: "/zh#how", label: "运作方式" },
  { href: "/zh#specialties", label: "科室" },
  { href: "/zh/clinics", label: "诊所" },
  { href: "/zh/blog", label: "博客" },
  { href: "/zh/about", label: "关于我们" },
  { href: "/zh/contact", label: "联系我们" },
];

export default function ZhLayout({ children }: { children: React.ReactNode }) {
  return (
    <OverseasShell
      lang="zh"
      nav={NAV}
      ctaLabel="预约咨询"
      footerTagline="韩国诊所的AI搜索可见度"
    >
      {children}
    </OverseasShell>
  );
}
