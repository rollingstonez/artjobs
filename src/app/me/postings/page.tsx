import Link from "next/link";
import { closeOrgPosting, deleteOrgPosting, setApplicationStatus } from "@/lib/actions/postings";
import { startConversation } from "@/lib/actions/messages";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS, type Application } from "@/types/account";
import { boardLabel, fieldLabel } from "@/types/job";

type OrgPostingRow = {
  id: string; title: string; board: string; field: string | null; status: string; apply_end: string | null; created_at: string; view_count: number;
};

export default async function MyPostingsPage() {
  const me = await requireUser("/me/postings", "organization");
  const supabase = (await createClient())!;
  const [{ data: postings }, { data: apps }] = await Promise.all([
    supabase.from("org_postings").select("id,title,board,field,status,apply_end,created_at,view_count").eq("org_user_id", me.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("applications").select("*").eq("org_user_id", me.id).order("created_at", { ascending: false }),
  ]);
  const rows = (postings ?? []) as OrgPostingRow[];
  const applications = (apps ?? []) as Application[];
  const artistIds = [...new Set(applications.map((a) => a.artist_user_id))];
  const { data: artists } = artistIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", artistIds)
    : { data: [] };
  const nameOf = (id: string) => artists?.find((a) => a.id === id)?.display_name ?? "예술가";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">내 공고 <span className="text-stone-400">{rows.length}</span></h2>
          <Link href="/post" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">공고 올리기</Link>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 올린 공고가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {rows.map((p) => {
              const href = `/${p.board === "audition" ? "auditions" : "jobs"}/org:${p.id}`;
              const count = applications.filter((a) => a.posting_id === p.id && a.status !== "withdrawn").length;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="block truncate text-sm font-semibold hover:underline">{p.title}</Link>
                    <p className="text-xs text-stone-500">
                      {boardLabel(p.board)} · {fieldLabel(p.field) ?? "분야 미정"} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"} · 지원 {count}명
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {{ open: "모집중", closed: "마감", draft: "임시저장" }[p.status]}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <Link href={`/post/${p.id}/edit`} className="underline-offset-2 hover:underline">수정</Link>
                    {p.status === "open" && (
                      <form action={closeOrgPosting.bind(null, p.id)}><button className="underline-offset-2 hover:underline">마감</button></form>
                    )}
                    <form action={deleteOrgPosting.bind(null, p.id)}><button className="text-red-600 underline-offset-2 hover:underline">삭제</button></form>
                  </div>
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
          <ul className="space-y-2">
            {applications.map((a) => (
              <li key={a.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/talents/${a.artist_user_id}`} className="font-bold hover:underline">{nameOf(a.artist_user_id)}</Link>
                  <span className="text-xs text-stone-500">→ {a.posting_title} · {fmtDate(a.created_at)}</span>
                  <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold">{APPLICATION_STATUS[a.status]}</span>
                </div>
                {a.message && <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{a.message}</p>}
                {a.status !== "withdrawn" && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <form action={startConversation.bind(null, a.artist_user_id, undefined)}>
                      <button className="rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white">메시지 보내기</button>
                    </form>
                    {a.status === "submitted" && (
                      <form action={setApplicationStatus.bind(null, a.id, "viewed")}><button className="rounded-lg border border-stone-300 px-3 py-1.5">확인함</button></form>
                    )}
                    {a.status !== "accepted" && (
                      <form action={setApplicationStatus.bind(null, a.id, "accepted")}><button className="rounded-lg border border-emerald-300 px-3 py-1.5 text-emerald-700">수락</button></form>
                    )}
                    {a.status !== "rejected" && (
                      <form action={setApplicationStatus.bind(null, a.id, "rejected")}><button className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-500">불합격</button></form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
