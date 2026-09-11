import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { availabilityText } from "@/components/SeekingCard";
import { startConversation } from "@/lib/actions/messages";
import { deleteSeeking, renewSeeking, setSeekingStatus } from "@/lib/actions/seeking";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { SeekingPost } from "@/types/account";
import { employmentLabel, fieldLabel, genreLabel, roleLabel } from "@/types/job";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("seeking_posts").select("*").eq("id", id).maybeSingle();
  return (data as SeekingPost | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/seeking/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  return { title: p ? `${p.title} | 구직 | 아트잡스` : "구직 글을 찾을 수 없습니다 | 아트잡스", description: p?.body.slice(0, 120) };
}

export default async function SeekingDetailPage({ params }: PageProps<"/seeking/[id]">) {
  const { id } = await params;
  const p = await load(id);
  if (!p || p.deleted_at) notFound();
  const me = await getCurrentUser();
  const mine = me?.id === p.artist_user_id;
  const supabase = (await createClient())!;
  if (!mine) await supabase.rpc("bump_seeking_view", { p_id: id });
  const expired = p.expires_at < new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-6">
        <Link href="/seeking" className="text-sm text-stone-500 hover:text-stone-900">← 구직</Link>
      </div>
      <article className="rounded-2xl border border-stone-200 bg-white p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">{p.region ?? "전국"}{p.address_hint ? ` ${p.address_hint}` : ""}</span>
          {p.field && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold">{fieldLabel(p.field)}</span>}
          {(p.status === "closed" || expired) && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">{p.status === "closed" ? "구직 마감" : "기간 만료"}</span>}
          <span className="ml-auto text-xs text-stone-400">{fmtDate(p.created_at)} · 조회 {p.view_count}</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-snug">{p.title}</h1>
        <p className="mt-2 text-sm text-stone-600">
          <span className="font-semibold text-stone-800">{p.display_name}</span>
          {p.career_years != null && ` · 경력 ${p.career_years}년`} · 가능 시기 {availabilityText(p)}
        </p>
        <p className="mt-3 flex flex-wrap gap-1 text-xs">
          {p.genres.map((g) => <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5">{genreLabel(g)}</span>)}
          {p.roles.map((r) => <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{roleLabel(r)}</span>)}
          {p.employment_types.map((e) => <span key={e} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{employmentLabel(e)}</span>)}
        </p>

        <section className="mt-6 border-t border-stone-100 pt-5">
          <p className="whitespace-pre-line text-sm leading-relaxed">{p.body}</p>
        </section>

        <div className="mt-8 border-t border-stone-100 pt-5">
          {mine ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <Link href={`/me/seeking/${p.id}/edit`} className="rounded-lg border border-stone-300 px-4 py-2 font-semibold">수정</Link>
              {p.status === "open" && !expired ? (
                <form action={setSeekingStatus.bind(null, p.id, "closed")}><button className="rounded-lg border border-stone-300 px-4 py-2 font-semibold">구직 마감</button></form>
              ) : (
                <form action={renewSeeking.bind(null, p.id)}><button className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white">다시 열기 (60일 연장)</button></form>
              )}
              <form action={deleteSeeking.bind(null, p.id)}><button className="rounded-lg px-4 py-2 text-red-600">삭제</button></form>
              <span className="self-center text-xs text-stone-500">만료 {fmtDate(p.expires_at)}</span>
            </div>
          ) : me?.profile.role === "organization" ? (
            <div className="flex flex-wrap items-center gap-3">
              <form action={startConversation.bind(null, p.artist_user_id, undefined)}>
                <button className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700">메시지 보내기</button>
              </form>
              <Link href={`/talents/${p.artist_user_id}`} className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold">프로필·포트폴리오 보기</Link>
              <p className="w-full text-xs text-stone-500">전화번호·이메일은 제공되지 않습니다. 아트잡스 메신저로 대화하세요. 프로필은 예술가가 공개한 경우에만 보입니다.</p>
            </div>
          ) : me ? (
            <p className="text-xs text-stone-500">메시지는 기관 회원만 보낼 수 있습니다.</p>
          ) : (
            <p className="text-sm text-stone-600">
              이 예술가에게 연락하려면 <Link href={`/login?next=/seeking/${p.id}`} className="font-semibold underline underline-offset-2">기관 회원으로 로그인</Link>하세요. 연락은 아트잡스 메시지로만 오갑니다.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
