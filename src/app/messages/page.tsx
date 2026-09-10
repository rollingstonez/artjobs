import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/types/account";

export const metadata: Metadata = { title: "메시지 | 아트잡스" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const me = await requireUser("/messages");
  const sp = await searchParams;
  const supabase = (await createClient())!;
  const col = me.profile.role === "artist" ? "artist_user_id" : "org_user_id";
  const { data } = await supabase.from("conversations").select("*").eq(col, me.id).order("last_message_at", { ascending: false, nullsFirst: false });
  const convs = (data ?? []) as Conversation[];
  const otherIds = convs.map((c) => (me.profile.role === "artist" ? c.org_user_id : c.artist_user_id));
  const [{ data: others }, { data: lastMsgs }, { data: unread }] = await Promise.all([
    otherIds.length ? supabase.from("profiles").select("id, display_name").in("id", otherIds) : Promise.resolve({ data: [] }),
    convs.length ? supabase.from("messages").select("conversation_id, body, created_at, sender_user_id").in("conversation_id", convs.map((c) => c.id)).order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    convs.length ? supabase.from("messages").select("conversation_id").in("conversation_id", convs.map((c) => c.id)).neq("sender_user_id", me.id).is("read_at", null) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = (id: string) => others?.find((o) => o.id === id)?.display_name ?? "상대";
  const lastOf = (cid: string) => lastMsgs?.find((m) => m.conversation_id === cid);
  const unreadOf = (cid: string) => unread?.filter((m) => m.conversation_id === cid).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">메시지</h1>
        <p className="mt-1 text-sm text-stone-600">기관과 예술가는 여기서만 연락을 주고받습니다. 전화번호·이메일은 대화 안에서 본인이 원할 때만 알려주세요.</p>
        {sp.error === "blocked" && <p className="mt-2 text-sm text-red-600">차단된 상대와는 대화를 시작할 수 없습니다.</p>}
      </div>
      {convs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          아직 대화가 없습니다. {me.profile.role === "artist" ? "기관 직접 공고에 지원하면 대화방이 열립니다." : <Link href="/talents" className="underline underline-offset-2">인재정보</Link>}
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {convs.map((c) => {
            const last = lastOf(c.id);
            const n = unreadOf(c.id);
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${n ? "font-bold" : "font-semibold"}`}>{nameOf(me.profile.role === "artist" ? c.org_user_id : c.artist_user_id)}</p>
                    <p className="truncate text-xs text-stone-500">{last ? (last.sender_user_id === me.id ? "나: " : "") + last.body : "대화를 시작해보세요"}</p>
                  </div>
                  {n > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{n}</span>}
                  <span className="shrink-0 text-xs text-stone-400">{c.last_message_at ? fmtDate(c.last_message_at) : ""}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
