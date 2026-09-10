// 서버 컴포넌트·서버 액션용 Supabase 클라이언트. 세션은 쿠키로 오간다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  if (!HAS_SUPABASE) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서 호출되면 쿠키를 못 쓴다. proxy.ts 가 세션을 갱신하므로 무시해도 된다.
        }
      },
    },
  });
}
