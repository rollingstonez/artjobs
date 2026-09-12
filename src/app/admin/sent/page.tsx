import Link from "next/link";
import { Badge, Chip, ChipRow, Empty, ErrorNote, Flash, PageHeader, Stat, UserLink, btn } from "@/components/admin/ui";
import { nameMap, sp } from "@/lib/admin/queries";
import { sendAdminNotification } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; user_id: string; kind: string; title: string; body: string | null; link_url: string | null; is_read: boolean; read_at: string | null; created_at: string };

export default async function AdminSentPage({ searchParams }: PageProps<"/admin/sent">) {
  await requireAdmin("/admin/sent");
  const s = await searchParams;
  const show = ["unread", "read"].includes(sp(s.show)) ? sp(s.show) : "all";
  const q = sp(s.q);
  const to = sp(s.to);
  const supabase = (await createClient())!;
  let query = supabase.from("notifications").select("*").eq("kind", "admin").order("created_at", { ascending: false }).limit(300);
  if (show === "unread") query = query.eq("is_read", false);
  if (show === "read") query = query.eq("is_read", true);
  if (q) query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
  const [{ data, error }, unread, total] = await Promise.all([
    query,
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "admin").eq("is_read", false),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "admin"),
  ]);
  const rows = (data ?? []) as Row[];
  const names = await nameMap(supabase, [...rows.map((r) => r.user_id), to]);
  const href = (patch: Record<string, string>) => {
    const usp = new URLSearchParams({ show, ...(q ? { q } : {}), ...patch });
    for (const [k, v] of Object.entries(patch)) if (!v) usp.delete(k);
    return `/admin/sent?${usp.toString()}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="운영팀 발신함"
        count={rows.length}
        description="운영자가 회원에게 보낸 알림입니다(회원의 종 아이콘에 ‘운영팀’ 알림으로 뜹니다). 보내려면 회원 상세에서 ‘운영팀 알림 보내기’ 를 씁니다. 회원이 읽었는지도 여기서 확인합니다."
        actions={
          <form className="flex gap-1">
            <input type="hidden" name="show" value={show} />
            <input name="q" defaultValue={q} placeholder="제목·내용" className="h-8 w-40 rounded-lg border border-stone-300 px-2 text-xs" />
            <button className="h-8 rounded-lg bg-stone-900 px-3 text-xs font-semibold text-white">검색</button>
          </form>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing />}
      <div className="grid grid-cols-2 gap-2">
        <Stat title="보낸 알림" value={total.count ?? 0} href={href({ show: "all" })} />
        <Stat title="아직 안 읽음" value={unread.count ?? 0} href={href({ show: "unread" })} />
      </div>
      <ChipRow>
        <Chip href={href({ show: "all" })} active={show === "all"}>전체</Chip>
        <Chip href={href({ show: "unread" })} active={show === "unread"}>안 읽음</Chip>
        <Chip href={href({ show: "read" })} active={show === "read"}>읽음</Chip>
      </ChipRow>

      {to ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-bold">✉️ {names.get(to)?.display_name ?? "회원"} 님에게 알림 보내기</p>
          <form action={sendAdminNotification.bind(null, to)} className="mt-2 grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="return_to" value="/admin/sent" />
            <input name="title" required minLength={2} maxLength={80} placeholder="제목" className="h-9 rounded-lg border border-stone-300 px-2 text-xs sm:col-span-2" />
            <textarea name="body" rows={3} maxLength={500} placeholder="내용 — 존댓말로, 무엇을 어떻게 하면 되는지만" className="rounded-lg border border-stone-300 px-2 py-1.5 text-xs sm:col-span-2" />
            <input name="link" placeholder="누르면 갈 주소 (기본 /notifications)" className="h-9 rounded-lg border border-stone-300 px-2 text-xs" />
            <div><button className={btn.primary}>보내기</button></div>
          </form>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs text-stone-500">새 알림은 <Link href="/admin/users" className="underline underline-offset-2">회원 관리</Link> → 회원 상세 → ‘운영팀 알림 보내기’ 에서 보냅니다.</p>
      )}

      {!error && rows.length === 0 ? (
        <Empty icon="📤">보낸 알림이 없습니다.</Empty>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((n) => {
            const p = names.get(n.user_id);
            return (
              <li key={n.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {n.is_read ? <Badge tone="green">읽음</Badge> : <Badge tone="sky">안 읽음</Badge>}
                  <span className="font-bold">{n.title}</span>
                  <span className="text-xs text-stone-500">→ <UserLink id={n.user_id} name={p?.display_name} role={p?.role} status={p?.status} small /></span>
                  <span className="ml-auto text-xs text-stone-400">{fmtDateTime(n.created_at)} ({timeAgo(n.created_at)}){n.read_at && <> · 읽음 {fmtDateTime(n.read_at)}</>}</span>
                </div>
                {n.body && <p className="mt-1 whitespace-pre-wrap text-xs text-stone-700">{n.body}</p>}
                {n.link_url && <p className="mt-0.5 text-[11px] text-stone-400">링크: <Link href={n.link_url} className="underline">{n.link_url}</Link></p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
