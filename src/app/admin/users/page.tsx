import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, ErrorNote, PageHeader, Pager, Table, Td, Th, btn } from "@/components/admin/ui";
import { daysAgoIso, safeRpc, sp } from "@/lib/admin/queries";
import { setUserAdmin, setUserStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { orgTypeLabel } from "@/types/account";
import { fieldLabel } from "@/types/job";

type Row = {
  id: string; email: string | null; role: "artist" | "organization"; display_name: string; status: "active" | "suspended" | "deleted";
  is_admin: boolean; created_at: string; last_sign_in_at: string | null; org_name: string | null; is_verified: boolean | null;
  profile_completed: boolean; region: string | null; field: string | null; career_years: number | null; org_type: string | null; total_count: number;
};
type Legacy = { id: string; email: string | null; role: "artist" | "organization"; display_name: string; status: Row["status"]; is_admin: boolean; created_at: string; org_name: string | null; is_verified: boolean | null; last_sign_in_at: string | null };

const LIMIT = 50;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin("/admin/users");
  const s = await searchParams;
  const role = sp(s.role) === "artist" || sp(s.role) === "organization" ? sp(s.role) : "";
  const status = ["active", "suspended", "deleted"].includes(sp(s.status)) ? sp(s.status) : "";
  const verified = sp(s.verified); // "1" | "0" | ""
  const completed = sp(s.completed);
  const admin = sp(s.admin);
  const days = sp(s.days);
  const sort = ["newest", "oldest", "recent_login", "name"].includes(sp(s.sort)) ? sp(s.sort) : "newest";
  const q = sp(s.q);
  const offset = Math.max(0, parseInt(sp(s.offset) || "0", 10) || 0);
  const supabase = (await createClient())!;

  const params = { role, status, verified, completed, admin, days, sort, q };
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v && !(k === "sort" && v === "newest")) usp.set(k, v);
    const qs = usp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  // 0010 함수(admin_search_users)가 없으면 0007 의 admin_list_users 로 대신 읽는다(필터 일부만 적용).
  const r = await safeRpc<Row>(supabase, "admin_search_users", {
    p_role: role || null, p_status: status || null, p_q: q || null,
    p_verified: verified === "1" ? true : verified === "0" ? false : null,
    p_completed: completed === "1" ? true : completed === "0" ? false : null,
    p_admin: admin === "1" ? true : null,
    p_since: days ? daysAgoIso(parseInt(days, 10)) : null,
    p_sort: sort, p_limit: LIMIT, p_offset: offset,
  });
  let rows: Row[] = r.data;
  let error = r.error;
  let missing = r.missing;
  let total = rows[0]?.total_count ?? 0;
  if (r.missing) {
    const legacy = await supabase.rpc("admin_list_users", { p_role: role || null, p_status: status || null, p_q: q || null, p_limit: 300 });
    if (!legacy.error) {
      rows = ((legacy.data ?? []) as Legacy[]).map((u) => ({ ...u, profile_completed: false, region: null, field: null, career_years: null, org_type: null, total_count: 0 }));
      total = rows.length;
      error = null;
      missing = false;
    }
  }

  const hasFilter = Boolean(role || status || verified || completed || admin || days || q || sort !== "newest");

  return (
    <div className="space-y-4">
      <PageHeader
        title="회원 관리"
        count={total ? `${total.toLocaleString("ko-KR")}명` : rows.length ? `${rows.length}명` : 0}
        description="이름·이메일·기관명으로 찾고, 행을 누르면 상세(프로필·지원·공고·대화·운영 메모)로 갑니다. 정지하면 로그인은 되지만 메시지·지원·공고 등록이 막힙니다."
        actions={
          <form className="flex gap-1">
            {Object.entries(params).filter(([k, v]) => v && k !== "q").map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input name="q" defaultValue={q} placeholder="이름·이메일·기관명" className="h-8 w-44 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />

      <ChipRow>
        <Chip href={href({ role: "" })} active={!role}>전체</Chip>
        <Chip href={href({ role: "artist" })} active={role === "artist"}>예술가</Chip>
        <Chip href={href({ role: "organization" })} active={role === "organization"}>기관</Chip>
        <ChipDivider />
        <Chip href={href({ status: "" })} active={!status}>상태 전체</Chip>
        <Chip href={href({ status: "active" })} active={status === "active"}>활성</Chip>
        <Chip href={href({ status: "suspended" })} active={status === "suspended"} tone="warn">정지</Chip>
        <Chip href={href({ status: "deleted" })} active={status === "deleted"}>탈퇴</Chip>
        <ChipDivider />
        <Chip href={href({ verified: verified === "1" ? "" : "1", role: "organization" })} active={verified === "1"}>인증 기관</Chip>
        <Chip href={href({ verified: verified === "0" ? "" : "0", role: "organization" })} active={verified === "0"}>미인증 기관</Chip>
        <ChipDivider />
        <Chip href={href({ completed: completed === "0" ? "" : "0" })} active={completed === "0"}>프로필 미완성</Chip>
        <Chip href={href({ admin: admin === "1" ? "" : "1" })} active={admin === "1"}>운영자만</Chip>
        <Chip href={href({ days: days === "7" ? "" : "7" })} active={days === "7"}>최근 7일 가입</Chip>
        <Chip href={href({ days: days === "30" ? "" : "30" })} active={days === "30"}>최근 30일</Chip>
      </ChipRow>
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <span>정렬:</span>
        {[["newest", "최근 가입"], ["oldest", "오래된 가입"], ["recent_login", "최근 로그인"], ["name", "이름"]].map(([k, l]) => (
          <Link key={k} href={href({ sort: k })} className={`rounded px-2 py-0.5 ${sort === k ? "bg-stone-200 font-bold text-stone-900" : "hover:underline"}`}>{l}</Link>
        ))}
        {hasFilter && <Link href="/admin/users" className="ml-auto rounded-lg border border-stone-300 px-2 py-1 font-semibold">↺ 초기화</Link>}
      </div>

      <ErrorNote message={error} missing={missing} />

      {rows.length === 0 ? (
        <Empty>{hasFilter ? "조건에 맞는 회원이 없습니다." : "가입한 회원이 없습니다."}</Empty>
      ) : (
        <Table minWidth="min-w-[880px]">
          <thead className="bg-stone-50">
            <tr>
              <Th>회원</Th><Th>이메일</Th><Th>역할 · 프로필</Th><Th>가입</Th><Th>마지막 로그인</Th><Th>상태</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((u) => (
              <tr key={u.id} className={u.status === "suspended" ? "bg-red-50/40" : u.status === "deleted" ? "opacity-60" : "hover:bg-stone-50"}>
                <Td>
                  <Link href={`/admin/users/${u.id}`} className="font-semibold underline-offset-2 hover:underline">{u.display_name}</Link>
                  {u.is_admin && <Badge tone="amber" className="ml-1">운영자</Badge>}
                  {u.role === "organization" && u.org_name && u.org_name !== u.display_name && <span className="block text-xs text-stone-500">{u.org_name}</span>}
                </Td>
                <Td className="text-xs text-stone-600">{u.email ?? "(없음)"}</Td>
                <Td className="text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge tone={u.role === "organization" ? "sky" : "stone"}>{u.role === "organization" ? "기관" : "예술가"}</Badge>
                    {u.role === "organization" && (u.is_verified ? <Badge tone="green">✓ 인증</Badge> : <Badge tone="stone">미인증</Badge>)}
                    {!u.profile_completed && <Badge tone="orange">프로필 미완성</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    {[u.role === "organization" ? orgTypeLabel(u.org_type) : null, fieldLabel(u.field), u.region, u.career_years != null ? `경력 ${u.career_years}년` : null].filter(Boolean).join(" · ") || "—"}
                  </p>
                </Td>
                <Td className="text-xs text-stone-500" >{fmtDate(u.created_at)}<span className="block text-[11px] text-stone-400">{timeAgo(u.created_at)}</span></Td>
                <Td className="text-xs text-stone-500">{u.last_sign_in_at ? <>{fmtDate(u.last_sign_in_at)}<span className="block text-[11px] text-stone-400">{timeAgo(u.last_sign_in_at)}</span></> : "-"}</Td>
                <Td className="text-xs">{u.status === "active" ? "활성" : u.status === "suspended" ? <span className="font-semibold text-red-700">정지</span> : "탈퇴"}</Td>
                <Td>
                  {u.id !== me.id && u.status !== "deleted" && (
                    <div className="flex justify-end gap-1">
                      {u.status === "active" ? (
                        <form action={setUserStatus.bind(null, u.id, "suspended")}><button className={btn.danger}>정지</button></form>
                      ) : (
                        <form action={setUserStatus.bind(null, u.id, "active")}><button className={btn.success}>해제</button></form>
                      )}
                      <form action={setUserAdmin.bind(null, u.id, !u.is_admin)}><button className={btn.secondary}>{u.is_admin ? "운영자 해제" : "운영자 지정"}</button></form>
                      <Link href={`/admin/users/${u.id}`} className={btn.secondary}>상세</Link>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pager total={total} limit={LIMIT} offset={offset} makeHref={(o) => href({ offset: String(o) })} />
    </div>
  );
}
