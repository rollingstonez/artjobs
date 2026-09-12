"use server";
// 공고 저장(북마크) · 지원 · 기관 공고 등록/수정/마감.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { REGION_CENTERS } from "@/lib/location";
import { getPosting, splitPostingId } from "@/lib/postings";
import { createClient } from "@/lib/supabase/server";
import { contactError } from "@/lib/validation/contact";
import { BOARDS, EMPLOYMENT_TYPES, FIELDS, GENRES, REGIONS, ROLES } from "@/types/job";
import type { ActionResult } from "./auth";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const strOrNull = (fd: FormData, k: string) => str(fd, k) || null;
const inSet = (v: string, allowed: readonly string[]) => (allowed.includes(v) ? v : null);

// ── 저장 ──
export async function toggleBookmark(postingId: string, pathToRevalidate: string): Promise<{ saved: boolean }> {
  const me = await requireUser(pathToRevalidate);
  const supabase = (await createClient())!;
  const { source, rawId } = splitPostingId(postingId);
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", me.id)
    .eq("posting_source", source)
    .eq("posting_id", rawId)
    .maybeSingle();
  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
  } else {
    await supabase.from("bookmarks").insert({ user_id: me.id, posting_source: source, posting_id: rawId });
  }
  revalidatePath(pathToRevalidate);
  revalidatePath("/me/saved");
  return { saved: !existing };
}

// ── 지원 ──
export async function applyToPosting(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const postingId = str(fd, "posting_id");
  const me = await requireUser(`/jobs/${postingId}`, "artist");
  const supabase = (await createClient())!;
  const posting = await getPosting(postingId);
  if (!posting) return { ok: false, error: "공고를 찾을 수 없습니다." };
  const message = str(fd, "message");
  if (message.length < 10) return { ok: false, error: "지원 메시지를 10자 이상 적어주세요." };

  const { source, rawId } = splitPostingId(postingId);
  const { error } = await supabase.from("applications").insert({
    artist_user_id: me.id,
    posting_source: source,
    posting_id: rawId,
    org_user_id: posting.orgUserId ?? null,
    posting_title: posting.title,
    message,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 지원한 공고입니다." };
    return { ok: false, error: error.message };
  }

  // 기관 직접 공고면 메신저 대화방도 열고 지원 메시지를 첫 메시지로 넣는다
  if (posting.orgUserId) {
    const { data: conv } = await supabase
      .from("conversations")
      .upsert(
        { artist_user_id: me.id, org_user_id: posting.orgUserId, posting_source: source, posting_id: rawId },
        { onConflict: "artist_user_id,org_user_id" },
      )
      .select("id")
      .single();
    if (conv) {
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_user_id: me.id,
        body: `[지원] ${posting.title}\n\n${message}`,
      });
    }
  }
  revalidatePath(`/jobs/${postingId}`);
  revalidatePath(`/auditions/${postingId}`);
  revalidatePath("/me/applications");
  return { ok: true };
}

