import Link from "next/link";

export default function ZhNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
        Error · 404
      </div>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
        找不到此页面。
      </h1>
      <p className="mt-3 text-stone-600">
        该指南可能已移动或重命名。请浏览其他资源。
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/zh"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
        >
          返回首页
        </Link>
        <Link
          href="/zh/guides/smile-lasik-in-korea"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900"
        >
          查看示例指南
        </Link>
      </div>
    </div>
  );
}
