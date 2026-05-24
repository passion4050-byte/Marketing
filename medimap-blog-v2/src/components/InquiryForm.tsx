'use client';

import { useState, useEffect } from 'react';

export interface InquiryFormProps {
  procedure?: string;
  onSuccess?: () => void;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function InquiryForm({ procedure, onSuccess }: InquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const v = sp.get(k);
      if (v) u[k] = v;
    }
    setUtm(u);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const visitorId = getCookie('mm_vid');

    const res = await fetch('/api/inquiry/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        phone: form.get('phone'),
        email: form.get('email'),
        message: form.get('message'),
        procedureInterest: procedure ?? form.get('procedure'),
        visitorId,
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign
      })
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.ok) {
      setDone(true);
      onSuccess?.();
    } else {
      setError(json.error ?? '제출 실패');
    }
  }

  if (done) {
    return (
      <div className="card card-pad text-center">
        <div className="mb-2 text-2xl">✓</div>
        <div className="text-sm font-bold text-ink">문의가 접수되었습니다.</div>
        <p className="mt-1 text-xs text-ink-muted">담당자가 영업시간 내 회신드립니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card card-pad space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">이름 *</label>
        <input name="name" required className="input-base" placeholder="홍길동" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">연락처 *</label>
        <input name="phone" required className="input-base" placeholder="010-1234-5678" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">이메일</label>
        <input name="email" type="email" className="input-base" placeholder="optional" />
      </div>
      {!procedure && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">관심 시술</label>
          <input name="procedure" className="input-base" placeholder="예: 라섹" />
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-ink">문의 내용</label>
        <textarea name="message" className="input-base min-h-[80px]" placeholder="자유롭게 작성" />
      </div>
      {error && <p className="text-xs text-status-danger">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? '제출 중…' : '문의 보내기'}
      </button>
      <p className="text-[11px] text-ink-faint">
        개인정보는 상담 응대 목적에만 사용되며 별도 동의 없이 마케팅에 사용되지 않습니다.
      </p>
    </form>
  );
}
