import Link from "next/link";
import { closeOrgPosting, deleteOrgPosting } from "@/lib/actions/postings";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STAGES } from "@/types/account";
import { boardLabel, fieldLabel } from "@/types/job";

type OrgPostingRow = {
  id: string; title: string; board: string; field: string | null; status: string; apply_end: string | null; created_at: string; view_count: number;
};
type AppRow = { id: string; artist_user_id: string; posting_id: string; posting_title: string; status: string; created_at: string; profile_snapshot: { display_name?: string } | null };

export default async function MyPostingsPage() {
  const me = await requireUser("/me/postings", "organization");
  const supabase = (await createClient())!;
  const [{ data: postings }, { data: apps }, { count: memberCount }] = await Promise.all([
    supabase.from("org_postings").select("id,title,board,field,status,apply_end,created_at,view_count").eq("org_user_id", me.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("applications").select("id,artist_user_id,posting_id,posting_title,status,created_at,profile_snapshot").eq("org_user_id", me.id).neq("status", "withdrawn").order("created_at", { ascending: false }),
    supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_user_id", me.id).eq("status", "active"),
  ]);
  const rows = (postings ?? []) as OrgPostingRow[];
  const applications = (apps ?? []) as AppRow[];
  const newCount = applications.filter((a) => a.status === "submitted").length;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">내 공고 <span className="text-stone-400">{rows.length}</span></h2>
          <div className="flex gap-2">
            <Link href="/me/team" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:border-stone-500">
              구성원 {memberCount ? <span className="text-stone-400">{memberCount}</span> : null}
            </Link>
            <Link href="/post" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">공고 올리기</Link>
          </div>
        </div>
        {newCount > 0 && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            아직 확인하지 않은 지원이 {newCount}건 있습니다. 공고의 <b>심사 작업대</b>에서 보고, 메모하고, 점수를 주세요.
          </p>
        )}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 올린 공고가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {rows.map((p) => {
              const href = `/${p.board === "audition" ? "auditions" : "jobs"}/org:${p.id}`;
              const mine = applications.filter((a) => a.posting_id === p.id);
              const stages = APPLICATION_STAGES.map((s) => ({ ...s, n: mine.filter((a) => a.status === s.code).length })).filter((s) => s.n > 0);
              return (
                <li key={p.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={href} className="block truncate text-sm font-semibold hover:underline">{p.title}</Link>
                      <p className="text-xs text-stone-500">
                        {boardLabel(p.board)} · {fieldLabel(p.field) ?? "분야 미정"} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"} · 조회 {p.view_count}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                      {{ open: "모집중", closed: "마감", draft: "임시저장" }[p.status]}
                    </span>
                    <Link href={`/me/postings/${p.id}/review`} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700">
                      심사 작업대 · 지원 {mine.length}
                    </Link>
                    <div className="flex gap-2 text-xs">
                      <Link href={`/post/${p.id}/edit`} className="underline-offset-2 hover:underline">수정</Link>
                      {p.status === "open" && (
                        <form action={closeOrgPosting.bind(null, p.id)}><button className="underline-offset-2 hover:underline">마감</button></form>
                      )}
                      <form action={deleteOrgPosting.bind(null, p.id)}><button className="text-red-600 underline-offset-2 hover:underline">삭제</button></form>
                    </div>
                  </div>
                  {stages.length > 0 && (
                    <p className="flex flex-wrap gap-1 text-[11px]">
                      {stages.map((s) => (
                        <span key={s.code} className={`rounded-full px-2 py-0.5 font-semibold ${s.tone}`}>{s.label} {s.n}</span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">지원자 <span className="text-stone-400">{applications.length}</span></h2>
        {applications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 지원자가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {applications.slice(0, 30).map((a) => {
              const stage = APPLICATION_STAGES.find((s) => s.code === a.status);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{a.profile_snapshot?.display_name ?? "예술가"}</p>
                    <p className="truncate text-xs text-stone-500">→ {a.posting_title} · {fmtDate(a.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stage?.tone ?? "bg-stone-100 text-stone-500"}`}>{stage?.label ?? a.status}</span>
                  <Link href={`/me/postings/${a.posting_id}/review`} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:border-stone-900">심사하기</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-stone-500">
        지원자 검토·메모·점수·선발 단계 변경은 공고별 심사 작업대에서 합니다. 직원은 <Link href="/me/team" className="underline underline-offset-2">구성원</Link>으로, 외부 심사위원은 각 작업대에서 초청하세요.
      </p>
    </div>
  );
}
