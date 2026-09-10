"use server";
// 새 공고 알림 조건.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOARDS, EMPLOYMENT_TYPES, FIELDS, GENRES, REGIONS, ROLES } from "@/types/job";
import type { ActionResult } from "./auth";

const list = (fd: FormData, k: string, allowed: readonly string[]) =>
  fd.getAll(k).map(String).filter((v) => allowed.includes(v));

export async function saveAlert(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/alerts");
  const supabase = (await createClient())!;
  const id = String(fd.get("id") ?? "");
  const frequencyRaw = String(fd.get("frequency") ?? "daily");
  const row = {
    user_id: me.id,
    name: String(fd.get("name") ?? "").trim() || "내 알림",
    boards: list(fd, "boards", BOARDS.map((b) => b.code)),
    fields: list(fd, "fields", FIELDS.map((f) => f.code)),
    genres: list(fd, "genres", GENRES.map((g) => g.code)),
    roles: list(fd, "roles", ROLES.map((r) => r.code)),
    employment_types: list(fd, "employment_types", EMPLOYMENT_TYPES.map((e) => e.code)),
    regions: list(fd, "regions", REGIONS),
    near_me: fd.get("near_me") === "on",
    channels: list(fd, "channels", ["in_app", "email"]),
    frequency: ["instant", "daily", "weekly"].includes(frequencyRaw) ? frequencyRaw : "daily",
    is_active: fd.get("is_active") !== "off",
  };
  if (row.boards.length === 0) return { ok: false, error: "게시판을 하나 이상 골라주세요." };
  if (row.channels.length === 0) return { ok: false, error: "알림 받을 방법을 하나 이상 골라주세요." };

  const q = id
    ? supabase.from("alert_conditions").update(row).eq("id", id).eq("user_id", me.id)
    : supabase.from("alert_conditions").insert(row);
  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/me/alerts");
  return { ok: true };
}

export async function deleteAlert(id: string): Promise<void> {
  const me = await requireUser("/me/alerts");
  const supabase = (await createClient())!;
  await supabase.from("alert_conditions").delete().eq("id", id).eq("user_id", me.id);
  revalidatePath("/me/alerts");
}

export async function toggleAlert(id: string, isActive: boolean): Promise<void> {
  const me = await requireUser("/me/alerts");
  const supabase = (await createClient())!;
  await supabase.from("alert_conditions").update({ is_active: isActive }).eq("id", id).eq("user_id", me.id);
  revalidatePath("/me/alerts");
}
