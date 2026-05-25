/**
 * Mock 데이터 페이지에 표시하는 배너.
 * 데이터 파이프라인 미연동 페이지에서 사용자가 라이브 데이터로 오해하지 않도록.
 */
import { AlertTriangle } from 'lucide-react';

interface MockBannerProps {
  /** Phase 라벨 — 'Phase 2', 'Phase 3' 등 */
  phase?: string;
  /** 실데이터 소스 설명 — "GA4 + 자체 hit 카운터", "Gemini API billing" 등 */
  source?: string;
}

export function MockBanner({ phase = 'Phase 2', source }: MockBannerProps) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warningSoft px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
      <div className="flex-1 text-xs">
        <div className="font-semibold text-status-warning">⚠ Mock 데이터 — 라이브 미연동</div>
        <div className="mt-0.5 text-ink-soft">
          이 페이지의 수치는 데모용 mock 입니다. 실데이터 파이프라인 연동 예정 (<strong>{phase}</strong>)
          {source ? <> — 소스: <code className="rounded bg-surface-base px-1 py-0.5 text-[10px]">{source}</code></> : null}
        </div>
      </div>
    </div>
  );
}
