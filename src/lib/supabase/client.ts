"use client";
// 브라우저용 Supabase 클라이언트 (실시간 메시지 구독 등에만 쓴다).
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
