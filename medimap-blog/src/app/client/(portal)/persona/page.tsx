import { User, Save } from "lucide-react";
import { getClientPersona, updateClientPersona } from "@/lib/client-data";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function handleSave(formData: FormData) {
  "use server";
  await updateClientPersona({
    domain_category: String(formData.get("domain_category") ?? ""),
    region: String(formData.get("region") ?? ""),
    business_model: String(formData.get("business_model") ?? ""),
    address: String(formData.get("address") ?? "") || undefined,
    homepage: String(formData.get("homepage") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    naver_place_url: String(formData.get("naver_place_url") ?? "") || undefined,
  });
  revalidatePath("/client/persona");
}

export default async function ClientPersonaPage() {
  const p = await getClientPersona();
  if (!p) {
    return <div className="rounded-card border border-line bg-white p-8 text-center text-ink-subtle">Tenant 정보를 불러올 수 없습니다.</div>;
  }
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-brand">병원 정보</div>
        <h1 className="mt-1 text-[24px] font-bold tracking-tight text-ink">{p.name} 페르소나</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          이 정보를 바탕으로 메디맵 에디터가 콘텐츠 톤, 타겟 독자, CTA 를 조정합니다.
        </p>
      </header>

      <form action={handleSave} className="space-y-4 rounded-card border border-line bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="domain_category" label="분야" defaultValue={p.domain_category} placeholder="예: 안과/시력교정" required />
          <Field name="region" label="지역" defaultValue={p.region} placeholder="예: 서울 강남" required />
        </div>
        <TextareaField name="business_model" label="비즈니스 모델 (콘텐츠 톤)" defaultValue={p.business_model}
                       placeholder="예: 라식/라섹/렌즈삽입술 전문 안과. 30~40대 직장인 타겟. 안전성 + 회복 빠름 강조." rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="phone" label="전화" defaultValue={p.phone ?? ""} placeholder="예: 02-0000-0000" />
          <Field name="homepage" label="홈페이지" defaultValue={p.homepage ?? ""} placeholder="https://..." type="url" />
        </div>
        <Field name="address" label="주소" defaultValue={p.address ?? ""} placeholder="서울시 강남구..." />
        <Field name="naver_place_url" label="네이버 플레이스 URL" defaultValue={p.naver_place_url ?? ""}
               placeholder="https://map.naver.com/p/entry/place/..." type="url" />

        <div className="border-t border-line/70 pt-4">
          <button type="submit"
                  className="inline-flex items-center gap-1.5 rounded-pill bg-brand px-5 py-2.5 text-[13px] font-semibold text-white shadow-cta hover:bg-brand-600">
            <Save size={14} /> 저장
          </button>
          <span className="ml-3 text-[11.5px] text-ink-subtle">
            저장 즉시 다음 콘텐츠 생성부터 반영됩니다.
          </span>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, defaultValue, placeholder, type = "text", required }: any) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink-muted">{label}{required && <span className="text-brand">*</span>}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} className="form-input mt-1" />
    </label>
  );
}

function TextareaField({ name, label, defaultValue, placeholder, rows = 3 }: any) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink-muted">{label}</span>
      <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={rows}
                className="form-input mt-1 resize-y leading-relaxed" />
    </label>
  );
}
