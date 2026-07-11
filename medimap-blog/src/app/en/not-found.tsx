import Link from "next/link";

export default function EnNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
        Error · 404
      </div>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-stone-950">
        This page isn&apos;t here.
      </h1>
      <p className="mt-3 text-stone-600">
        The guide may have moved or been renamed. Explore our other resources instead.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/en"
          className="rounded-full bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-stone-700"
        >
          Back to home
        </Link>
        <Link
          href="/en/guides/best-skin-clinics-in-gangnam"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-bold text-stone-800 transition hover:border-stone-900"
        >
          See a sample guide
        </Link>
      </div>
    </div>
  );
}
