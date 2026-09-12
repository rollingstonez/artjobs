// 방문 기록 — components/VisitTracker.tsx 가 세션당 1회 부른다.
//   아트잡스 Next 앱은 service role 을 쓰지 않으므로, anon 키로 security definer 함수 track_visit() 을 부른다
//   (visit_logs 에는 insert 정책이 없어 함수로만 쓸 수 있다). 중복 판정·신규/재방문 판정은 함수 안에서.
//   User-Agent 판정(기기·브라우저·봇)과 유입원 판정은 여기서 한다. IP 는 저장하지 않는다.
//   어떤 실패도 200 으로 조용히 돌려준다 — 방문 기록은 부가 기능이라 사용자 화면에 영향을 주면 안 된다.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseUserAgent, resolveTrafficSource } from "@/lib/traffic";

export const dynamic = "force-dynamic";

function clip(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ ok: true });
    const sessionKey = clip(body.sessionKey, 80);
    if (!sessionKey) return NextResponse.json({ ok: true });
    const landingPath = clip(body.landingPath, 500) ?? "/";
    if (landingPath.startsWith("/admin") || landingPath.startsWith("/api")) return NextResponse.json({ ok: true });

    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ ok: true });
    const utmSource = clip(body.utmSource, 120);
    const utmMedium = clip(body.utmMedium, 120);
    const referrer = clip(body.referrer, 500);
    const ua = parseUserAgent(request.headers.get("user-agent"));
    const { error } = await supabase.rpc("track_visit", {
      p_session_key: sessionKey,
      p_visitor_key: clip(body.visitorKey, 80),
      p_source: resolveTrafficSource(utmSource, referrer, utmMedium),
      p_utm_source: utmSource,
      p_utm_medium: utmMedium,
      p_utm_campaign: clip(body.utmCampaign, 200),
      p_utm_content: clip(body.utmContent, 200),
      p_referrer: referrer,
      p_landing_path: landingPath,
      p_device_type: ua.deviceType,
      p_browser: ua.browser,
      p_os: ua.os,
      p_is_bot: ua.isBot,
    });
    if (error) console.error("[track/visit] 기록 실패(무시):", error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track/visit] 예외(무시):", err);
    return NextResponse.json({ ok: true });
  }
}
