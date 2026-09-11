import Link from "next/link";
import { setUserAdmin, setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = {
  id: string; email: string | null; role: "artist" | "organization"; display_name: string; status: "active" | "suspended" | "deleted";
  is_admin: boolean; created_at: string; org_name: string | null; is_verified: boolean | null; last_sign_in_at: string | null;
};

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin("/admin/users");
  const sp = await searchParams;
  const role = sp.role === "artist" || sp.role === "organization" ? sp.role : null;
  const status = sp.status === "suspended" || sp.status === "active" ? sp.status : null;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const supabase = (await createClient())!;
  const { data, error } = await supabase.rpc("admin_list_users", { p_role: role, p_status: status, p_q: q || null, p_limit: 300 });
  const rows = (data ?? []) as Row[];

  const chip = (label: string, params: Record<string, string>, active: boolean) => {
    const usp = new URLSearchParams({ ...(role ? { role } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), ...params });
    for (const [k, v] of Object.entries(params)) if (!v) usp.delete(k);
    return (
      <Link key={label} href={`/admin/users?${usp.toString()}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? "bg-stone-900 text-white" : "border border-stone-300"}`}>{label}</Link>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">회원 <span className="text-stone-400">{rows.length}</span></h2>
        <form className="flex gap-1">
          {role && <input type="hidden" name="role" value={role} />}
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="이름·이메일·기관명" className="h-8 rounded-lg border border-stone-300 px-2 text-xs" />
          <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-1">
        {chip("전체", { role: "" }, !role)}
        {chip("예술가", { role: "artist" }, role === "artist")}
        {chip("기관", { role: "organization" }, role === "organization")}
        <span className="mx-1 text-stone-300">|</span>
        {chip("활성", { status: "" }, !status)}
        {chip("정지", { status: "suspended" }, status === "suspended")}
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">목록을 불러오지 못했습니다: {error.message}</p>}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">역할</th>
              <th className="px-3 py-2">가입</th>
              <th className="px-3 py-2">마지막 로그인</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-stone-500">해당하는 회원이 없습니다.</td></tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className={u.status === "suspended" ? "bg-red-50/40" : ""}>
                <td className="px-3 py-2">
                  <span className="font-semibold">{u.display_name}</span>
                  {u.is_admin && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">운영자</span>}
                  {u.role === "organization" && u.org_name && u.org_name !== u.display_name && <span className="block text-xs text-stone-500">{u.org_name}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-stone-600">{u.email ?? "(없음)"}</td>
                <td className="px-3 py-2 text-xs">
                  {u.role === "organization" ? "기관" : "예술가"}
                  {u.role === "organization" && (u.is_verified ? <span className="ml-1 text-emerald-700">인증</span> : <span className="ml-1 text-stone-400">미인증</span>)}
                </td>
                <td className="px-3 py-2 text-xs text-stone-500">{fmtDate(u.created_at)}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "-"}</td>
                <td className="px-3 py-2 text-xs">{u.status === "active" ? "활성" : u.status === "suspended" ? <span className="font-semibold text-red-700">정지</span> : "탈퇴"}</td>
                <td className="px-3 py-2">
                  {u.id !== me.id && (
                    <div className="flex justify-end gap-1 text-[11px]">
                      {u.status === "active" ? (
                        <form action={setUserStatus.bind(null, u.id, "suspended")}><button className="rounded border border-red-300 px-2 py-1 text-red-700">정지</button></form>
                      ) : (
                        <form action={setUserStatus.bind(null, u.id, "active")}><button className="rounded border border-emerald-300 px-2 py-1 text-emerald-700">해제</button></form>
                      )}
                      <form action={setUserAdmin.bind(null, u.id, !u.is_admin)}><button className="rounded border border-stone-300 px-2 py-1">{u.is_admin ? "운영자 해제" : "운영자 지정"}</button></form>
                      {u.role === "artist" && <Link href={`/talents/${u.id}`} className="rounded border border-stone-300 px-2 py-1">프로필</Link>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
