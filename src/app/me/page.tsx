import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { artistCompleteness, orgCompleteness } from "@/types/account";

function Card({ title, value, href, note }: { title: string; value: string | number; href: string; note?: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400">
      <p className="text-xs font-semibold text-stone-500">{title}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </Link>
  );
}

export default async function MeHome() {
  const me = await requireUser("/me");
  const supabase = (await createClient())!;

  if (me.profile.role === "artist") {
    const { percent, missing } = artistCompleteness(me.artist);
    const [saved, apps, alerts, convs] = await Promise.all([
      supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", me.id),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("artist_user_id", me.id).neq("status", "withdrawn"),
      supabase.from("alert_conditions").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("is_active", true),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("artist_user_id", me.id),
    ]);
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">프로필 완성도</h2>
            <span className="text-sm font-bold">{percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full bg-emerald-600" style={{ width: `${percent}%` }} />
          </div>
          {missing.length > 0 ? (
            <p className="mt-2 text-sm text-stone-600">
              아직 빠진 항목: {missing.join(", ")}.{" "}
              <Link href="/me/profile" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
                채우러 가기
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-700">
              완성! {me.artist?.is_public ? "인재정보에 공개 중입니다." : "인재정보 공개를 켜면 기관이 먼저 연락할 수 있습니다."}
            </p>
          )}
        </section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="저장한 공고" value={saved.count ?? 0} href="/me/saved" />
          <Card title="지원 중" value={apps.count ?? 0} href="/me/applications" />
          <Card title="알림 조건" value={alerts.count ?? 0} href="/me/alerts" note="새 공고가 뜨면 알려드립니다" />
          <Card title="대화" value={convs.count ?? 0} href="/messages" />
        </div>
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          내 전화번호·이메일은 기관에게 보이지 않습니다. 기관은 아트잡스 메시지로만 연락할 수 있고, 원치 않으면{" "}
          <Link href="/me/profile" className="underline underline-offset-2">프로필</Link>에서 메시지 받기를 끌 수 있습니다.
        </section>
      </div>
    );
  }

  const { percent, missing } = orgCompleteness(me.org);
  const [postings, apps, convs] = await Promise.all([
    supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("org_user_id", me.id).eq("status", "open").is("deleted_at", null),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("org_user_id", me.id).eq("status", "submitted"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("org_user_id", me.id),
  ]);
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">기관 정보 완성도</h2>
          <span className="text-sm font-bold">{percent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full bg-emerald-600" style={{ width: `${percent}%` }} />
        </div>
        {missing.length > 0 ? (
          <p className="mt-2 text-sm text-stone-600">
            아직 빠진 항목: {missing.join(", ")}.{" "}
            <Link href="/me/profile" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
              채우러 가기
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-700">완성! 공고를 올리고 인재를 찾아보세요.</p>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="모집중 공고" value={postings.count ?? 0} href="/me/postings" />
        <Card title="확인 안 한 지원" value={apps.count ?? 0} href="/me/postings" />
        <Card title="대화" value={convs.count ?? 0} href="/messages" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/post" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700">
          공고 올리기
        </Link>
        <Link href="/talents" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold hover:border-stone-500">
          인재 찾기
        </Link>
      </div>
    </div>
  );
}
