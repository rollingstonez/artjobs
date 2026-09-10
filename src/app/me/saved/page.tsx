import Link from "next/link";
import PostingCard from "@/components/PostingCard";
import { requireUser } from "@/lib/auth";
import { getPostingsByIds, joinPostingId } from "@/lib/postings";
import { createClient } from "@/lib/supabase/server";
import type { Bookmark } from "@/types/account";

export default async function SavedPage() {
  const me = await requireUser("/me/saved");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("bookmarks").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  const bookmarks = (data ?? []) as Bookmark[];
  const ids = bookmarks.map((b) => joinPostingId(b.posting_source, b.posting_id));
  const postings = await getPostingsByIds(ids);
  const ordered = ids.map((id) => postings.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">저장한 공고 <span className="text-stone-400">{ordered.length}</span></h2>
      {ordered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          아직 저장한 공고가 없습니다.{" "}
          <Link href="/jobs" className="font-semibold text-stone-900 underline-offset-2 hover:underline">채용공고 보러 가기</Link>
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ordered.map((p) => (
            <PostingCard key={p!.id} posting={p!} savedIds={ids} loggedIn />
          ))}
        </div>
      )}
    </div>
  );
}
