"use server";
// 구직 게시판: 예술가가 "이런 일을 찾습니다" 글을 올리고 닫고 연장한다.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EMPLOYMENT_TYPES, FIELDS, GENRES, REGIONS, ROLES } from "@/types/job";
import type { ActionResult } from "./auth";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const strOrNull = (fd: FormData, k: string) => str(fd, k) || null;
const list = (fd: FormData, k: string, allowed: readonly string[]) => fd.getAll(k).map(String).filter((v) => allowed.includes(v));
const inSet = (v: string, allowed: readonly string[]) => (allowed.includes(v) ? v : null);

function revalidate(id?: string) {
  revalidatePath("/seeking");
  revalidatePath("/me/seeking");
  revalidatePath("/");
  if (id) revalidatePath(`/seeking/${id}`);
}

export async function saveSeeking(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/seeking", "artist");
  const supabase = (await createClient())!;
  const id = strOrNull(fd, "id");
  const title = str(fd, "title");
  const body = str(fd, "body");
  if (title.length < 5) return { ok: false, error: "제목을 5자 이상 적어주세요." };
  if (body.length < 20) return { ok: false, error: "내용을 20자 이상 적어주세요. 어떤 일을 할 수 있고 언제부터 가능한지가 핵심입니다." };
  const field = inSet(str(fd, "field"), FIELDS.map((f) => f.code));
  const patch = {
    display_name: me.profile.display_name,
    career_years: me.artist?.career_years ?? null,
    title,
    body,
    field,
    genres: list(fd, "genres", GENRES.filter((g) => g.field === field).map((g) => g.code)),
    roles: list(fd, "roles", ROLES.map((r) => r.code)),
    employment_types: list(fd, "employment_types", EMPLOYMENT_TYPES.map((e) => e.code)),
    region: inSet(str(fd, "region"), REGIONS),
    address_hint: strOrNull(fd, "address_hint"),
    available_from: strOrNull(fd, "available_from"),
    available_until: strOrNull(fd, "available_until"),
  };
  if (id) {
    const { error } = await supabase.from("seeking_posts").update(patch).eq("id", id).eq("artist_user_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidate(id);
    redirect(`/seeking/${id}`);
  }
  const { data, error } = await supabase.from("seeking_posts").insert({ ...patch, artist_user_id: me.id }).select("id").single();
  if (error) return { ok: false, error: error.message.includes("3개") ? "열어둘 수 있는 구직 글은 3개까지입니다. 기존 글을 닫거나 지운 뒤 올려주세요." : error.message };
  revalidate(data.id);
  redirect(`/seeking/${data.id}`);
}

export async function setSeekingStatus(id: string, status: "open" | "closed"): Promise<void> {
  const me = await requireUser("/me/seeking", "artist");
  const supabase = (await createClient())!;
  await supabase.from("seeking_posts").update({ status }).eq("id", id).eq("artist_user_id", me.id);
  revalidate(id);
}

/** 만료일을 오늘부터 60일 뒤로 다시 잡고 열어둔다(연장). */
export async function renewSeeking(id: string): Promise<void> {
  const me = await requireUser("/me/seeking", "artist");
  const supabase = (await createClient())!;
  const d = new Date();
  d.setDate(d.getDate() + 60);
  await supabase.from("seeking_posts").update({ status: "open", expires_at: d.toISOString().slice(0, 10) }).eq("id", id).eq("artist_user_id", me.id);
  revalidate(id);
}

export async function deleteSeeking(id: string): Promise<void> {
  const me = await requireUser("/me/seeking", "artist");
  const supabase = (await createClient())!;
  await supabase.from("seeking_posts").update({ deleted_at: new Date().toISOString(), status: "closed" }).eq("id", id).eq("artist_user_id", me.id);
  revalidate(id);
}

/** 운영자: 부적절한 글 내리기. */
export async function adminHideSeeking(id: string): Promise<void> {
  const me = await requireUser("/admin/seeking");
  if (!me.profile.is_admin) return;
  const supabase = (await createClient())!;
  await supabase.from("seeking_posts").update({ deleted_at: new Date().toISOString(), status: "closed" }).eq("id", id);
  await supabase.from("admin_logs").insert({ admin_user_id: me.id, action: "seeking_hide", target_type: "seeking", target_id: id });
  revalidate(id);
  revalidatePath("/admin/seeking");
}
