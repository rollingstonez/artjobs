import Link from "next/link";
import { adminHideSeeking } from "@/lib/actions/seeking";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";
import { fieldLabel } from "@/types/job";

export default async function AdminSeekingPage() {
  await requireAdmin("/admin/seeking");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("seeking_posts").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as SeekingPost[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">구직 글 <span className="text-stone-400">{rows.length}</span></h2>
      <p className="text-xs text-stone-500">예술가가 올린 구직 글입니다. 연락처가 적혀 있거나 광고·부적절한 글은 내릴 수 있습니다. 내리면 활동 로그에 남습니다.</p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">구직 글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {rows.map((p) => {
            const live = p.status === "open" && p.expires_at >= today;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/seeking/${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                  <p className="text-xs text-stone-500">{p.display_name} · {fieldLabel(p.field) ?? "분야 미정"} · {p.region ?? "전국"} · {fmtDate(p.created_at)} · 조회 {p.view_count}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${live ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{live ? "공개 중" : "내려감"}</span>
                <form action={adminHideSeeking.bind(null, p.id)}><button className="text-xs text-red-600 underline-offset-2 hover:underline">내리기</button></form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
