import { Tag, Plus } from "lucide-react";
import { listClientKeywords, addClientKeyword, toggleClientKeyword } from "@/lib/client-data";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function handleAdd(formData: FormData) {
  "use server";
  const text = String(formData.get("text") ?? "");
  const category = String(formData.get("category") ?? "");
  await addClientKeyword(text, category || undefined);
  revalidatePath("/client/keywords");
}

async function handleToggle(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (id) await toggleClientKeyword(id, active);
  revalidatePath("/client/keywords");
}

export default async function ClientKeywordsPage() {
  const keywords = await listClientKeywords();
  const activeCount = keywords.filter((k) => k.is_active).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-brand">키워드 관리</div>
        <h1 className="mt-1 text-[24px] font-bold tracking-tight text-ink">희망 키워드</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          이곳에 등록한 키워드를 기반으로 위서클 에디터 팀이 콘텐츠를 자동 발행합니다.
          현재 활성 키워드 <b className="text-ink">{activeCount}</b>개.
        </p>
      </header>

      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="text-[14px] font-bold text-ink">+ 새 키워드 추가</h2>
        <form action={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input name="text" required maxLength={100} placeholder="예: 강남라식, 백내장수술"
                 className="form-input" />
          <input name="category" maxLength={40} placeholder="분류 (선택)"
                 className="form-input" />
          <button type="submit"
                  className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-brand px-5 py-2.5 text-[13px] font-semibold text-white shadow-cta hover:bg-brand-600">
            <Plus size={14} /> 추가
          </button>
        </form>
        <p className="mt-2 text-[11.5px] text-ink-subtle">
          💡 추가된 키워드는 다음 발행 cycle (매시간) 부터 콘텐츠 생성에 포함됩니다.
        </p>
      </div>

      <div className="rounded-card border border-line bg-white">
        <div className="border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">등록된 키워드 ({keywords.length}건)</h2>
        </div>
        <div className="divide-y divide-line/70">
          {keywords.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Tag size={14} className={k.is_active ? "text-brand" : "text-ink-subtle"} />
                <div>
                  <div className={`text-[14px] font-semibold ${k.is_active ? "text-ink" : "text-ink-subtle line-through"}`}>
                    {k.text}
                  </div>
                  {k.category && (
                    <div className="text-[11px] text-ink-subtle">분류: {k.category}</div>
                  )}
                </div>
              </div>
              <form action={handleToggle}>
                <input type="hidden" name="id" value={k.id} />
                <input type="hidden" name="active" value={(!k.is_active).toString()} />
                <button type="submit"
                        className={k.is_active
                          ? "rounded-pill border border-line bg-white px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:border-status-warning hover:text-status-warning"
                          : "rounded-pill bg-brand px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-brand-600"
                        }>
                  {k.is_active ? "비활성화" : "활성화"}
                </button>
              </form>
            </div>
          ))}
          {keywords.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-ink-subtle">
              아직 등록된 키워드가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
