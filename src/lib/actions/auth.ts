"use server";
// 회원가입 · 로그인 · 로그아웃 · 비밀번호 찾기/변경 서버 액션.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ATTRIBUTION_COOKIE, parseAttributionCookie, parseUserAgent } from "@/lib/traffic";
import { SITE_URL } from "@/lib/site";
import { emailTypoError } from "@/lib/validation/email";
import { ACCOUNT_ROLES } from "@/types/account";

export type ActionResult = { ok: true } | { ok: false; error: string };

function safeNext(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

/** 메일 링크가 돌아올 주소의 기준(origin). 개발 중엔 localhost, 배포에선 artjobs.kr. */
async function requestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin) return origin;
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    /* 헤더를 못 읽으면 아래 기본값 */
  }
  return SITE_URL;
}

/** Supabase 오류 문구 → 사람이 읽을 안내. */
function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "요청이 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.";
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("least"))) return "비밀번호가 너무 짧거나 단순합니다. 8자 이상으로 적어 주세요.";
  if (m.includes("same password") || m.includes("different from the old")) return "이전과 같은 비밀번호는 쓸 수 없습니다.";
  if (m.includes("invalid") && m.includes("email")) return "이메일 주소 형식을 확인해 주세요.";
  return message;
}

export async function signUp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };

  const role = String(formData.get("role") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();
  const agreeTerms = formData.get("agree_terms") === "on";
  const agreePrivacy = formData.get("agree_privacy") === "on";

  if (!ACCOUNT_ROLES.some((r) => r.code === role)) return { ok: false, error: "역할을 골라주세요." };
  if (!email.includes("@")) return { ok: false, error: "이메일을 확인해주세요." };
  const typo = emailTypoError(email);
  if (typo) return { ok: false, error: typo };
  if (password.length < 8) return { ok: false, error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== passwordConfirm) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다." };
  if (!displayName) return { ok: false, error: role === "artist" ? "이름(또는 활동명)을 적어주세요." : "담당자 이름을 적어주세요." };
  if (role === "organization" && !orgName) return { ok: false, error: "기관명을 적어주세요." };
  if (!agreeTerms || !agreePrivacy) return { ok: false, error: "이용약관과 개인정보 처리방침에 동의해주세요." };

  // 가입 귀속(first-touch): VisitTracker 가 구운 쿠키 + 지금 기기. 가입 트리거(0011)가 profiles.signup_* 에 넣는다. 실패해도 가입은 진행.
  const attribution = await readSignupAttribution();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 이메일 확인이 켜져 있으면 확인 링크가 이 주소로 돌아온다(→ /auth/callback → 프로필 작성 화면).
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/me/profile?welcome=1")}`,
      data: { role, display_name: role === "organization" ? orgName : displayName, org_name: orgName, contact_name: displayName, ...attribution },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) return { ok: false, error: "이미 가입된 이메일입니다. 로그인해주세요." };
    return { ok: false, error: authErrorMessage(error.message) };
  }
  // 이미 가입된 이메일로 다시 가입하면 Supabase 는 오류 대신 identities 가 빈 사용자를 돌려준다(주소 노출 방지).
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, error: "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요." };
  }
  // 세션이 없으면 Supabase 의 "이메일 확인" 이 켜진 것 → 메일함 안내 화면으로.
  if (!data.session) redirect(`/signup/sent?email=${encodeURIComponent(email)}`);
  redirect("/me/profile?welcome=1");
}

/** 가입 확인 메일을 다시 보낸다(/signup/sent). */
export async function resendConfirmation(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { ok: false, error: "이메일을 확인해주세요." };
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/me/profile?welcome=1")}` },
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true };
}

