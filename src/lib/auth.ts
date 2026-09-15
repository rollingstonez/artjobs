// 현재 로그인 사용자와 역할 프로필. 서버 컴포넌트·서버 액션에서만 쓴다.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountRole, ArtistProfile, OrgProfile, Profile } from "@/types/account";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile;
  artist: ArtistProfile | null;
  org: OrgProfile | null;
  unreadNotifications: number;
}

/**
 * 한 번의 요청 안에서는 몇 번을 불러도 DB를 한 번만 친다(React cache).
 * 레이아웃·getSavedIds·getLivePopups·각 페이지가 저마다 이 함수를 부르기 때문에,
 * 캐시가 없으면 화면 하나에 인증 왕복이 네 번씩 일어난다.
 *
 * 프로필·역할 테이블·안 읽은 알림 수는 한꺼번에(병렬) 읽는다. 역할을 안 뒤에
 * 역할 테이블을 읽으면 왕복이 한 번 더 늘어나는데, 한쪽은 어차피 빈 결과라 같이 읽는 편이 빠르다.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, artistRes, orgRes, unreadRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("artist_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("org_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  const profile = profileRes.data as Profile | null;
  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    artist: profile.role === "artist" ? ((artistRes.data as ArtistProfile | null) ?? null) : null,
    org: profile.role === "organization" ? ((orgRes.data as OrgProfile | null) ?? null) : null,
    unreadNotifications: unreadRes.count ?? 0,
  };
});

/** 로그인 필수 페이지. 없으면 로그인으로 보낸다. 역할을 주면 그 역할만 통과. 정지된 계정은 안내로. */
export async function requireUser(next: string, role?: AccountRole): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (me.profile.status !== "active") redirect("/suspended");
  if (role && me.profile.role !== role) redirect("/me");
  return me;
}

/** 운영자 전용 페이지(/admin). profiles.is_admin 이 아니면 마이페이지로. */
export async function requireAdmin(next: string): Promise<CurrentUser> {
  const me = await requireUser(next);
  if (!me.profile.is_admin) redirect("/me");
  return me;
}
