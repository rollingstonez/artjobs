import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, PageHeader, Pager, Table, Td, Th } from "@/components/admin/ui";
import { ADMIN_ACTION_LABEL, ADMIN_TARGET_LABEL } from "@/lib/admin/labels";
import { daysAgoIso, nameMap, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminLog } from "@/types/account";

const LIMIT = 100;

const TARGET_HREF: Record<string, (id: string) => string> = {
  user: (id) => `/admin/users/${id}`,
  org: (id) => `/admin/users/${id}`,
  report: () => "/admin/reports?show=all",
  posting: () => "/admin/postings?show=all",
  crawled: (id) => `/admin/crawled?show=all&q=${id}`,
  seeking: () => "/admin/seeking?show=all",
  source: (id) => `/admin/sources?q=${id}`,
  contact: (id) => `/admin/support?show=all&focus=${id}`,
  notice: (id) => `/admin/notices/${id}`,
  system: () => "/admin/settings",
};

export default async function AdminLogsPage({ searchParams }: PageProps<"/admin/logs">) {
  await requireAdmin("/admin/logs");
  const s = await searchParams;
  const action = sp(s.action);
  const target = sp(s.target);
  const admin = sp(s.admin);
  const days = ["1", "7", "30"].includes(sp(s.days)) ? sp(s.days) : "";
  const q = sp(s.q);
  const offset = Math.max(0, parseInt(sp(s.offset) || "0", 10) || 0);
  const supabase = (await createClient())!;

  let query = supabase.from("admin_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + LIMIT - 1);
  if (action) query = query.eq("action", action);
  if (target) query = query.eq("target_type", target);
  if (admin) query = query.eq("admin_user_id", admin);
  if (days) query = query.gte("created_at", daysAgoIso(parseInt(days, 10)));
  if (q) query = query.or(`target_id.ilike.%${q}%,action.ilike.%${q}%`);
  const [{ data, count }, { data: adminsRaw }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, display_name").eq("is_admin", true),
  ]);
  const rows = (data ?? []) as AdminLog[];
  const total = count ?? rows.length;
  const admins = adminsRaw ?? [];
  const names = await nameMap(supabase, rows.flatMap((r) => [r.admin_user_id, r.target_type === "user" || r.target_type === "org" ? r.target_id : null]));
  const postingIds = rows.filter((r) => r.target_type === "posting").map((r) => r.target_id ?? "").filter(Boolean);
  const { data: postings } = postingIds.length ? await supabase.from("org_postings").select("id, title").in("id", postingIds) : { data: [] };
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ ...(action ? { action } : {}), ...(target ? { target } : {}), ...(admin ? { admin } : {}), ...(days ? { days } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    const qs = usp.toString();
    return `/admin/logs${qs ? `?${qs}` : ""}`;
  };
  const targetLabel = (r: AdminLog) => {
    if (r.target_type === "user" || r.target_type === "org") return names.get(r.target_id ?? "")?.display_name ?? r.target_id ?? "";
    if (r.target_type === "posting") return (postings ?? []).find((p) => p.id === r.target_id)?.title ?? r.target_id ?? "";
    if (r.target_type === "report" || r.target_type === "contact" || r.target_type === "notice" || r.target_type === "crawled" || r.target_type === "seeking") return `${ADMIN_TARGET_LABEL[r.target_type]} ${(r.target_id ?? "").slice(0, 8)}`;
    return r.target_id ?? "";
  };
  const detailText = (d: Record<string, unknown> | null) => {
    if (!d) return "";
    const parts: string[] = [];
    for (const [k, v] of Object.entries(d)) {
      if (v == null || v === "") continue;
      parts.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
    return parts.join(" · ");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="활동 로그"
        count={total}
        description="🔒 운영자가 한 일이 시간순으로 남습니다(운영 감사용, 삭제 불가). 누가·언제·무엇을 했는지 되돌릴 때 근거가 됩니다."
        actions={
          <form className="flex gap-1">
            {action && <input type="hidden" name="action" value={action} />}
            {target && <input type="hidden" name="target" value={target} />}
            {admin && <input type="hidden" name="admin" value={admin} />}
            {days && <input type="hidden" name="days" value={days} />}
            <input name="q" defaultValue={q} placeholder="대상 ID·액션 코드" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <ChipRow>
        <Chip href={href({ days: "" })} active={!days}>기간 전체</Chip>
        <Chip href={href({ days: "1" })} active={days === "1"}>오늘</Chip>
        <Chip href={href({ days: "7" })} active={days === "7"}>7일</Chip>
        <Chip href={href({ days: "30" })} active={days === "30"}>30일</Chip>
        <ChipDivider />
        <Chip href={href({ target: "" })} active={!target}>대상 전체</Chip>
        {Object.entries(ADMIN_TARGET_LABEL).map(([k, l]) => <Chip key={k} href={href({ target: k })} active={target === k}>{l}</Chip>)}
        {admins.length > 1 && <ChipDivider />}
        {admins.length > 1 && <Chip href={href({ admin: "" })} active={!admin}>운영자 전체</Chip>}
        {admins.length > 1 && admins.map((ad) => <Chip key={ad.id} href={href({ admin: ad.id })} active={admin === ad.id}>{ad.display_name}</Chip>)}
      </ChipRow>
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-stone-600">액션별 보기 {action && <span className="text-stone-900">— {ADMIN_ACTION_LABEL[action] ?? action}</span>}</summary>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip href={href({ action: "" })} active={!action}>전체</Chip>
          {Object.entries(ADMIN_ACTION_LABEL).map(([k, l]) => <Chip key={k} href={href({ action: k })} active={action === k}>{l}</Chip>)}
        </div>
      </details>
      {rows.length === 0 ? (
        <Empty icon="🧾">기록이 없습니다.</Empty>
      ) : (
        <Table>
          <thead className="bg-stone-50"><tr><Th>시각</Th><Th>운영자</Th><Th>한 일</Th><Th>대상</Th><Th>상세</Th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => {
              const mk = TARGET_HREF[r.target_type ?? ""] as ((id: string) => string) | undefined;
              const tHref = mk && r.target_id ? mk(r.target_id) : null;
              return (
                <tr key={r.id} className="hover:bg-stone-50">
                  <Td className="whitespace-nowrap text-xs text-stone-500">{fmtDateTime(r.created_at)}<span className="block text-[11px] text-stone-400">{timeAgo(r.created_at)}</span></Td>
                  <Td className="text-xs font-semibold">{names.get(r.admin_user_id)?.display_name ?? "운영자"}</Td>
                  <Td><Badge tone={r.action.includes("suspend") || r.action.includes("delete") || r.action.includes("hide") ? "red" : r.action.includes("verify") || r.action.includes("restore") || r.action.includes("grant") ? "green" : "stone"}>{ADMIN_ACTION_LABEL[r.action] ?? r.action}</Badge></Td>
                  <Td className="text-xs">
                    <span className="text-stone-400">{ADMIN_TARGET_LABEL[r.target_type ?? ""] ?? r.target_type} · </span>
                    {tHref ? <Link href={tHref} className="underline-offset-2 hover:underline">{targetLabel(r)}</Link> : targetLabel(r)}
                  </Td>
                  <Td className="max-w-[24rem] truncate text-xs text-stone-500" >{detailText(r.detail)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pager total={total} limit={LIMIT} offset={offset} makeHref={(o) => href({ offset: String(o) })} />
    </div>
  );
}
