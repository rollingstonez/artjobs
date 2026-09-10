// 공고 상세에서 로그인 사용자의 상태(저장 여부·지원 여부)를 모은다.
import { getCurrentUser } from "@/lib/auth";
import { splitPostingId } from "@/lib/postings";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ViewerState } from "@/components/PostingDetail";
import type { ApplicationStatus } from "@/types/account";

export async function getViewerState(postingId: string): Promise<ViewerState> {
  const base: ViewerState = { loggedIn: false, role: null, saved: false, applicationStatus: null, accountsEnabled: HAS_SUPABASE };
  if (!HAS_SUPABASE) return base;
  const me = await getCurrentUser();
  if (!me) return base;
  const supabase = (await createClient())!;
  const { source, rawId } = splitPostingId(postingId);
  const [{ data: bm }, { data: app }] = await Promise.all([
    supabase.from("bookmarks").select("id").eq("user_id", me.id).eq("posting_source", source).eq("posting_id", rawId).maybeSingle(),
    me.profile.role === "artist"
      ? supabase.from("applications").select("status").eq("artist_user_id", me.id).eq("posting_source", source).eq("posting_id", rawId).neq("status", "withdrawn").maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    ...base,
    loggedIn: true,
    role: me.profile.role,
    saved: Boolean(bm),
    applicationStatus: (app?.status as ApplicationStatus | undefined) ?? null,
  };
}
