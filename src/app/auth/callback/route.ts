// 소셜 로그인 콜백. 제공자에서 돌아온 code 를 세션으로 바꾸고,
// 가입 화면에서 고른 역할(role)이 있으면 첫 로그인 직후 그 역할로 맞춘다 (choose_signup_role, 0005).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const role = searchParams.get("role");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  if (!supabase || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
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
      return NextResponse.redirect(`${origin}/me/profile?welcome=1`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
