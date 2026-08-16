import Link from "next/link";

export default function TwNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
        Error · 404
      </div>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
        找不到此頁面。
      </h1>
      <p className="mt-3 text-stone-600">
        該攻略可能已移動或重新命名。請瀏覽其他資源。
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/tw"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
        >
          返回首頁
        </Link>
        <Link
          href="/tw/blog"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900"
        >
          查看攻略
        </Link>
      </div>
    </div>
  );
}
