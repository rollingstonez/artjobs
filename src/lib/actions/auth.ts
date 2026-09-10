"use server";
// 회원가입 · 로그인 · 로그아웃 서버 액션.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_ROLES } from "@/types/account";

export type ActionResult = { ok: true } | { ok: false; error: string };

function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

export async function signUp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };

  const role = String(formData.get("role") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();
  const agreeTerms = formData.get("agree_terms") === "on";
  const agreePrivacy = formData.get("agree_privacy") === "on";

  if (!ACCOUNT_ROLES.some((r) => r.code === role)) return { ok: false, error: "역할을 골라주세요." };
  if (!email.includes("@")) return { ok: false, error: "이메일을 확인해주세요." };
  if (password.length < 8) return { ok: false, error: "비밀번호는 8자 이상이어야 합니다." };
  if (!displayName) return { ok: false, error: role === "artist" ? "이름(또는 활동명)을 적어주세요." : "담당자 이름을 적어주세요." };
  if (role === "organization" && !orgName) return { ok: false, error: "기관명을 적어주세요." };
  if (!agreeTerms || !agreePrivacy) return { ok: false, error: "이용약관과 개인정보 처리방침에 동의해주세요." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, display_name: role === "organization" ? orgName : displayName, org_name: orgName, contact_name: displayName },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) return { ok: false, error: "이미 가입된 이메일입니다. 로그인해주세요." };
    return { ok: false, error: error.message };
  }
  redirect("/me/profile?welcome=1");
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "이메일 또는 비밀번호가 맞지 않습니다." };
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
