"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isInquiryStatus,
  updateInquiry,
  type InquiryStatus,
} from "@/lib/inquiries";

export async function updateInquiryAction(
  formData: FormData,
): Promise<void> {
  const idRaw = formData.get("id");
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("invalid-id");
  }
  const statusRaw = formData.get("status");
  const notesRaw = formData.get("notes");

  const status: InquiryStatus | undefined = isInquiryStatus(statusRaw)
    ? (statusRaw as InquiryStatus)
    : undefined;
  const notes =
    typeof notesRaw === "string" ? notesRaw.slice(0, 4000) : undefined;

  await updateInquiry(id, { status, notes });

  revalidatePath(`/admin/inquiries/${id}`);
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  redirect(`/admin/inquiries/${id}?saved=1`);
}
