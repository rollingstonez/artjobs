import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AdminLog } from "@/types/account";

const ACTION: Record<string, string> = {
  org_verify: "기관 인증",
  org_unverify: "기관 인증 취소",
  user_suspend: "계정 정지",
  user_restore: "정지 해제",
  admin_grant: "운영자 지정",
  admin_revoke: "운영자 해제",
  report_status: "신고 상태 변경",
  posting_close: "공고 마감",
  posting_delete: "공고 내리기",
  source_on: "크롤 소스 켬",
  source_off: "크롤 소스 끔",
};

export default async function AdminLogsPage() {
  await requireAdmin("/admin/logs");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []) as AdminLog[];

  // 대상 이름표: 회원·기관·공고 제목
  const userIds = [...new Set(rows.flatMap((r) => [r.admin_user_id, ...(r.target_type === "user" || r.target_type === "org" ? [r.target_id ?? ""] : [])]).filter(Boolean))];
  const postingIds = [...new Set(rows.filter((r) => r.target_type === "posting").map((r) => r.target_id ?? "").filter(Boolean))];
  const [{ data: people }, { data: postings }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
    postingIds.length ? supabase.from("org_postings").select("id, title").in("id", postingIds) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = (id: string | null) => (people ?? []).find((p) => p.id === id)?.display_name ?? id ?? "";
  const target = (r: AdminLog) => {
    if (r.target_type === "user" || r.target_type === "org") return { label: nameOf(r.target_id), href: r.target_type === "org" ? "/admin/orgs?show=all" : `/admin/users?q=${encodeURIComponent(nameOf(r.target_id))}` };
    if (r.target_type === "posting") return { label: (postings ?? []).find((p) => p.id === r.target_id)?.title ?? r.target_id ?? "", href: "/admin/postings?show=all" };
    if (r.target_type === "report") return { label: `신고 ${(r.target_id ?? "").slice(0, 8)}`, href: "/admin/reports?show=all" };
    if (r.target_type === "source") return { label: r.target_id ?? "", href: "/admin/sources" };
    return { label: r.target_id ?? "", href: "/admin" };
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">활동 로그 <span className="text-stone-400">{rows.length}</span></h2>
      <p className="text-xs text-stone-500">운영자가 한 일이 시간순으로 남습니다. 최근 300건.</p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 기록이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white text-sm">
          {rows.map((r) => {
            const t = target(r);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="w-36 shrink-0 text-xs text-stone-400">{new Date(r.created_at).toLocaleString("ko-KR")}</span>
                <span className="font-semibold">{nameOf(r.admin_user_id)}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold">{ACTION[r.action] ?? r.action}</span>
                <Link href={t.href} className="min-w-0 flex-1 truncate underline-offset-2 hover:underline">{t.label}</Link>
                {r.detail && <span className="text-xs text-stone-400">{JSON.stringify(r.detail)}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
