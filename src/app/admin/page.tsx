import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function Stat({ title, value, href, note, warn }: { title: string; value: number; href: string; note?: string; warn?: boolean }) {
  return (
    <Link href={href} className={`block rounded-xl border bg-white p-4 hover:border-stone-400 ${warn && value > 0 ? "border-amber-300 bg-amber-50/40" : "border-stone-200"}`}>
      <p className="text-xs font-semibold text-stone-500">{title}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </Link>
  );
}

function weekAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export default async function AdminHome() {
  await requireAdmin("/admin");
  const supabase = (await createClient())!;
  const since = weekAgo();

  const [artists, orgs, unverified, newUsers, openReports, orgOpen, crawledOpen, apps, appsWeek, sources, suspended] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization"),
    supabase.from("org_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", false),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
    supabase.from("crawled_postings").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("crawl_sources").select("code", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-700">처리할 일</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat title="인증 대기 기관" value={unverified.count ?? 0} href="/admin/orgs" warn note="사업자·기관 확인 후 인증" />
          <Stat title="미처리 신고" value={openReports.count ?? 0} href="/admin/reports" warn />
          <Stat title="정지된 계정" value={suspended.count ?? 0} href="/admin/users?status=suspended" />
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-700">회원</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat title="예술가" value={artists.count ?? 0} href="/admin/users?role=artist" />
          <Stat title="기관" value={orgs.count ?? 0} href="/admin/users?role=organization" />
          <Stat title="최근 7일 가입" value={newUsers.count ?? 0} href="/admin/users" />
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-stone-700">공고 · 지원</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat title="기관 직접 공고(모집중)" value={orgOpen.count ?? 0} href="/admin/postings" />
          <Stat title="수집 공고(모집중)" value={crawledOpen.count ?? 0} href="/jobs" />
          <Stat title="지원 전체" value={apps.count ?? 0} href="/admin/postings" />
          <Stat title="최근 7일 지원" value={appsWeek.count ?? 0} href="/admin/postings" />
          <Stat title="가동 중 크롤 소스" value={sources.count ?? 0} href="/admin/sources" />
        </div>
      </section>
      <p className="text-xs text-stone-500">
        메시지 본문은 운영자도 읽지 않습니다. 신고는 신고자가 적은 내용으로 판단하고, 필요하면 계정을 정지합니다. 정지된 계정은 로그인은 되지만 메시지·지원·공고 등록이 막힙니다.
      </p>
    </div>
  );
}
