"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  expectedSessionToken,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin-auth";

export async function loginAction(formData: FormData): Promise<void> {
  if (!isAdminConfigured()) {
    redirect("/admin/login?setup=1");
  }
  const password = formData.get("password");
  const from = formData.get("from");
  if (typeof password !== "string" || !password) {
    redirect("/admin/login?error=missing");
  }
  const ok = await verifyPassword(password as string);
  if (!ok) {
    redirect("/admin/login?error=invalid");
  }
  const token = await expectedSessionToken();
  if (!token) redirect("/admin/login?setup=1");
  cookies().set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  const dest =
    typeof from === "string" && from.startsWith("/admin") ? from : "/admin";
  redirect(dest);
}
