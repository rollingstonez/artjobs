// 소셜 로그인 · 가입 확인 메일 · 비밀번호 재설정 메일이 돌아오는 곳.
// 돌아온 code 를 세션으로 바꾸고, 가입 화면에서 고른 역할(role)이 있으면 첫 로그인 직후 그 역할로 맞춘다 (choose_signup_role, 0005).
// next 로 비밀번호 재설정 화면(/reset-password) 등 원래 가려던 곳을 받는다.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATTRIBUTION_COOKIE, parseAttributionCookie, parseUserAgent } from "@/lib/traffic";

function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const next = safeNext(searchParams.get("next"));

  // 링크가 만료됐거나 사용자가 제공자 화면에서 취소했을 때 Supabase 가 error 로 돌려보낸다.
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  const errorDesc = (searchParams.get("error_description") ?? "").toLowerCase();
  if (errorCode) {
    if (errorCode === "otp_expired" || errorDesc.includes("expired") || errorDesc.includes("invalid")) {
      return NextResponse.redirect(`${origin}/login?error=${next === "/reset-password" ? "reset_expired" : "link_expired"}`);
    }
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // PKCE 검증값(쿠키)이 없는 다른 브라우저에서 메일 링크를 열면 여기로 온다. docs/AUTH_EMAIL.md 의 템플릿 설정으로 해결.
    return NextResponse.redirect(`${origin}/login?error=${next === "/reset-password" ? "reset_expired" : "link_expired"}`);
  }

  // 비밀번호 재설정 링크는 새 계정 판정 없이 바로 재설정 화면으로.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  if (role === "artist" || role === "organization") {
    // 가입 10분이 지난 계정이면 함수가 'ignored' 를 돌려주고 아무것도 바꾸지 않는다.
    await supabase.rpc("choose_signup_role", { p_role: role, p_org_name: null });
  }

  // 방금 만들어진 계정이면 프로필 작성 화면으로, 아니면 원래 가려던 곳으로.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
    const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : 0;
    if (Date.now() - createdAt < 5 * 60 * 1000) {
      // 소셜 가입 귀속(first-touch, 0011): VisitTracker 쿠키를 읽어 profiles.signup_* 에. 실패해도 가입 흐름은 그대로.
      try {
        const attr = parseAttributionCookie(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
        await supabase.rpc("set_signup_attribution", {
          p_source: attr?.source ?? "unknown",
          p_device: parseUserAgent(request.headers.get("user-agent")).deviceType,
          p_attr: attr ? { ...attr } : null,
        });
      } catch {
        /* 귀속 실패는 무시 */
      }
      return NextResponse.redirect(`${origin}/me/profile?welcome=1`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
