import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsRead } from "@/lib/actions/messages";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/account";

export const metadata: Metadata = { title: "알림 | 아트잡스" };
export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { message: "💬", application: "📨", application_status: "📋", new_posting: "🆕", system: "🔔" };

export default async function NotificationsPage() {
  const me = await requireUser("/notifications");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(100);
  const items = (data ?? []) as Notification[];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="flex items-end justify-between py-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">알림</h1>
          <p className="mt-1 text-sm text-stone-600">안 읽음 {unread}건</p>
        </div>
        {unread > 0 && (
          <form action={markNotificationsRead}><button className="text-sm text-stone-600 underline-offset-2 hover:underline">모두 읽음</button></form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 알림이 없습니다. <Link href="/me/alerts" className="underline underline-offset-2">새 공고 알림</Link>을 설정해보세요.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {items.map((n) => (
            <li key={n.id} className={n.is_read ? "" : "bg-emerald-50/40"}>
              <Link href={n.link_url ?? "/me"} className="flex gap-3 px-4 py-3 hover:bg-stone-50">
                <span className="text-lg">{ICON[n.kind] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</p>
                  {n.body && <p className="truncate text-xs text-stone-500">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-stone-400">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
