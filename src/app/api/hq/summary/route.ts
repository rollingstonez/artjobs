import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

// =============================================================================
// 바로하우스 통합 관리자(barohaus.com/admin)가 가져가는 «요약 주소» (⚠️ 읽기 전용)
//
// 운영자가 사이트마다 관리자를 돌아다니지 않도록 오늘 처리할 일 · 가입 · 회원 구성 · 방문 숫자만
// 한 번에 내려준다. 개인정보(이름 · 이메일 등)는 한 글자도 내보내지 않는다.
//
// 보안: Authorization: Bearer <HQ_SUMMARY_TOKEN> 이 환경변수와 같아야 한다. 환경변수가 없으면 503(꺼짐).
//       이 사이트의 DB 는 로그인한 운영자만 읽도록 막혀 있어(RLS), 서버에서 SUPABASE_SERVICE_ROLE_KEY 로 센다.
//
// 응답 규격은 barohausweb 의 lib/barohaus/hq/sites.ts (SiteSummary) 와 같아야 한다.
// =============================================================================

export const dynamic = "force-dynamic";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const kstKey = (ms: number) => new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
const kstDayStart = (key: string) => Date.parse(`${key}T00:00:00Z`) - KST_OFFSET_MS;

function tokenOk(request: Request): boolean | null {
  const expected = process.env.HQ_SUMMARY_TOKEN;
  if (!expected) return null;
  const header = request.headers.get("authorization") || "";
  const given = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const ok = tokenOk(request);
  if (ok === null) return NextResponse.json({ ok: false, message: "요약 주소가 꺼져 있습니다." }, { status: 503, headers: noStore });
  if (!ok) return NextResponse.json({ ok: false, message: "인증 실패" }, { status: 401, headers: noStore });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, message: "서비스 키가 없습니다." }, { status: 503, headers: noStore });

  try {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
    const todayKey = kstKey(Date.now());
    const todayStart = kstDayStart(todayKey);

    // 1) 처리할 일 — 관리자 대시보드(src/app/admin/page.tsx)와 같은 조건
    const [orgs, reports, contacts, feedback, suspended] = await Promise.all([
      count(admin.from("org_verifications").select("user_id", { count: "exact", head: true }).eq("status", "submitted")),
      count(admin.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "open")),
      count(admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new")),
      count(admin.from("feedback").select("id", { count: "exact", head: true }).eq("status", "new")),
      count(admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended")),
    ]);
    const todo = [
      { key: "org", label: "인증 서류 확인 대기", count: orgs, href: "/admin/orgs" },
      { key: "report", label: "미처리 신고", count: reports, href: "/admin/reports" },
      { key: "inquiry", label: "새 문의", count: contacts, href: "/admin/support?show=new" },
      { key: "feedback", label: "새 의견", count: feedback, href: "/admin/feedback?show=new" },
      { key: "suspended", label: "정지된 계정", count: suspended, href: "/admin/users?status=suspended" },
    ];

    // 2) 방문 — 최근 7일, 날짜별 개수(행을 내려받지 않고 세기만), 봇 제외, KST
    const visitDays = Array.from({ length: 7 }, (_, i) => kstKey(todayStart + (i - 6) * DAY_MS));
    const visitCounts = await Promise.all(
      visitDays.map(async (day) => {
        const from = kstDayStart(day);
        const n = await count(
          admin
            .from("visit_logs")
            .select("id", { count: "exact", head: true })
            .eq("is_bot", false)
            .gte("visited_at", new Date(from).toISOString())
            .lt("visited_at", new Date(from + DAY_MS).toISOString()),
        );
        return { date: day, count: n };
      }),
    );

    // 3) 가입 — 최근 14일 (탈퇴 제외)
    const signupFromMs = todayStart - 13 * DAY_MS;
    const signupMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) signupMap.set(kstKey(signupFromMs + i * DAY_MS), 0);
    const { data: signupRows } = await admin
      .from("profiles")
      .select("created_at")
      .neq("status", "deleted")
      .gte("created_at", new Date(signupFromMs).toISOString())
      .limit(5000);
    for (const r of (signupRows || []) as { created_at: string }[]) {
      const s = r.created_at.trim();
      const d = new Date(/(?:[Zz]|[+-]\d{2}(?::?\d{2})?)$/.test(s) ? s : `${s}Z`);
      if (Number.isNaN(d.getTime())) continue;
      const k = kstKey(d.getTime());
      if (signupMap.has(k)) signupMap.set(k, (signupMap.get(k) || 0) + 1);
    }
    const signupDays = [...signupMap.entries()].map(([date, c]) => ({ date, count: c }));

    // 3-2) 회원 구성 — 예술가 · 기관 + 인증 기관
    const roleCount = (role: string) =>
      count(admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", role).neq("status", "deleted"));
    const [artists, organizations, verifiedOrgs] = await Promise.all([
      roleCount("artist"),
      roleCount("organization"),
      count(admin.from("org_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", true)),
    ]);

    // 4) 로그 — 오늘 관리자 작업 건수
    const adminActions = await count(
      admin.from("admin_logs").select("id", { count: "exact", head: true }).gte("created_at", new Date(todayStart).toISOString()),
    );

    return NextResponse.json(
      {
        ok: true,
        site: "artjobs",
        generatedAt: new Date().toISOString(),
        todo,
        visits: { today: visitCounts[6].count, yesterday: visitCounts[5].count, days: visitCounts, href: "/admin/traffic" },
        signups: { total: artists + organizations, today: signupDays[13]?.count ?? 0, days: signupDays, href: "/admin/stats" },
        members: {
          total: artists + organizations,
          items: [
            { key: "artist", label: "예술가", count: artists, href: "/admin/users?role=artist" },
            { key: "organization", label: "기관", count: organizations, href: "/admin/users?role=organization" },
          ],
          extra: [{ label: "인증 기관", value: `${verifiedOrgs} / ${organizations}`, href: "/admin/orgs?show=all" }],
        },
        logs: { adminActionsToday: adminActions },
      },
      { headers: noStore },
    );
  } catch (error) {
    console.error("[api/hq/summary] 예외:", error);
    return NextResponse.json({ ok: false, message: "요약 조회 중 오류" }, { status: 500, headers: noStore });
  }
}
