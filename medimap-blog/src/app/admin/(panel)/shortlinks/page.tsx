import { Link2, ExternalLink } from "lucide-react";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  slug: string;
  target_url: string;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

async function loadShortlinks(): Promise<Row[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    return await sql<Row[]>`
      SELECT slug, target_url, click_count, is_active, created_at
      FROM shortlinks
      ORDER BY click_count DESC, created_at DESC
      LIMIT 100
    `;
  } catch {
    return [];
  }
}

export default async function ShortlinksPage() {
  const rows = await loadShortlinks();
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-white p-6 shadow-card text-[13px] text-ink-muted">
        <div className="flex items-start gap-3">
          <Link2 size={18} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <div className="font-semibold text-ink">단축링크 통계 (조회 전용)</div>
            <p className="mt-1">
              현재 발급된 단축 URL 의 누적 클릭 수. 신규 발급은 추후 별도 폼으로 추가 예정.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-card bg-white shadow-card">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line/70 bg-surface-alt/50 text-[11.5px] font-semibold text-ink-subtle">
              <th className="px-6 py-3 text-left">slug</th>
              <th className="px-3 py-3 text-left">target</th>
              <th className="px-3 py-3 text-right">클릭</th>
              <th className="px-3 py-3 text-left">상태</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-[13px] text-ink-subtle"
                >
                  단축링크가 아직 없거나 DB가 연결되지 않았습니다.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.slug}
                className="border-b border-line/40 transition hover:bg-surface-alt/40"
              >
                <td className="px-6 py-3 font-mono text-[12.5px] text-ink">
                  /r/{r.slug}
                </td>
                <td className="px-3 py-3 text-ink-muted truncate max-w-[420px]">
                  {r.target_url}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-brand num">
                  {r.click_count.toLocaleString("ko-KR")}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-[11px] font-semibold ${
                      r.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {r.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <a
                    href={r.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-muted hover:text-brand"
                  >
                    이동 <ExternalLink size={11} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
