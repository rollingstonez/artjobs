import Link from "next/link";
import { availabilityText } from "@/components/SeekingCard";
import { deleteSeeking, renewSeeking, setSeekingStatus } from "@/lib/actions/seeking";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";

export default async function MySeekingPage() {
  const me = await requireUser("/me/seeking", "artist");
  const supabase = (await createClient())!;
  const { data } = await supabase.from("seeking_posts").select("*").eq("artist_user_id", me.id).is("deleted_at", null).order("created_at", { ascending: false });
  const posts = (data ?? []) as SeekingPost[];
  const today = new Date().toISOString().slice(0, 10);
  const live = posts.filter((p) => p.status === "open" && p.expires_at >= today).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">내 구직 글 <span className="text-stone-400">{live}/3 공개 중</span></h2>
        <Link href="/me/seeking/new" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">구직 글 올리기</Link>
      </div>
      <p className="text-sm text-stone-600">
        &ldquo;이런 일을 찾습니다&rdquo; 글은 로그인 없이도 누구나 볼 수 있어 기관이 먼저 연락하기 좋습니다. 한 번에 3개까지 열어둘 수 있고, 60일이 지나면 자동으로 내려가니 필요하면 연장하세요.
      </p>
      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 올린 구직 글이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {posts.map((p) => {
            const expired = p.expires_at < today;
            const isLive = p.status === "open" && !expired;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/seeking/${p.id}`} className="block truncate text-sm font-semibold hover:underline">{p.title}</Link>
                  <p className="text-xs text-stone-500">{fmtDate(p.created_at)} 작성 · 가능 {availabilityText(p)} · 조회 {p.view_count} · {isLive ? `만료 ${fmtDate(p.expires_at)}` : expired ? "기간 만료" : "마감"}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isLive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{isLive ? "공개 중" : "내려감"}</span>
                <div className="flex gap-2 text-xs">
                  <Link href={`/me/seeking/${p.id}/edit`} className="underline-offset-2 hover:underline">수정</Link>
                  {isLive ? (
                    <form action={setSeekingStatus.bind(null, p.id, "closed")}><button className="underline-offset-2 hover:underline">마감</button></form>
                  ) : (
                    <form action={renewSeeking.bind(null, p.id)}><button className="font-semibold text-emerald-700 underline-offset-2 hover:underline">다시 열기</button></form>
                  )}
                  <form action={deleteSeeking.bind(null, p.id)}><button className="text-red-600 underline-offset-2 hover:underline">삭제</button></form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
