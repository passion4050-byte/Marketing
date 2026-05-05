import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";

export default function NotFound() {
  return (
    <section className="container-content py-24 md:py-32">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="text-[120px] font-extrabold leading-none tracking-tighter">
          <span className="bg-gradient-to-br from-brand to-accent bg-clip-text text-transparent">
            404
          </span>
        </div>
        <h1 className="mt-2 text-display-md balance-text">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-4 max-w-md text-ink-muted pretty-text">
          요청하신 페이지가 이동되었거나 더 이상 존재하지 않습니다. 메디맵
          인사이트에서 비슷한 글을 찾아보세요.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            <Home size={16} /> 홈으로 돌아가기
          </Link>
          <Link href="/blog" className="btn-secondary">
            블로그 둘러보기 <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
