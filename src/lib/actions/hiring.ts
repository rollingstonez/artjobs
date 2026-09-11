"use server";
// 심사 작업대: 구성원·심사위원 초청, 점수·메모 저장, 선발 단계 변경, 초대 수락, 보관 기간·파기.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPostingAccess } from "@/lib/hiring";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STAGES, type ApplicationStatus } from "@/types/account";
import type { ActionResult } from "./auth";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── 기관 구성원 ──
export async function inviteMember(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/team", "organization");
  const supabase = (await createClient())!;
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role") === "admin" ? "admin" : "member";
  if (!EMAIL_RE.test(email)) return { ok: false, error: "이메일 주소를 확인해주세요." };
  if (me.email && email === me.email.toLowerCase()) return { ok: false, error: "본인은 초청할 수 없습니다." };

  const { data: userId } = await supabase.rpc("resolve_user_by_email", { p_email: email });
  const { error } = await supabase.from("org_members").insert({
    org_user_id: me.id,
    member_user_id: userId ?? null,
    email,
    role,
    invited_by: me.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 초청한 이메일입니다." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/me/team");
  return { ok: true };
}

/** 구성원 해제(관리자) 또는 탈퇴(본인). 누가 지울 수 있는지는 RLS 가 판정한다. */
export async function removeMember(id: string): Promise<void> {
  await requireUser("/me/team");
  const supabase = (await createClient())!;
  await supabase.from("org_members").delete().eq("id", id);
  revalidatePath("/me/team");
  revalidatePath("/me/reviews");
}

export async function setMemberRole(id: string, role: "admin" | "member"): Promise<void> {
  await requireUser("/me/team", "organization");
  const supabase = (await createClient())!;
  await supabase.from("org_members").update({ role }).eq("id", id);
  revalidatePath("/me/team");
}

// ── 공고별 심사위원 ──
export async function inviteReviewer(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const postingId = str(fd, "posting_id");
  const path = `/me/postings/${postingId}/review`;
  const me = await requireUser(path);
  const access = await getPostingAccess(postingId);
  if (!access?.isAdmin) return { ok: false, error: "심사위원 초청은 기관 관리자만 할 수 있습니다." };
  const supabase = (await createClient())!;
  const email = str(fd, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "이메일 주소를 확인해주세요." };

  const { data: userId } = await supabase.rpc("resolve_user_by_email", { p_email: email });
  const { error } = await supabase.from("posting_reviewers").insert({
    posting_id: postingId,
    user_id: userId ?? null,
    email,
    invited_by: me.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 초청한 이메일입니다." };
    return { ok: false, error: error.message };
  }
  revalidatePath(path);
  return { ok: true };
}

export async function removeReviewer(postingId: string, id: string): Promise<void> {
  await requireUser(`/me/postings/${postingId}/review`);
  const supabase = (await createClient())!;
  await supabase.from("posting_reviewers").delete().eq("id", id);
  revalidatePath(`/me/postings/${postingId}/review`);
  revalidatePath("/me/reviews");
}

// ── 초대 수락 ──
export async function acceptInvitation(token: string): Promise<void> {
  await requireUser(`/invite/${token}`);
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) redirect(`/invite/${token}?result=error`);
  const result = String(data ?? "");
  if (result.startsWith("member:")) redirect("/me/reviews?joined=member");
  if (result.startsWith("reviewer:")) redirect(`/me/postings/${result.slice(9)}/review`);
  redirect(`/invite/${token}?result=${result}`);
}

// ── 점수 · 메모 ──
export async function saveReview(
  postingId: string,
  applicationId: string,
  input: { score: number | null; memo: string },
): Promise<{ ok: true; updated_at: string } | { ok: false; error: string }> {
  const me = await requireUser(`/me/postings/${postingId}/review`);
  const access = await getPostingAccess(postingId);
  if (!access) return { ok: false, error: "이 공고를 심사할 권한이 없습니다." };
  const supabase = (await createClient())!;
  const score = input.score == null || Number.isNaN(input.score) ? null : Math.max(0, Math.min(100, Math.round(input.score)));
  const memo = input.memo.trim().slice(0, 4000) || null;
  const { data, error } = await supabase
    .from("application_reviews")
    .upsert({ application_id: applicationId, reviewer_user_id: me.id, score, memo }, { onConflict: "application_id,reviewer_user_id" })
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, updated_at: data.updated_at };
}

// ── 선발 단계 ──
export async function setApplicationStage(postingId: string, applicationId: string, status: ApplicationStatus): Promise<ActionResult> {
  await requireUser(`/me/postings/${postingId}/review`);
  const access = await getPostingAccess(postingId);
  if (!access?.isTeam) return { ok: false, error: "선발 단계는 기관 구성원만 바꿀 수 있습니다." };
  if (!APPLICATION_STAGES.some((s) => s.code === status)) return { ok: false, error: "알 수 없는 단계입니다." };
  const supabase = (await createClient())!;
  const { error } = await supabase
    .from("applications")
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("posting_source", "org")
    .eq("posting_id", postingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/me/postings/${postingId}/review`);
  revalidatePath("/me/postings");
  return { ok: true };
}

// ── 보관 기간 · 파기 ──
export async function setRetentionDays(postingId: string, days: number): Promise<ActionResult> {
  await requireUser(`/me/postings/${postingId}/review`);
  const access = await getPostingAccess(postingId);
  if (!access?.isAdmin) return { ok: false, error: "보관 기간은 기관 관리자만 바꿀 수 있습니다." };
  const supabase = (await createClient())!;
  const d = Math.max(30, Math.min(1095, Math.round(days)));
  const { error } = await supabase.from("org_postings").update({ retention_days: d }).eq("id", postingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/me/postings/${postingId}/review`);
  return { ok: true };
}

/** 보관 기간이 지난 지원서의 개인정보를 지금 정리한다(기관 소유자). 지운 건수를 주소로 넘겨 화면에 보여준다. */
export async function purgeExpiredNow(): Promise<void> {
  const me = await requireUser("/me/team", "organization");
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("purge_expired_applications", { p_org: me.id });
  revalidatePath("/me/team");
  revalidatePath("/me/postings");
  redirect(`/me/team?purged=${error ? "error" : typeof data === "number" ? data : 0}`);
}
