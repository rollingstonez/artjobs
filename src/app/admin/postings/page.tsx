import Link from "next/link";
import { adminClosePosting, adminDeletePosting } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { boardLabel, fieldLabel } from "@/types/job";

type Row = {
  id: string; org_user_id: string; title: string; organization: string; board: string; field: string | null;
  status: "draft" | "open" | "closed"; apply_end: string | null; created_at: string; view_count: number; deleted_at: string | null;
};

export default async function AdminPostingsPage({ searchParams }: PageProps<"/admin/postings">) {
  await requireAdmin("/admin/postings");
  const sp = await searchParams;
  const show = sp.show === "all" ? "all" : "open";
  const supabase = (await createClient())!;
  let q = supabase.from("org_postings").select("id, org_user_id, title, organization, board, field, status, apply_end, created_at, view_count, deleted_at").order("created_at", { ascending: false }).limit(300);
  if (show === "open") q = q.eq("status", "open").is("deleted_at", null);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.id);
  const { data: apps } = ids.length
    ? await supabase.from("applications").select("posting_id").eq("posting_source", "org").in("posting_id", ids).neq("status", "withdrawn")
    : { data: [] };
  const appCount = (id: string) => (apps ?? []).filter((a) => a.posting_id === id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">기관 공고 <span className="text-stone-400">{rows.length}</span></h2>
        <div className="flex gap-1 text-xs">
          <Link href="/admin/postings" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "open" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>모집중</Link>
          <Link href="/admin/postings?show=all" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "all" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>전체</Link>
        </div>
      </div>
      <p className="text-xs text-stone-500">기관이 직접 올린 공고입니다. 부적절한 공고는 마감하거나 내릴 수 있습니다. 수집 공고는 크롤러가 관리합니다.</p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">공고가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/${p.board === "audition" ? "auditions" : "jobs"}/org:${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                <p className="text-xs text-stone-500">
                  {p.organization} · {boardLabel(p.board)} · {fieldLabel(p.field) ?? "분야 미정"} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"} · 조회 {p.view_count} · 지원 {appCount(p.id)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p.deleted_at ? "bg-red-50 text-red-700" : p.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                {p.deleted_at ? "내림" : { open: "모집중", closed: "마감", draft: "임시저장" }[p.status]}
              </span>
              {!p.deleted_at && (
                <div className="flex gap-2 text-xs">
                  {p.status === "open" && <form action={adminClosePosting.bind(null, p.id)}><button className="underline-offset-2 hover:underline">마감</button></form>}
                  <form action={adminDeletePosting.bind(null, p.id)}><button className="text-red-600 underline-offset-2 hover:underline">내리기</button></form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
