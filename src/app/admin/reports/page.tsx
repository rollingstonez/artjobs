import Link from "next/link";
import { setReportStatus, setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { REPORT_STATUS, type UserReport } from "@/types/account";

const CONTEXT: Record<string, string> = { message: "메시지", posting: "공고", profile: "프로필" };

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin("/admin/reports");
  const sp = await searchParams;
  const show = sp.show === "all" ? "all" : "open";
  const supabase = (await createClient())!;
  let q = supabase.from("user_reports").select("*").order("created_at", { ascending: false }).limit(300);
  if (show === "open") q = q.eq("status", "open");
  const { data } = await q;
  const rows = (data ?? []) as UserReport[];
  const ids = [...new Set(rows.flatMap((r) => [r.reporter_user_id, r.reported_user_id]))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, display_name, role, status").in("id", ids) : { data: [] };
  const person = (id: string) => (people ?? []).find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">신고 처리 <span className="text-stone-400">{rows.length}</span></h2>
        <div className="flex gap-1 text-xs">
          <Link href="/admin/reports" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "open" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>미처리</Link>
          <Link href="/admin/reports?show=all" className={`rounded-lg px-3 py-1.5 font-semibold ${show === "all" ? "bg-stone-900 text-white" : "border border-stone-300"}`}>전체</Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{show === "open" ? "미처리 신고가 없습니다." : "신고가 없습니다."}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const reported = person(r.reported_user_id);
            const reporter = person(r.reporter_user_id);
            return (
              <li key={r.id} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">{r.category}</span>
                  <span className="text-xs text-stone-500">{CONTEXT[r.context_type ?? ""] ?? r.context_type ?? "기타"} · {new Date(r.created_at).toLocaleString("ko-KR")}</span>
                  <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold">{REPORT_STATUS[r.status]}</span>
                </div>
                <p className="mt-2">
                  <span className="text-stone-500">신고 대상</span> <b>{reported?.display_name ?? "(탈퇴)"}</b>
                  <span className="text-xs text-stone-400"> {reported?.role === "organization" ? "기관" : "예술가"}{reported?.status === "suspended" ? " · 정지됨" : ""}</span>
                  <span className="mx-2 text-stone-300">|</span>
                  <span className="text-stone-500">신고자</span> {reporter?.display_name ?? "(탈퇴)"}
                </p>
                {r.detail && <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-700">{r.detail}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {r.status !== "reviewed" && <form action={setReportStatus.bind(null, r.id, "reviewed")}><button className="rounded-lg border border-stone-300 px-3 py-1.5">확인함</button></form>}
                  {r.status !== "closed" && <form action={setReportStatus.bind(null, r.id, "closed")}><button className="rounded-lg border border-stone-300 px-3 py-1.5">종결</button></form>}
                  {reported && reported.status === "active" ? (
                    <form action={setUserStatus.bind(null, r.reported_user_id, "suspended")}><button className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">신고 대상 계정 정지</button></form>
                  ) : reported ? (
                    <form action={setUserStatus.bind(null, r.reported_user_id, "active")}><button className="rounded-lg border border-emerald-300 px-3 py-1.5 text-emerald-700">정지 해제</button></form>
                  ) : null}
                  {reported?.role === "artist" && <Link href={`/talents/${r.reported_user_id}`} className="rounded-lg border border-stone-300 px-3 py-1.5">프로필 보기</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
