"use server";
// 프로필 저장 (예술가 · 기관) 과 알림 설정.
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contactError } from "@/lib/validation/contact";
import { REGION_CENTERS } from "@/lib/location";
import { ORG_DOC_TYPES, ORG_TYPES, PORTFOLIO_KINDS, artistCompleteness, orgCompleteness, type ArtistProfile, type OrgProfile } from "@/types/account";
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
  const contact = contactError([patch.bio, patch.career, patch.education].filter(Boolean).join("\n"), "profile");
  if (contact) return { ok: false, error: contact };
  const merged = { ...(me.artist as ArtistProfile), ...patch };
  patch.profile_completed = artistCompleteness(merged).percent === 100;

  const displayName = str(fd, "display_name");
  if (displayName && displayName !== me.profile.display_name) {
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", me.id);
  }
  const { error } = await supabase.from("artist_profiles").update(patch).eq("user_id", me.id);
  if (error) return { ok: false, error: error.message };

  // 포트폴리오 링크: 폼의 순서대로 통째로 갈아끼운다(pf_kind · pf_title · pf_url 이 같은 순서).
  const kinds = fd.getAll("pf_kind").map(String);
  const titles = fd.getAll("pf_title").map(String);
  const urls = fd.getAll("pf_url").map(String);
  const items = urls
    .map((url, i) => ({ url: url.trim(), title: (titles[i] ?? "").trim() || null, kind: kinds[i] ?? "link" }))
    .filter((it) => /^https?:\/\//i.test(it.url))
    .map((it, i) => ({
      user_id: me.id,
      kind: PORTFOLIO_KINDS.some((k) => k.code === it.kind) ? it.kind : "link",
      title: it.title,
      url: it.url,
      sort_order: i,
    }));
  await supabase.from("artist_portfolio_items").delete().eq("user_id", me.id);
  if (items.length) {
    const { error: pfError } = await supabase.from("artist_portfolio_items").insert(items);
    if (pfError) return { ok: false, error: `포트폴리오 저장 실패: ${pfError.message}` };
  }
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

/** 기관 인증 서류 제출. 파일은 브라우저가 org-docs/{내 id}/ 에 먼저 올리고, 여기서는 기록만 남긴다.
 *  상태·심사 칸은 DB 트리거가 submitted 로 되돌리므로 여기서 보내지 않는다. */
export async function submitOrgVerification(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/profile", "organization");
  const supabase = (await createClient())!;

  const docType = inSet(str(fd, "doc_type"), ORG_DOC_TYPES.map((t) => t.code));
  if (!docType) return { ok: false, error: "서류 종류를 골라 주세요." };
  const regNumber = str(fd, "reg_number").replace(/\D/g, "");
  if (docType !== "other" && regNumber.length !== 10) return { ok: false, error: "등록번호 10자리를 적어 주세요. (예: 123-45-67890)" };
  const docPath = str(fd, "doc_path");
  if (!docPath.startsWith(`${me.id}/`) || docPath.includes("..")) return { ok: false, error: "서류 파일을 올려 주세요." };

  const { data: prev } = await supabase.from("org_verifications").select("doc_path").eq("user_id", me.id).maybeSingle();
  const { error } = await supabase.from("org_verifications").upsert({
    user_id: me.id,
    doc_type: docType,
    reg_number: regNumber || null,
    doc_path: docPath,
    doc_name: strOrNull(fd, "doc_name")?.slice(0, 200) ?? null,
  });
  if (error) return { ok: false, error: error.message };
  // 예전 파일은 지운다(실패해도 제출은 된 것).
  if (prev?.doc_path && prev.doc_path !== docPath) await supabase.storage.from("org-docs").remove([prev.doc_path]);
  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { ok: true };
}
