// 로그인 사용자의 저장 공고 id 목록 (카드에 저장 버튼 상태를 그리기 위해).
import { getCurrentUser } from "@/lib/auth";
import { joinPostingId } from "@/lib/postings";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { PostingSource } from "@/types/account";

/** Supabase 미연결이면 savedIds 가 undefined → 카드에 저장 버튼을 그리지 않는다. */
export async function getSavedIds(): Promise<{ savedIds?: string[]; loggedIn: boolean }> {
  if (!HAS_SUPABASE) return { savedIds: undefined, loggedIn: false };
  const me = await getCurrentUser();
  if (!me) return { savedIds: [], loggedIn: false };
  const supabase = (await createClient())!;
  const { data } = await supabase.from("bookmarks").select("posting_source, posting_id").eq("user_id", me.id);
  return {
    loggedIn: true,
    savedIds: (data ?? []).map((b) => joinPostingId(b.posting_source as PostingSource, b.posting_id)),
  };
}
