// 지금 띄울 팝업 고르기 — 홈(서버)에서 부른다.
//   조건: 공개 + 기간 안(starts_at·ends_at 이 없으면 제한 없음) + 대상 일치.
//   대상: all(모두) · guest(비로그인) · artist(예술가 회원) · organization(기관 회원).
//   테이블이 아직 없으면(0013 미적용) 조용히 빈 배열을 돌려준다 — 홈이 깨지면 안 된다.
import type { PopupData } from "@/components/PopupModal";
import { getCurrentUser } from "@/lib/auth";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getLivePopups(): Promise<PopupData[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("popups")
    .select("id, title, body, image_url, link_url, target, starts_at, ends_at, display_order")
    .eq("is_published", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("display_order")
    .limit(10);
  if (error || !data || data.length === 0) return [];

  const me = await getCurrentUser();
  const role = me ? me.profile.role : "guest";
  return data
    .filter((p) => p.target === "all" || p.target === role)
    .map((p) => ({ id: p.id, title: p.title, body: p.body, image_url: p.image_url, link_url: p.link_url }));
}
