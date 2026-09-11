"use server";
// 운영자 액션. 모두 requireAdmin 을 거치고, DB 쪽도 is_admin() RLS 가 한 번 더 막는다.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setOrgVerified(userId: string, verified: boolean): Promise<void> {
  await requireAdmin("/admin/orgs");
  const supabase = (await createClient())!;
  await supabase.from("org_profiles").update({ is_verified: verified }).eq("user_id", userId);
  revalidatePath("/admin/orgs");
  revalidatePath("/admin");
}

export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 계정은 정지 불가
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ status }).eq("id", userId);
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 권한은 못 뺀다
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  revalidatePath("/admin/users");
}

export async function setReportStatus(id: string, status: "open" | "reviewed" | "closed"): Promise<void> {
  await requireAdmin("/admin/reports");
  const supabase = (await createClient())!;
  await supabase.from("user_reports").update({ status }).eq("id", id);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function adminClosePosting(id: string): Promise<void> {
  await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed" }).eq("id", id);
  revalidatePath("/admin/postings");
  revalidatePath("/jobs");
  revalidatePath("/auditions");
}

export async function adminDeletePosting(id: string): Promise<void> {
  await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed", deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/postings");
  revalidatePath("/jobs");
  revalidatePath("/auditions");
}

export async function setSourceActive(code: string, active: boolean): Promise<void> {
  await requireAdmin("/admin/sources");
  const supabase = (await createClient())!;
  await supabase.from("crawl_sources").update({ is_active: active }).eq("code", code);
  revalidatePath("/admin/sources");
  revalidatePath("/admin");
}
