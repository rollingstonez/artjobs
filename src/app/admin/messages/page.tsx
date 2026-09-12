import Link from "next/link";
import { Badge, Chip, ChipDivider, ChipRow, Empty, ErrorNote, PageHeader, Stat, UserLink } from "@/components/admin/ui";
import { safeRpc, sp } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Conv = {
  id: string; artist_user_id: string; artist_name: string; org_user_id: string; org_name: string;
  posting_source: string | null; posting_id: string | null; created_at: string; last_message_at: string | null;
  message_count: number; artist_sent: number; org_sent: number; unread_count: number; last_sender: string | null;
};

/** 안 읽은 메시지가 3일 넘게 방치된 대화방인지(응답 대기). 렌더 밖 헬퍼라 시각 계산을 여기서 한다. */
function isWaiting(r: { unread_count: number; last_message_at: string | null }): boolean {
  return r.unread_count > 0 && Boolean(r.last_message_at) && Date.now() - new Date(r.last_message_at as string).getTime() > 3 * 86400000;
}

export default async function AdminMessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin("/admin/messages");
  const s = await searchParams;
  const days = ["7", "30", "90", "all"].includes(sp(s.days)) ? sp(s.days) : "30";
  const kind = ["oneway", "twoway", "empty", "waiting"].includes(sp(s.kind)) ? sp(s.kind) : "";
  const q = sp(s.q);
  const supabase = (await createClient())!;
  const res = await safeRpc<Conv>(supabase, "admin_conversation_list", { p_q: q || null, p_days: days === "all" ? null : parseInt(days, 10), p_limit: 300 });
  let rows = res.data.map((r) => ({ ...r, message_count: Number(r.message_count), artist_sent: Number(r.artist_sent), org_sent: Number(r.org_sent), unread_count: Number(r.unread_count) }));
  const twoWay = rows.filter((r) => r.artist_sent > 0 && r.org_sent > 0).length;
  const oneWay = rows.filter((r) => r.message_count > 0 && (r.artist_sent === 0 || r.org_sent === 0)).length;
  const empty = rows.filter((r) => r.message_count === 0).length;
  const waiting = rows.filter(isWaiting).length;
  if (kind === "twoway") rows = rows.filter((r) => r.artist_sent > 0 && r.org_sent > 0);
  if (kind === "oneway") rows = rows.filter((r) => r.message_count > 0 && (r.artist_sent === 0 || r.org_sent === 0));
  if (kind === "empty") rows = rows.filter((r) => r.message_count === 0);
  if (kind === "waiting") rows = rows.filter(isWaiting);
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ days, ...(kind ? { kind } : {}), ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/messages?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="대화 모니터"
        count={rows.length}
        description={<>메시지 <b>본문은 운영자도 읽지 않습니다</b>. 여기서는 누가 누구와 몇 통을 주고받았고, 답이 오는지만 봅니다. 예술가가 보냈는데 기관이 3일 넘게 안 읽은 대화(<b>응답 대기</b>)가 많으면 그 기관에 운영팀 알림으로 안내할 수 있습니다. 부적절한 대화는 신고를 통해서만 처리합니다.</>}
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="days" value={days} />
            {kind && <input type="hidden" name="kind" value={kind} />}
            <input name="q" defaultValue={q} placeholder="예술가·기관 이름" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      {res.error ? (
        <ErrorNote message={res.error} missing={res.missing} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat title="양방향 대화" value={twoWay} href={href({ kind: "twoway" })} note="둘 다 보냄" />
            <Stat title="한쪽만 보냄" value={oneWay} href={href({ kind: "oneway" })} />
            <Stat title="응답 대기 3일+" value={waiting} href={href({ kind: "waiting" })} warn note="안 읽은 메시지가 3일 넘게" />
            <Stat title="빈 대화방" value={empty} href={href({ kind: "empty" })} />
          </div>
          <ChipRow>
            <Chip href={href({ days: "7" })} active={days === "7"}>최근 7일</Chip>
            <Chip href={href({ days: "30" })} active={days === "30"}>30일</Chip>
            <Chip href={href({ days: "90" })} active={days === "90"}>90일</Chip>
            <Chip href={href({ days: "all" })} active={days === "all"}>전체</Chip>
            <ChipDivider />
            <Chip href={href({ kind: "" })} active={!kind}>모든 대화</Chip>
            <Chip href={href({ kind: "twoway" })} active={kind === "twoway"}>양방향</Chip>
            <Chip href={href({ kind: "oneway" })} active={kind === "oneway"}>한쪽만</Chip>
            <Chip href={href({ kind: "waiting" })} active={kind === "waiting"} tone="warn">응답 대기</Chip>
            <Chip href={href({ kind: "empty" })} active={kind === "empty"}>빈 방</Chip>
          </ChipRow>
          {rows.length === 0 ? (
            <Empty icon="💬">해당하는 대화방이 없습니다.</Empty>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              {rows.map((c) => {
                const two = c.artist_sent > 0 && c.org_sent > 0;
                const lastFromArtist = c.last_sender === c.artist_user_id;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <UserLink id={c.artist_user_id} name={c.artist_name} role="artist" />
                        <span className="text-stone-400">↔</span>
                        <UserLink id={c.org_user_id} name={c.org_name} role="organization" />
                      </p>
                      <p className="text-xs text-stone-500">
                        메시지 {c.message_count}통 (예술가 {c.artist_sent} · 기관 {c.org_sent}) · 시작 {timeAgo(c.created_at)} · 마지막 {c.last_message_at ? `${fmtDateTime(c.last_message_at)} (${lastFromArtist ? "예술가" : "기관"})` : "—"}
                        {c.posting_id && <> · <Link href={`/jobs/${c.posting_source === "org" ? "org:" : "crawled:"}${c.posting_id}`} className="underline underline-offset-2">관련 공고</Link></>}
                      </p>
                    </div>
                    {c.message_count === 0 ? <Badge>빈 방</Badge> : two ? <Badge tone="green">양방향</Badge> : <Badge tone="stone">한쪽만</Badge>}
                    {c.unread_count > 0 && <Badge tone={isWaiting(c) ? "red" : "amber"}>안 읽음 {c.unread_count}</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
