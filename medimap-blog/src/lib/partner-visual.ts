/**
 * Round 111 (2026-07-02) — 파트너 카테고리별 비주얼 identity.
 *
 * 각 진료과에 고유 컬러 팔레트 + 그라디언트 + 아이콘 slug 부여.
 * /with-partners 그리드에서 카테고리 카드마다 다른 무드를 주고,
 * 상세 페이지 hero 에도 재활용 가능.
 *
 * 팔레트 원칙:
 *   - 카드 배경: 라이트 톤 (bg-*-50)
 *   - 그라디언트: from-*-500 to-*-600 (액센트, hero 배지에 사용)
 *   - 카드 아웃라인: border-*-200
 *   - 텍스트 강조: text-*-900
 *   - 아이콘: 진료과 은유 (안과=Eye, 피부과=Sparkles, 성형=Scissors, 치과=Smile, 내과=Stethoscope, 모발=Waves, 한방=Leaf)
 */
import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Sparkles,
  Scissors,
  Smile,
  Stethoscope,
  Waves,
  Leaf,
} from "lucide-react";

export interface PartnerVisualMeta {
  icon: LucideIcon;
  /** hero / card gradient (accent bg) */
  gradient: string;
  /** subtle card bg */
  softBg: string;
  /** border */
  border: string;
  /** border hover */
  borderHover: string;
  /** text accent */
  accent: string;
  /** tag/chip bg */
  chipBg: string;
  chipText: string;
  /** aura (glow ring on hover) */
  aura: string;
  /** tagline for hero */
  tagline: string;
}

export const PARTNER_VISUALS: Record<string, PartnerVisualMeta> = {
  eyeclinic: {
    icon: Eye,
    gradient: "from-sky-500 via-blue-500 to-indigo-600",
    softBg: "bg-sky-50/70",
    border: "border-sky-100",
    borderHover: "hover:border-sky-400",
    accent: "text-sky-700",
    chipBg: "bg-sky-100",
    chipText: "text-sky-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(14,165,233,0.45)]",
    tagline: "시야를 새로 여는 정밀 수술의 시대",
  },
  derma: {
    icon: Sparkles,
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600",
    softBg: "bg-rose-50/70",
    border: "border-rose-100",
    borderHover: "hover:border-rose-400",
    accent: "text-rose-700",
    chipBg: "bg-rose-100",
    chipText: "text-rose-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(244,63,94,0.4)]",
    tagline: "피부 결을 다시 짜는 감각의 클리닉",
  },
  plastic: {
    icon: Scissors,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    softBg: "bg-violet-50/70",
    border: "border-violet-100",
    borderHover: "hover:border-violet-400",
    accent: "text-violet-700",
    chipBg: "bg-violet-100",
    chipText: "text-violet-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(139,92,246,0.4)]",
    tagline: "라인을 편집하는 수술의 미학",
  },
  dental: {
    icon: Smile,
    gradient: "from-cyan-500 via-teal-500 to-emerald-600",
    softBg: "bg-teal-50/70",
    border: "border-teal-100",
    borderHover: "hover:border-teal-400",
    accent: "text-teal-700",
    chipBg: "bg-teal-100",
    chipText: "text-teal-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(20,184,166,0.4)]",
    tagline: "웃는 얼굴을 설계하는 정밀 시술",
  },
  internal: {
    icon: Stethoscope,
    gradient: "from-emerald-500 via-green-500 to-lime-600",
    softBg: "bg-emerald-50/70",
    border: "border-emerald-100",
    borderHover: "hover:border-emerald-400",
    accent: "text-emerald-700",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(16,185,129,0.4)]",
    tagline: "몸의 신호를 읽는 조용한 정밀 진단",
  },
  hair: {
    icon: Waves,
    gradient: "from-amber-500 via-orange-500 to-red-600",
    softBg: "bg-amber-50/70",
    border: "border-amber-100",
    borderHover: "hover:border-amber-400",
    accent: "text-amber-700",
    chipBg: "bg-amber-100",
    chipText: "text-amber-800",
    aura: "shadow-[0_16px_40px_-16px_rgba(245,158,11,0.4)]",
    tagline: "한 올 한 올, 헤어라인을 다시 그리는 정성",
  },
  oriental: {
    icon: Leaf,
    gradient: "from-lime-500 via-green-600 to-emerald-700",
    softBg: "bg-lime-50/70",
    border: "border-lime-100",
    borderHover: "hover:border-lime-400",
    accent: "text-lime-800",
    chipBg: "bg-lime-100",
    chipText: "text-lime-900",
    aura: "shadow-[0_16px_40px_-16px_rgba(132,204,22,0.4)]",
    tagline: "몸과 마음, 오래된 지혜의 균형",
  },
};

export function getPartnerVisual(slug: string): PartnerVisualMeta {
  return PARTNER_VISUALS[slug] ?? PARTNER_VISUALS.eyeclinic;
}