export async function withdrawApplication(id: string): Promise<void> {
  const me = await requireUser("/me/applications", "artist");
  const supabase = (await createClient())!;
  await supabase
    .from("applications")
    .update({ status: "withdrawn", status_changed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("artist_user_id", me.id);
  revalidatePath("/me/applications");
}

/** @deprecated 심사 작업대(actions/hiring.ts 의 setApplicationStage)를 쓴다. */
export async function setApplicationStatus(id: string, status: "viewed" | "shortlisted" | "interview" | "accepted" | "rejected"): Promise<void> {
  const me = await requireUser("/me/postings", "organization");
  const supabase = (await createClient())!;
  await supabase
    .from("applications")
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_user_id", me.id);
  revalidatePath("/me/postings");
}

// ── 기관 공고 ──
function postingPatch(fd: FormData, orgName: string) {
  const field = inSet(str(fd, "field"), FIELDS.map((f) => f.code));
  const region = inSet(str(fd, "region"), REGIONS);
  const center = region && region in REGION_CENTERS ? REGION_CENTERS[region as keyof typeof REGION_CENTERS] : null;
  const applyMethod = str(fd, "apply_method") === "external" ? "external" : "messenger";
  return {
    board: inSet(str(fd, "board"), BOARDS.map((b) => b.code)) ?? "job",
    field,
    genre: inSet(str(fd, "genre"), GENRES.filter((g) => g.field === field).map((g) => g.code)),
    role: inSet(str(fd, "role"), ROLES.map((r) => r.code)),
    title: str(fd, "title"),
    organization: orgName,
    employment_type: inSet(str(fd, "employment_type"), EMPLOYMENT_TYPES.map((e) => e.code)),
    employment_raw: strOrNull(fd, "employment_raw"),
    region,
    address: strOrNull(fd, "address"),
    lat: center?.lat ?? null,
    lng: center?.lng ?? null,
    salary: strOrNull(fd, "salary"),
    recruit_count: strOrNull(fd, "recruit_count"),
    apply_start: strOrNull(fd, "apply_start"),
    apply_end: strOrNull(fd, "apply_end"),
    work_start: strOrNull(fd, "work_start"),
    work_end: strOrNull(fd, "work_end"),
    apply_method: applyMethod,
    apply_url: applyMethod === "external" ? strOrNull(fd, "apply_url") : null,
    required_docs: strOrNull(fd, "required_docs"),
    description: strOrNull(fd, "description"),
    status: str(fd, "status") === "draft" ? "draft" : "open",
  };
}

/** 공고 본문에 개인 연락처가 들어갔는지 확인한다(기관 대표번호는 허용). */
function postingContactError(patch: { description?: string | null; required_docs?: string | null; title?: string }): string | null {
  return contactError([patch.title, patch.description, patch.required_docs].filter(Boolean).join("\n"), "posting");
}

export async function createOrgPosting(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/post", "organization");
  const supabase = (await createClient())!;
  const patch = postingPatch(fd, me.org?.org_name ?? me.profile.display_name);
  if (patch.title.length < 5) return { ok: false, error: "공고 제목을 5자 이상 적어주세요." };
  if (!patch.field) return { ok: false, error: "분야를 골라주세요." };
  const contact = postingContactError(patch);
  if (contact) return { ok: false, error: contact };
  if (!patch.region) return { ok: false, error: "지역을 골라주세요." };
  if (patch.apply_method === "external" && !patch.apply_url) return { ok: false, error: "접수 페이지 주소를 적어주세요." };
  const { data, error } = await supabase
    .from("org_postings")
    .insert({ ...patch, org_user_id: me.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/jobs");
  revalidatePath("/auditions");
  revalidatePath("/me/postings");
  redirect(`/${patch.board === "audition" ? "auditions" : "jobs"}/org:${data.id}`);
}

export async function updateOrgPosting(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = str(fd, "id");
  const me = await requireUser(`/post/${id}/edit`, "organization");
  const supabase = (await createClient())!;
  const patch = postingPatch(fd, me.org?.org_name ?? me.profile.display_name);
  if (patch.title.length < 5) return { ok: false, error: "공고 제목을 5자 이상 적어주세요." };
  if (!patch.field) return { ok: false, error: "분야를 골라주세요." };
  if (!patch.region) return { ok: false, error: "지역을 골라주세요." };
  const contact = postingContactError(patch);
  if (contact) return { ok: false, error: contact };
  const { error } = await supabase.from("org_postings").update(patch).eq("id", id).eq("org_user_id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/jobs");
  revalidatePath("/auditions");
  revalidatePath("/me/postings");
  redirect("/me/postings");
}

export async function closeOrgPosting(id: string): Promise<void> {
  const me = await requireUser("/me/postings", "organization");
  const supabase = (await createClient())!;
  await supabase.from("org_postings").update({ status: "closed" }).eq("id", id).eq("org_user_id", me.id);
  revalidatePath("/jobs");
  revalidatePath("/auditions");
  revalidatePath("/me/postings");
}

export async function deleteOrgPosting(id: string): Promise<void> {
  const me = await requireUser("/me/postings", "organization");
  const supabase = (await createClient())!;
  await supabase
    .from("org_postings")
    .update({ deleted_at: new Date().toISOString(), status: "closed" })
    .eq("id", id)
    .eq("org_user_id", me.id);
  revalidatePath("/me/postings");
}
