import Link from "next/link";
import { notFound } from "next/navigation";
import { blockUser, markConversationRead } from "@/lib/actions/messages";
import { requireUser } from "@/lib/auth";
import { joinPostingId } from "@/lib/postings";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Message, PostingSource } from "@/types/account";
import MessageForm from "./MessageForm";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const me = await requireUser(`/messages/${id}`);
  const supabase = (await createClient())!;
  const { data: conv } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const c = conv as Conversation;
  const otherId = c.artist_user_id === me.id ? c.org_user_id : c.artist_user_id;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role").eq("id", otherId).maybeSingle(),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(500),
  ]);
  await markConversationRead(id);
  const messages = (msgs ?? []) as Message[];
  const postingHref = c.posting_source && c.posting_id ? `/jobs/${joinPostingId(c.posting_source as PostingSource, c.posting_id)}` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-6 md:px-6">
      <div className="flex items-center gap-3 py-4">
        <Link href="/messages" className="text-sm text-stone-500 hover:text-stone-900">←</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {other?.role === "artist" ? <Link href={`/talents/${otherId}`} className="hover:underline">{other.display_name}</Link> : other?.display_name ?? "상대"}
          </p>
          {postingHref && <Link href={postingHref} className="text-xs text-stone-500 hover:underline">관련 공고 보기</Link>}
        </div>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100">⋯</summary>
          <div className="absolute right-0 z-10 mt-1 w-56 space-y-2 rounded-xl border border-stone-200 bg-white p-3 text-xs shadow">
            <ReportForm reportedUserId={otherId} contextId={id} />
            <form action={blockUser.bind(null, otherId)}>
              <button className="w-full rounded-lg border border-red-200 px-2 py-1.5 text-red-600">이 상대 차단</button>
            </form>
          </div>
        </details>
      </div>

      <div className="flex-1 space-y-2 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="rounded-lg bg-stone-50 px-3 py-2 text-center text-[11px] text-stone-500">
          아트잡스 메신저는 회원의 연락처를 대신 지켜줍니다. 금전 요구·외부 링크 유도는 신고해주세요.
        </p>
        {messages.map((m) => {
          const mine = m.sender_user_id === me.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-900"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-stone-400" : "text-stone-500"}`}>
                  {new Date(m.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {mine && m.read_at ? " · 읽음" : ""}
                </p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="py-8 text-center text-sm text-stone-400">첫 메시지를 보내보세요.</p>}
      </div>
      <div className="mt-3">
        <MessageForm conversationId={id} />
      </div>
    </main>
  );
}