/** 첫 유입 쿠키(aj_attr)와 User-Agent 로 가입 귀속 3칸을 만든다. 쿠키가 없으면 unknown. */
export async function readSignupAttribution(): Promise<{ signup_source: string; signup_device_type: string; signup_attribution: Record<string, unknown> | null }> {
  try {
    const attr = parseAttributionCookie((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
    const device = parseUserAgent((await headers()).get("user-agent")).deviceType;
    return { signup_source: attr?.source ?? "unknown", signup_device_type: device, signup_attribution: attr ? { ...attr } : null };
  } catch {
    return { signup_source: "unknown", signup_device_type: "pc", signup_attribution: null };
  }
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) return { ok: false, error: "이메일과 비밀번호를 입력해 주세요." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("not confirmed")) {
      // 가입은 됐는데 확인 메일의 링크를 아직 안 누른 상태.
      redirect(`/signup/sent?email=${encodeURIComponent(email)}&unconfirmed=1`);
    }
    if (m.includes("rate limit") || m.includes("too many")) return { ok: false, error: "시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주세요." };
    return { ok: false, error: "이메일 또는 비밀번호가 맞지 않습니다. 비밀번호를 잊으셨다면 아래 '비밀번호 찾기'를 눌러 주세요." };
  }
  redirect(next);
}

/** 비밀번호 재설정 메일 보내기(/forgot-password). 가입 여부를 드러내지 않도록 결과는 항상 "보냈다" 로 답한다. */
export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { ok: false, error: "이메일 주소를 확인해 주세요." };
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many")) return { ok: false, error: "요청이 너무 잦습니다. 잠시 뒤(약 1분) 다시 시도해 주세요." };
    // 그 밖의 오류(주소 없음 등)는 드러내지 않는다.
  }
  return { ok: true };
}

/** 메일 링크로 들어와서 새 비밀번호 정하기(/reset-password). 링크로 만들어진 세션이 있어야 한다. */
export async function resetPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "아직 회원 기능이 연결되지 않았습니다." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (password.length < 8) return { ok: false, error: "비밀번호는 8자 이상이어야 합니다." };
  if (password !== confirm) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 진행해 주세요." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true };
}

/** 로그인한 상태에서 비밀번호 바꾸기(/me/settings).
 *  이메일 비밀번호로 가입한 계정은 현재 비밀번호를 맞게 적어야 한다. 소셜로만 가입한 계정은 새 비밀번호를 처음 만드는 것이라 현재 비밀번호를 묻지 않는다. */
export async function changePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/settings");
  const supabase = (await createClient())!;
  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (password.length < 8) return { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." };
  if (password !== confirm) return { ok: false, error: "새 비밀번호 확인이 일치하지 않습니다." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasPassword = Boolean(user?.identities?.some((i) => i.provider === "email"));
  if (hasPassword) {
    if (!current) return { ok: false, error: "현재 비밀번호를 적어 주세요." };
    if (!me.email) return { ok: false, error: "이메일이 없는 계정입니다." };
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: me.email, password: current });
    if (verifyError) return { ok: false, error: "현재 비밀번호가 맞지 않습니다." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true };
}

/** 회원 탈퇴 — 개인정보를 지우고 계정을 잠근다(0014 delete_my_account).
 *  되돌릴 수 없으므로 확인 문구를 정확히 적어야 실행된다. 처리 뒤에는 로그아웃시킨다. */
export async function deleteMyAccount(_p: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireUser("/me/settings");
  if (String(formData.get("confirm") ?? "").trim() !== "탈퇴합니다") {
    return { ok: false, error: "확인 문구를 정확히 적어 주세요. (탈퇴합니다)" };
  }
  if (me.profile.is_admin) {
    return { ok: false, error: "운영자 계정은 여기서 탈퇴할 수 없습니다. 다른 운영자에게 권한 해제를 먼저 요청하세요." };
  }
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: `탈퇴 처리에 실패했습니다: ${error.message}` };
  if (data !== true) return { ok: false, error: "탈퇴 처리에 실패했습니다. 잠시 뒤 다시 시도해 주세요." };
  await supabase.auth.signOut();
  redirect("/goodbye");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
