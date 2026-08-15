/**
 * Round 148-d — 병원 클라이언트 로그인 (서버 래퍼).
 * /c/{code} 고유링크가 ?u=아이디&h=병원명 으로 리다이렉트 → 프리필해 LoginForm 에 전달.
 * ⚠️ Next 14 — searchParams 는 동기 객체 (Promise 금지).
 */
import { LoginForm } from '@/components/client/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '병원 관리자 로그인 · WECIRCLE',
  robots: { index: false, follow: false },
};

export default function ClientLoginPage({
  searchParams,
}: {
  searchParams: { u?: string; h?: string };
}) {
  return (
    <LoginForm
      initialUsername={(searchParams.u ?? '').slice(0, 64)}
      hospitalName={(searchParams.h ?? '').slice(0, 64)}
    />
  );
}
