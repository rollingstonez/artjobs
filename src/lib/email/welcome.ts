// 가입 환영 메일 — 가입 직후 도착하는 /me/profile?welcome=1 에서 한 번 부른다(이메일·소셜 가입 공통 도착지).
// - email_sends 에 (나, 'welcome') 행을 먼저 넣어 자리를 잡는다. 이미 있으면(새로고침·재방문) 보내지 않는다.
// - 받는 주소는 항상 로그인한 본인. 실패해도 화면은 그대로 뜬다(가입의 부가 기능).
// - 키가 아직 없어 못 보낸 경우 행을 failed 로 남겨, 드립 스크립트가 다음 실행 때 다시 보낸다.
import type { CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "./send";
import { welcomeArtistEmail, welcomeOrgEmail } from "./templates";

const RECENT_MS = 2 * 86_400_000; // 가입 2일 안의 계정만(오래된 회원이 이 주소로 들어와도 안 보낸다)

export async function sendWelcomeOnce(me: CurrentUser): Promise<void> {
  try {
    if (!me.email || Date.now() - new Date(me.profile.created_at).getTime() > RECENT_MS) return;
    const supabase = (await createClient())!;
    const { error: claimErr } = await supabase.from("email_sends").insert({ user_id: me.id, kind: "welcome" });
    if (claimErr) return; // 이미 보냈거나(중복 키) 표가 아직 없음
    const tpl = me.profile.role === "organization" ? welcomeOrgEmail({ name: me.org?.org_name }) : welcomeArtistEmail({ name: me.profile.display_name });
    const res = await sendEmail({ to: me.email, ...tpl });
    if (!res.ok) await supabase.from("email_sends").update({ result: "failed", detail: res.error.slice(0, 300) }).eq("user_id", me.id).eq("kind", "welcome");
  } catch {
    /* 환영 메일 실패는 무시 */
  }
}
