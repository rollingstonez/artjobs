// 서버 컴포넌트·서버 액션용 Supabase 클라이언트. 세션은 쿠키로 오간다.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { HAS_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * 한 요청 안에서는 클라이언트를 하나만 만들어 돌려쓴다(React cache).
 * 화면 하나를 그리는 동안 이 함수가 열 번 넘게 불리는데, 그때마다 새로 만들면
 * 세션 확인과 연결 수립이 각각 따로 일어나 그만큼 왕복이 늘어난다.
 */
export const createClient = cache(async function createClient() {
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
});
