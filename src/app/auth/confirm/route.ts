// 메일 링크(가입 확인 · 비밀번호 재설정 · 이메일 변경)를 token_hash 방식으로 받는 곳.
// Supabase 이메일 템플릿을 docs/AUTH_EMAIL.md 대로 바꾸면 링크가 여기로 온다.
// 이 방식은 메일을 연 브라우저가 가입한 브라우저와 달라도(휴대폰에서 열어도) 동작한다.
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "email", "magiclink", "invite"];

function safeNext(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/me";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  if (!supabase || !tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${type === "recovery" ? "reset_expired" : "link_expired"}`);
  }

  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  if (type === "signup") return NextResponse.redirect(`${origin}/me/profile?welcome=1`);
  return NextResponse.redirect(`${origin}${next}`);
}
