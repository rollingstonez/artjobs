// 현재 로그인 사용자와 역할 프로필. 서버 컴포넌트·서버 액션에서만 쓴다.
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

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;

  const [artistRes, orgRes, unreadRes] = await Promise.all([
    profile.role === "artist"
      ? supabase.from("artist_profiles").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.role === "organization"
      ? supabase.from("org_profiles").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    artist: (artistRes.data as ArtistProfile | null) ?? null,
    org: (orgRes.data as OrgProfile | null) ?? null,
    unreadNotifications: unreadRes.count ?? 0,
  };
}

/** 로그인 필수 페이지. 없으면 로그인으로 보낸다. 역할을 주면 그 역할만 통과. */
export async function requireUser(next: string, role?: AccountRole): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (role && me.profile.role !== role) redirect("/me");
  return me;
}
