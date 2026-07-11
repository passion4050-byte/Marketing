import Link from "next/link";

export default function JaNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
        Error · 404
      </div>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
        このページはありません。
      </h1>
      <p className="mt-3 text-stone-600">
        ガイドが移動または名称変更された可能性があります。他のリソースをご覧ください。
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/ja"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
        >
          ホームへ戻る
        </Link>
        <Link
          href="/ja/guides/smile-lasik-in-korea"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900"
        >
          サンプルガイドを見る
        </Link>
      </div>
    </div>
  );
}
