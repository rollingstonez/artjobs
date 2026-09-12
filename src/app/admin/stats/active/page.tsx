import Link from "next/link";
import { Badge, Chip, ChipRow, Empty, ErrorNote, PageHeader, Stat, Table, Td, Th } from "@/components/admin/ui";
import { safeCount, safeRpc, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; display_name: string; role: string; email: string | null; is_admin: boolean; last_sign_in_at: string | null; created_at: string };

export default async function AdminActiveUsersPage({ searchParams }: PageProps<"/admin/stats/active">) {
  await requireAdmin("/admin/stats/active");
  const s = await searchParams;
  const days = ["7", "30", "90"].includes(sp(s.days)) ? parseInt(sp(s.days), 10) : 7;
  const role = sp(s.role) === "artist" || sp(s.role) === "organization" ? sp(s.role) : "";
  const supabase = (await createClient())!;
  const [res, total] = await Promise.all([
    safeRpc<Row>(supabase, "admin_active_users", { p_days: days, p_limit: 500 }),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).neq("status", "deleted")),
  ]);
  const all = res.data;
  const rows = role ? all.filter((r) => r.role === role) : all;
  const artists = all.filter((r) => r.role === "artist").length;
  const orgs = all.filter((r) => r.role === "organization").length;
  const ratio = total && total > 0 ? Math.round((all.length / total) * 1000) / 10 : null;
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ days: String(days), ...(role ? { role } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/stats/active?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/stats", label: "통계로" }}
        title="활성 회원"
        count={rows.length}
        description={`최근 ${days}일 안에 로그인한 회원입니다. 통계의 "활성 비율" 숫자 안에 실제로 누가 있는지 보는 화면입니다. 탈퇴한 계정은 빼고 셉니다.`}
      />
      {res.error ? (
        <ErrorNote message={res.error} missing={res.missing} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat title={`최근 ${days}일 로그인`} value={all.length} />
            <Stat title="전체 회원" value={total} href="/admin/users" />
            <Stat title="활성 비율" value={ratio == null ? null : `${ratio}%`} note="로그인 ÷ 전체" />
            <Stat title="구성" value={`${artists} / ${orgs}`} note="예술가 / 기관" />
          </div>
          <ChipRow>
            {[7, 30, 90].map((d) => <Chip key={d} href={href({ days: String(d) })} active={days === d}>{d}일</Chip>)}
            <span className="mx-1 text-stone-300">|</span>
            <Chip href={href({ role: "" })} active={!role}>전체</Chip>
            <Chip href={href({ role: "artist" })} active={role === "artist"}>예술가</Chip>
            <Chip href={href({ role: "organization" })} active={role === "organization"}>기관</Chip>
          </ChipRow>
          {rows.length === 0 ? (
            <Empty icon="🙋">최근 {days}일 안에 로그인한 회원이 없습니다.</Empty>
          ) : (
            <Table minWidth="min-w-[640px]">
              <thead className="bg-stone-50"><tr><Th>회원</Th><Th>이메일</Th><Th>역할</Th><Th>마지막 로그인</Th><Th>가입</Th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <Td>
                      <Link href={`/admin/users/${u.id}`} className="font-semibold underline-offset-2 hover:underline">{u.display_name}</Link>
                      {u.is_admin && <Badge tone="amber" className="ml-1">운영자</Badge>}
                    </Td>
                    <Td className="text-xs text-stone-600">{u.email ?? "—"}</Td>
                    <Td><Badge tone={u.role === "organization" ? "sky" : "stone"}>{u.role === "organization" ? "기관" : "예술가"}</Badge></Td>
                    <Td className="text-xs text-stone-500">{u.last_sign_in_at ? <>{fmtDateTime(u.last_sign_in_at)}<span className="block text-[11px] text-stone-400">{timeAgo(u.last_sign_in_at)}</span></> : "—"}</Td>
                    <Td className="text-xs text-stone-500">{fmtDateTime(u.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
