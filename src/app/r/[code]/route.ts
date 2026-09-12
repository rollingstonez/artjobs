// 채널 단축링크 — GET /r/{code}. 카톡방·밴드·카페에 나눠 줄 짧은 주소.
//   ① referral_visits 에 클릭 1행 기록(IP 저장 안 함)  ② utm 을 붙여 홈으로 302
//   ③ 홈에서 VisitTracker 가 utm_content=code 를 first-touch 로 잡아 가입 시 profiles.signup_attribution 에 귀속.
//   미등록·비활성 code 도 기록 없이 홈으로(죽은 링크도 방문자는 홈에 도착). 기록 실패가 이동을 막으면 안 된다.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CODE_RE = /^[a-z0-9]{2,12}$/;

function home(request: Request, query?: string): NextResponse {
  const res = NextResponse.redirect(new URL(query ? `/?${query}` : "/", request.url), 302);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = (raw || "").toLowerCase();
  if (!CODE_RE.test(code)) return home(request);
  try {
    const supabase = await createClient();
    if (!supabase) return home(request);
    const { data } = await supabase.rpc("track_referral_click", {
      p_code: code,
      p_user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      p_referer: request.headers.get("referer")?.slice(0, 500) ?? null,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return home(request);
    const query = new URLSearchParams({ utm_source: row.utm_source, utm_medium: row.utm_medium, utm_campaign: row.utm_campaign, utm_content: row.code }).toString();
    return home(request, query);
  } catch {
    return home(request);
  }
}
