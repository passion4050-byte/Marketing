"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * 폼 제출 성공 안내 팝업.
 *
 * 폼 아래 inline 안내 (자동 사라짐 없음) 가 화면 공간을 계속 점유하던 UX 를
 * 명시적 닫기 모달로 교체. About / Contact 두 폼 공통 사용.
 */
export function InquirySuccessModal({
  open,
  onClose,
  title = "문의가 접수되었습니다",
  description = "영업일 기준 1~2일 내에 회신 드리겠습니다.",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // body 스크롤 잠금
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 확인 버튼에 자동 포커스
    closeBtnRef.current?.focus();

    // Esc 닫기
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-success-title"
    >
      {/* 백드롭 */}
      <button
        type="button"
        aria-label="배경 영역 — 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-sm animate-fade-in"
      />

      {/* 카드 */}
      <div className="relative w-full max-w-[400px] rounded-card bg-white p-7 shadow-glow animate-fade-in-up md:p-8">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition hover:bg-surface-alt hover:text-ink"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white shadow-cta">
            <CheckCircle2 size={32} strokeWidth={2.4} />
          </div>
          <h3
            id="inquiry-success-title"
            className="mt-5 text-[20px] font-extrabold tracking-tight text-ink"
          >
            {title}
          </h3>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink-muted">
            {description}
          </p>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex w-full items-center justify-center rounded-pill bg-gradient-to-r from-brand to-accent px-6 py-3 text-[14px] font-bold text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
