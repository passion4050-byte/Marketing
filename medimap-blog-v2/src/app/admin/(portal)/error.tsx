'use client';

/**
 * Round 169 (2026-08-20) — 모바일: 어드민 포털 에러 경계.
 *
 * 이전엔 error 경계가 없어 서버 집계 하나가 throw 하면 Next 기본 에러 화면(영문)이
 * 전체를 덮었고, 모바일에서는 되돌아갈 수단도 없었다.
 * 한국어 안내 + 44px 터치 타겟의 재시도 버튼으로 그 자리에서 복구 가능하게 한다.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AdminPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 digest 를 콘솔에 남겨 운영자가 로그와 대조할 수 있게 한다.
    console.error('[admin portal error]', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1536px] px-4 py-8 md:px-6 md:py-12 lg:px-10">
      <div className="card mx-auto max-w-lg p-5 text-center md:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-dangerSoft text-status-danger">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-[19px] font-black tracking-[-0.02em] text-ink md:text-[22px]">
          불러오지 못했습니다
        </h1>
        <p className="mt-2 break-keep text-[13px] leading-relaxed text-ink-muted">
          데이터를 가져오는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.
          계속 실패하면 Supabase 연결·환경변수 설정을 확인하세요.
        </p>
        {error?.digest && (
          <p className="mt-2 font-mono text-[10px] text-ink-faint">digest: {error.digest}</p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary min-h-[44px] w-full text-sm sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" /> 다시 시도
          </button>
          <Link
            href="/admin"
            className="btn-secondary min-h-[44px] w-full text-sm sm:w-auto"
          >
            대시보드로
          </Link>
        </div>
      </div>
    </div>
  );
}
