"use server";
// 프로필 저장 (예술가 · 기관) 과 알림 설정.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REGION_CENTERS } from "@/lib/location";
import { ORG_TYPES, artistCompleteness, orgCompleteness, type ArtistProfile, type OrgProfile } from "@/types/account";
import { EMPLOYMENT_TYPES, FIELDS, GENRES, REGIONS, ROLES } from "@/types/job";
import type { ActionResult } from "./auth";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const strOrNull = (fd: FormData, k: string) => str(fd, k) || null;
const list = (fd: FormData, k: string, allowed: readonly string[]) =>
  fd.getAll(k).map(String).filter((v) => allowed.includes(v));
const intOrNull = (fd: FormData, k: string) => {
  const v = parseInt(str(fd, k), 10);
  return Number.isFinite(v) ? v : null;
};
const inSet = (v: string, allowed: readonly string[]) => (allowed.includes(v) ? v : null);

export async function saveArtistProfile(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/profile", "artist");
  const supabase = (await createClient())!;

  const field = inSet(str(fd, "field"), FIELDS.map((f) => f.code));
  const genres = list(fd, "genres", GENRES.filter((g) => g.field === field).map((g) => g.code));
  const region = inSet(str(fd, "region"), REGIONS);
  const center = region && region in REGION_CENTERS ? REGION_CENTERS[region as keyof typeof REGION_CENTERS] : null;

  const patch: Partial<ArtistProfile> = {
    field,
    genres,
    roles: list(fd, "roles", ROLES.map((r) => r.code)),
    employment_types: list(fd, "employment_types", EMPLOYMENT_TYPES.map((e) => e.code)),
    region: region as ArtistProfile["region"],
    address_hint: strOrNull(fd, "address_hint"),
    // 좌표는 시·도 중심으로 두고, 나중에 주소 지오코딩으로 정밀화한다
    lat: center?.lat ?? null,
    lng: center?.lng ?? null,
    max_distance_km: Math.min(200, Math.max(5, intOrNull(fd, "max_distance_km") ?? 30)),
    career_years: intOrNull(fd, "career_years"),
    education: strOrNull(fd, "education"),
    bio: strOrNull(fd, "bio"),
    career: strOrNull(fd, "career"),
    portfolio_url: strOrNull(fd, "portfolio_url"),
    availability: str(fd, "availability") === "closed" ? "closed" : "open",
    is_public: fd.get("is_public") === "on",
    allow_messages: fd.get("allow_messages") === "on",
  };
  const merged = { ...(me.artist as ArtistProfile), ...patch };
  patch.profile_completed = artistCompleteness(merged).percent === 100;

  const displayName = str(fd, "display_name");
  if (displayName && displayName !== me.profile.display_name) {
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", me.id);
  }
  const { error } = await supabase.from("artist_profiles").update(patch).eq("user_id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { ok: true };
}

export async function saveOrgProfile(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/profile", "organization");
  const supabase = (await createClient())!;

  const orgName = str(fd, "org_name");
  if (!orgName) return { ok: false, error: "기관명을 적어주세요." };
  const region = inSet(str(fd, "region"), REGIONS);
  const center = region && region in REGION_CENTERS ? REGION_CENTERS[region as keyof typeof REGION_CENTERS] : null;

  const patch: Partial<OrgProfile> = {
    org_name: orgName,
    org_type: inSet(str(fd, "org_type"), ORG_TYPES.map((t) => t.code)) as OrgProfile["org_type"],
    field: inSet(str(fd, "field"), FIELDS.map((f) => f.code)),
    region: region as OrgProfile["region"],
    address: strOrNull(fd, "address"),
    lat: center?.lat ?? null,
    lng: center?.lng ?? null,
    website: strOrNull(fd, "website"),
    intro: strOrNull(fd, "intro"),
  };
  const merged = { ...(me.org as OrgProfile), ...patch };
  patch.profile_completed = orgCompleteness(merged).percent === 100;

  await supabase.from("profiles").update({ display_name: orgName }).eq("id", me.id);
  const { error } = await supabase.from("org_profiles").update(patch).eq("user_id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { ok: true };
}

export async function saveSettings(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/settings");
  const supabase = (await createClient())!;
  const { error } = await supabase.from("user_settings").upsert({
    user_id: me.id,
    message_notification: fd.get("message_notification") === "on",
    new_posting_notification: fd.get("new_posting_notification") === "on",
    application_notification: fd.get("application_notification") === "on",
    email_notification: fd.get("email_notification") === "on",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/me/settings");
  return { ok: true };
}
