import type { Metadata } from "next";
import Link from "next/link";
import SeekingCard from "@/components/SeekingCard";
import { getCurrentUser } from "@/lib/auth";
import { SELECTABLE_REGIONS } from "@/lib/location";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";
import { FIELDS, ROLES } from "@/types/job";

export const metadata: Metadata = {
  title: "구직 | 아트잡스",
  description: "일을 찾는 예술가들이 직접 올린 구직 글. 분야·직무·지역으로 찾고 아트잡스 메시지로 연락하세요.",
};
export const dynamic = "force-dynamic";

const selectClass = "h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm";

export default async function SeekingPage({ searchParams }: PageProps<"/seeking">) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : "");
  const field = pick("field"), role = pick("role"), region = pick("region"), q = pick("q");

  let posts: SeekingPost[] = [];
  let me = null;
  if (HAS_SUPABASE) {
    const supabase = (await createClient())!;
    me = await getCurrentUser();
    let query = supabase.from("seeking_posts").select("*").eq("status", "open").is("deleted_at", null)
      .gte("expires_at", new Date().toISOString().slice(0, 10)).order("created_at", { ascending: false }).limit(200);
    if (field) query = query.eq("field", field);
    if (role) query = query.contains("roles", [role]);
    if (region) query = query.eq("region", region);
    const { data } = await query;
    posts = (data ?? []) as SeekingPost[];
    if (q) {
      const lq = q.toLowerCase();
      posts = posts.filter((p) => [p.title, p.body, p.display_name].some((s) => s.toLowerCase().includes(lq)));
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 py-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">구직</h1>
          <p className="mt-1 text-sm text-stone-600">일을 찾는 예술가가 직접 올린 글입니다. 기관은 아트잡스 메시지로 바로 연락할 수 있습니다. 전화번호·이메일은 공개되지 않습니다.</p>
          <p className="mt-1 text-sm text-stone-500">{posts.length}건</p>
        </div>
        {HAS_SUPABASE && (
          <Link href={me?.profile.role === "artist" ? "/me/seeking/new" : me ? "/me" : "/signup?role=artist"} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700">
            {me?.profile.role === "organization" ? "인재정보 보기" : "구직 글 올리기"}
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <select name="field" defaultValue={field} className={selectClass}>
          <option value="">분야 전체</option>
          {FIELDS.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
        </select>
        <select name="role" defaultValue={role} className={selectClass}>
          <option value="">직무 전체</option>
          {ROLES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>
        <select name="region" defaultValue={region} className={selectClass}>
          <option value="">지역 전체</option>
          {SELECTABLE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="제목·내용 검색" className="h-10 min-w-[180px] flex-1 rounded-lg border border-stone-300 px-3 text-sm" />
        <button className="h-10 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white">검색</button>
      </form>

      {!HAS_SUPABASE ? (
        <p className="mt-10 text-center text-sm text-stone-500">회원 기능이 연결되면 열립니다.</p>
      ) : posts.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-10 text-center">
          <p className="text-sm text-stone-600">아직 올라온 구직 글이 없습니다.</p>
          <p className="mt-1 text-xs text-stone-500">예술가라면 첫 글을 올려보세요. 기관이 인재를 찾을 때 여기부터 봅니다.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {posts.map((p) => <li key={p.id}><SeekingCard p={p} /></li>)}
        </ul>
      )}
    </main>
  );
}
