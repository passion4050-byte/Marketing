import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-content py-32 text-center">
      <h1 className="text-display-md">페이지를 찾을 수 없습니다</h1>
      <p className="mt-4 text-ink-muted">요청하신 페이지가 이동되었거나 더 이상 존재하지 않습니다.</p>
      <Link href="/" className="btn-primary mt-8 inline-flex">
        홈으로 돌아가기
      </Link>
    </section>
  );
}
