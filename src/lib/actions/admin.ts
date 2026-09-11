"use server";
// 운영자 액션. 모두 requireAdmin 을 거치고, DB 쪽도 is_admin() RLS 가 한 번 더 막는다.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Supa = NonNullable<Awaited<ReturnType<typeof createClient>>>;

/** 운영자 활동 로그. 실패해도 본 작업은 막지 않는다. */
async function log(supabase: Supa, adminId: string, action: string, targetType: string, targetId: string, detail?: Record<string, unknown>) {
  await supabase.from("admin_logs").insert({ admin_user_id: adminId, action, target_type: targetType, target_id: targetId, detail: detail ?? null });
}

export async function setOrgVerified(userId: string, verified: boolean): Promise<void> {
  const me = await requireAdmin("/admin/orgs");
  const supabase = (await createClient())!;
  await supabase.from("org_profiles").update({ is_verified: verified }).eq("user_id", userId);
  await log(supabase, me.id, verified ? "org_verify" : "org_unverify", "org", userId);
  revalidatePath("/admin/orgs");
  revalidatePath("/admin");
}

export async function setUserStatus(userId: string, status: "active" | "suspended"): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 계정은 정지 불가
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ status }).eq("id", userId);
  await log(supabase, me.id, status === "suspended" ? "user_suspend" : "user_restore", "user", userId);
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const me = await requireAdmin("/admin/users");
  if (userId === me.id) return; // 자기 권한은 못 뺀다
  const supabase = (await createClient())!;
  await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId);
  await log(supabase, me.id, isAdmin ? "admin_grant" : "admin_revoke", "user", userId);
  revalidatePath("/admin/users");
}

export async function setReportStatus(id: string, status: "open" | "reviewed" | "closed"): Promise<void> {
  const me = await requireAdmin("/admin/reports");
  const supabase = (await createClient())!;
  await supabase.from("user_reports").update({ status }).eq("id", id);
  await log(supabase, me.id, "report_status", "report", id, { status });
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function adminClosePosting(id: string): Promise<void> {
  const me = await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed" }).eq("id", id);
  await log(supabase, me.id, "posting_close", "posting", id);
  revalidatePath("/admin/postings");
  revalidatePath("/jobs");
  revalidatePath("/auditions");
}

export async function adminDeletePosting(id: string): Promise<void> {
  const me = await requireAdmin("/admin/postings");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed", deleted_at: new Date().toISOString() }).eq("id", id);
  await log(supabase, me.id, "posting_delete", "posting", id);
  revalidatePath("/admin/postings");
  revalidatePath("/jobs");
  revalidatePath("/auditions");
}

export async function setSourceActive(code: string, active: boolean): Promise<void> {
  const me = await requireAdmin("/admin/sources");
  const supabase = (await createClient())!;
  await supabase.from("crawl_sources").update({ is_active: active }).eq("code", code);
  await log(supabase, me.id, active ? "source_on" : "source_off", "source", code);
  revalidatePath("/admin/sources");
  revalidatePath("/admin");
}
