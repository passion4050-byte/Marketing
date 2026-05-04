import Link from "next/link";
import { siteConfig, navItems } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-content flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="메디맵 홈">
          <Logo />
          <span className="sr-only">메디맵</span>
        </Link>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={siteConfig.contact.kakao}
            className="btn-primary ml-2 text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            메디맵 바로가기
          </Link>
        </nav>
        <Link
          href={siteConfig.contact.kakao}
          className="btn-primary text-sm md:hidden"
          target="_blank"
          rel="noopener noreferrer"
        >
          바로가기
        </Link>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#0057FF" />
        <path
          d="M9 22V10l4 7 4-7v12M21 10v12M21 13.5l3-3.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div className="text-xs font-semibold text-ink-muted">메디맵</div>
        <div className="text-sm font-extrabold tracking-tight text-brand">
          MEDIMAP
        </div>
      </div>
    </div>
  );
}
