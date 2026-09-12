// 운영자 화면 조회 헬퍼.
//   · safe*: supabase-js 는 예외 대신 error 를 돌려주므로, 화면이 깨지지 않게 null 로 바꾸고 사유만 남긴다.
//   · isMissingSchema: 0010 마이그레이션(테이블·함수)이 아직 안 깔린 경우를 알아본다 → 화면에 "SQL 실행하세요" 안내.
//   · getAdminBadges: 메뉴·대시보드에 붙는 "처리 대기" 숫자.
import { createClient } from "@/lib/supabase/server";

export type Supa = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export type SafeResult<T> = { data: T; error: string | null; missing: boolean };

/** "테이블/함수가 없다"는 오류인지. PostgREST: relation "x" does not exist / Could not find the function / column x does not exist */
export function isMissingSchema(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache");
}

export async function safeRpc<T = unknown>(supabase: Supa, fn: string, args?: Record<string, unknown>): Promise<SafeResult<T[]>> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) return { data: [], error: error.message, missing: isMissingSchema(error.message) };
  return { data: (Array.isArray(data) ? data : data == null ? [] : [data]) as T[], error: null, missing: false };
}

export async function safeCount(q: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number | null> {
  const { count, error } = await q;
  if (error) return null;
  return count ?? 0;
}

/** 메뉴 배지·대시보드 "처리할 일" 숫자. 실패한 항목은 null(표시 안 함). */
export interface AdminBadges {
  pendingOrgs: number | null;
  openReports: number | null;
  newContacts: number | null;
  suspended: number | null;
}

export async function getAdminBadges(supabase: Supa): Promise<AdminBadges> {
  const [pendingOrgs, openReports, newContacts, suspended] = await Promise.all([
    safeCount(supabase.from("org_profiles").select("user_id", { count: "exact", head: true }).eq("is_verified", false)),
    safeCount(supabase.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    safeCount(supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new")),
    safeCount(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended")),
  ]);
  return { pendingOrgs, openReports, newContacts, suspended };
}

/** 이름표 조회: 여러 화면이 profiles 에서 표시 이름을 붙일 때 쓴다. */
export async function nameMap(supabase: Supa, ids: (string | null | undefined)[]): Promise<Map<string, { display_name: string; role: string; status: string }>> {
  const uniq = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  const map = new Map<string, { display_name: string; role: string; status: string }>();
  if (uniq.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name, role, status").in("id", uniq);
  for (const p of data ?? []) map.set(p.id, { display_name: p.display_name, role: p.role, status: p.status });
  return map;
}

/** URLSearchParams 에서 문자열 하나 */
export function sp(v: string | string[] | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
