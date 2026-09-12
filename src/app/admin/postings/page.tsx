import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, PageHeader, Stat, btn } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { adminClosePosting, adminDeletePosting, adminRestorePosting } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDate, timeAgo } from "@/lib/format";
import { todayStr } from "@/lib/living";
import { createClient } from "@/lib/supabase/server";
import { BOARDS, boardLabel, employmentLabel, fieldLabel } from "@/types/job";

type Row = {
  id: string; org_user_id: string; title: string; organization: string; board: string; field: string | null; employment_type: string | null; region: string | null;
  status: "draft" | "open" | "closed"; apply_end: string | null; created_at: string; view_count: number; deleted_at: string | null; org_verified: boolean;
};

export default async function AdminPostingsPage({ searchParams }: PageProps<"/admin/postings">) {
  await requireAdmin("/admin/postings");
  const s = await searchParams;
  const show = ["all", "closed", "deleted", "draft", "overdue"].includes(sp(s.show)) ? sp(s.show) : "open";
  const board = BOARDS.some((b) => b.code === sp(s.board)) ? sp(s.board) : "";
  const q = sp(s.q);
  const today = todayStr();
  const supabase = (await createClient())!;

  let query = supabase.from("org_postings").select("id, org_user_id, title, organization, board, field, employment_type, region, status, apply_end, created_at, view_count, deleted_at, org_verified").order("created_at", { ascending: false }).limit(300);
  if (show === "open") query = query.eq("status", "open").is("deleted_at", null);
  if (show === "overdue") query = query.eq("status", "open").is("deleted_at", null).lt("apply_end", today);
  if (show === "closed") query = query.eq("status", "closed").is("deleted_at", null);
  if (show === "draft") query = query.eq("status", "draft").is("deleted_at", null);
  if (show === "deleted") query = query.not("deleted_at", "is", null);
  if (board) query = query.eq("board", board);
  if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%`);
  const [{ data }, openCount, closedCount, deletedCount, overdueCount] = await Promise.all([
    query,
    supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null),
    supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "closed").is("deleted_at", null),
    supabase.from("org_postings").select("id", { count: "exact", head: true }).not("deleted_at", "is", null),
    supabase.from("org_postings").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null).lt("apply_end", today),
  ]);
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.id);
  const { data: apps } = ids.length
    ? await supabase.from("applications").select("posting_id").eq("posting_source", "org").in("posting_id", ids).neq("status", "withdrawn")
    : { data: [] };
  const appCount = (id: string) => (apps ?? []).filter((a) => a.posting_id === id).length;
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(board ? { board } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/postings?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="기관 공고"
        count={rows.length}
        description="기관이 직접 올린 공고입니다. 부적절한 공고는 마감하거나 내릴 수 있고, 내린 공고는 복구할 수 있습니다. 마감일이 지났는데 아직 모집중인 공고는 목록에서는 이미 '마감'으로 보이니 그대로 두어도 됩니다. 수집 공고는 [수집 공고] 메뉴에서 봅니다."
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            {board && <input type="hidden" name="board" value={board} />}
            <input name="q" defaultValue={q} placeholder="제목·기관명" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat title="모집중" value={openCount.count ?? 0} href={href({ show: "open" })} />
        <Stat title="마감일 지난 모집중" value={overdueCount.count ?? 0} href={href({ show: "overdue" })} warn />
        <Stat title="마감" value={closedCount.count ?? 0} href={href({ show: "closed" })} />
        <Stat title="내림" value={deletedCount.count ?? 0} href={href({ show: "deleted" })} />
      </div>
      <ChipRow>
        <Chip href={href({ show: "open" })} active={show === "open"}>모집중</Chip>
        <Chip href={href({ show: "overdue" })} active={show === "overdue"} tone="warn">마감일 지남</Chip>
        <Chip href={href({ show: "closed" })} active={show === "closed"}>마감</Chip>
        <Chip href={href({ show: "draft" })} active={show === "draft"}>임시저장</Chip>
        <Chip href={href({ show: "deleted" })} active={show === "deleted"}>내림</Chip>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <ChipDivider />
        <Chip href={href({ board: "" })} active={!board}>게시판 전체</Chip>
        {BOARDS.map((b) => <Chip key={b.code} href={href({ board: b.code })} active={board === b.code}>{b.label}</Chip>)}
      </ChipRow>
      {rows.length === 0 ? (
        <Empty icon="📋">해당하는 공고가 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((p) => {
            const overdue = p.status === "open" && !p.deleted_at && p.apply_end && p.apply_end < today;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/${p.board === "audition" ? "auditions" : "jobs"}/org:${p.id}`} className="block truncate font-semibold hover:underline">{p.title}</Link>
                  <p className="text-xs text-stone-500">
                    <Link href={`/admin/users/${p.org_user_id}`} className="font-semibold text-stone-700 hover:underline">{p.organization}</Link>
                    {p.org_verified && <span className="ml-1 text-emerald-700">✓</span>}
                    {" · "}{boardLabel(p.board)} · {fieldLabel(p.field) ?? "분야 미정"} · {employmentLabel(p.employment_type) ?? "고용형태 미정"} · {p.region ?? "지역 미정"} · {p.apply_end ? `~${fmtDate(p.apply_end)}` : "상시"} · 등록 {timeAgo(p.created_at)} · 조회 {p.view_count} · 지원 {appCount(p.id)}
                  </p>
                </div>
                {p.deleted_at ? <Badge tone="red">내림</Badge> : overdue ? <Badge tone="amber">마감일 지남</Badge> : p.status === "open" ? <Badge tone="green">모집중</Badge> : p.status === "closed" ? <Badge>마감</Badge> : <Badge tone="stone">임시저장</Badge>}
                <div className="flex gap-1">
                  {!p.deleted_at && p.status === "open" && <form action={adminClosePosting.bind(null, p.id)}><button className={btn.secondary}>마감</button></form>}
                  {!p.deleted_at && <form action={adminDeletePosting.bind(null, p.id)}><button className={btn.danger}>내리기</button></form>}
                  {p.deleted_at && <form action={adminRestorePosting.bind(null, p.id)}><button className={btn.success}>복구</button></form>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
