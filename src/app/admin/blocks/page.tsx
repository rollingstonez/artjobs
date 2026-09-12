import { Badge, Chip, ChipRow, Empty, ErrorNote, PageHeader, Stat, UserLink } from "@/components/admin/ui";
import { daysAgoIso, nameMap, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Block = { id: string; blocker_user_id: string; blocked_user_id: string; created_at: string };

export default async function AdminBlocksPage({ searchParams }: PageProps<"/admin/blocks">) {
  await requireAdmin("/admin/blocks");
  const s = await searchParams;
  const days = ["7", "30"].includes(sp(s.days)) ? sp(s.days) : "";
  const supabase = (await createClient())!;
  let q = supabase.from("user_blocks").select("*").order("created_at", { ascending: false }).limit(500);
  if (days) q = q.gte("created_at", daysAgoIso(parseInt(days, 10)));
  const { data, error } = await q;
  const rows = (data ?? []) as Block[];
  const names = await nameMap(supabase, rows.flatMap((b) => [b.blocker_user_id, b.blocked_user_id]));
  const blockedCount = new Map<string, number>();
  for (const b of rows) blockedCount.set(b.blocked_user_id, (blockedCount.get(b.blocked_user_id) ?? 0) + 1);
  const repeat = [...blockedCount.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  const href = (d: string) => (d ? `/admin/blocks?days=${d}` : "/admin/blocks");

  return (
    <div className="space-y-4">
      <PageHeader
        title="차단 모니터"
        count={rows.length}
        description="회원이 서로를 차단한 기록입니다. 차단하면 둘 사이에 대화방을 열거나 메시지를 보낼 수 없습니다. 운영자는 차단을 대신 풀지 않습니다(본인만 해제). 한 사람이 여러 명에게 차단당하면 신고 없이도 살펴볼 신호입니다."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat title="차단 기록" value={error ? null : rows.length} />
        <Stat title="2회 이상 차단당한 회원" value={error ? null : repeat.length} warn />
        <Stat title="차단한 회원 수" value={error ? null : new Set(rows.map((b) => b.blocker_user_id)).size} />
      </div>
      <ChipRow>
        <Chip href={href("")} active={!days}>전체</Chip>
        <Chip href={href("7")} active={days === "7"}>최근 7일</Chip>
        <Chip href={href("30")} active={days === "30"}>최근 30일</Chip>
      </ChipRow>
      {error && <ErrorNote message={error.message} missing />}
      {repeat.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-bold text-red-800">반복해서 차단당한 회원</p>
          <ul className="mt-1 flex flex-wrap gap-2 text-xs">
            {repeat.map(([id, n]) => {
              const p = names.get(id);
              return <li key={id} className="rounded-lg bg-white px-2 py-1"><UserLink id={id} name={p?.display_name} role={p?.role} status={p?.status} /> <b className="text-red-700">{n}회</b></li>;
            })}
          </ul>
        </div>
      )}
      {!error && rows.length === 0 ? (
        <Empty icon="🚫">차단 기록이 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((b) => {
            const blocker = names.get(b.blocker_user_id);
            const blocked = names.get(b.blocked_user_id);
            const n = blockedCount.get(b.blocked_user_id) ?? 0;
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 text-xs text-stone-400">{fmtDateTime(b.created_at)} <span className="block text-[11px]">{timeAgo(b.created_at)}</span></span>
                <UserLink id={b.blocker_user_id} name={blocker?.display_name} role={blocker?.role} status={blocker?.status} />
                <span className="text-stone-400">🚫 차단 →</span>
                <UserLink id={b.blocked_user_id} name={blocked?.display_name} role={blocked?.role} status={blocked?.status} />
                {n >= 2 && <Badge tone="red" className="ml-auto">피차단 {n}회</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
