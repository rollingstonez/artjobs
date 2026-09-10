import Link from "next/link";
import { notFound } from "next/navigation";
import { startConversation } from "@/lib/actions/messages";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TalentPublic } from "@/types/account";
import { employmentLabel, fieldLabel, genreLabel, roleLabel } from "@/types/job";

export const dynamic = "force-dynamic";

export default async function TalentDetailPage({ params, searchParams }: PageProps<"/talents/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await requireUser(`/talents/${id}`);
  const supabase = (await createClient())!;
  const { data } = await supabase.from("talents_public").select("*").eq("user_id", id).maybeSingle();
  if (!data) notFound();
  const t = data as TalentPublic;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-6">
        <Link href="/talents" className="text-sm text-stone-500 hover:text-stone-900">← 인재정보</Link>
      </div>
      <article className="rounded-2xl border border-stone-200 bg-white p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {t.region && <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">{t.region}{t.address_hint ? ` ${t.address_hint}` : ""}</span>}
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold">{fieldLabel(t.field) ?? "분야 미정"}</span>
          {t.availability === "closed" && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">지금은 쉬는 중</span>}
        </div>
        <h1 className="mt-3 text-2xl font-extrabold">{t.display_name}</h1>
        <p className="mt-1 flex flex-wrap gap-1 text-xs">
          {t.genres.map((g) => <span key={g} className="rounded-full bg-stone-100 px-2 py-0.5">{genreLabel(g)}</span>)}
          {t.roles.map((r) => <span key={r} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{roleLabel(r)}</span>)}
          {t.employment_types.map((e) => <span key={e} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{employmentLabel(e)}</span>)}
        </p>

        <dl className="mt-6 divide-y divide-stone-100 border-y border-stone-100 text-sm">
          {t.career_years != null && <div className="grid grid-cols-[100px_1fr] gap-3 py-2.5"><dt className="text-stone-500">경력</dt><dd>{t.career_years}년</dd></div>}
          {t.education && <div className="grid grid-cols-[100px_1fr] gap-3 py-2.5"><dt className="text-stone-500">학력</dt><dd>{t.education}</dd></div>}
          {t.portfolio_url && <div className="grid grid-cols-[100px_1fr] gap-3 py-2.5"><dt className="text-stone-500">포트폴리오</dt><dd><a href={t.portfolio_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.portfolio_url}</a></dd></div>}
        </dl>

        {t.bio && <section className="mt-6"><h2 className="text-sm font-bold text-stone-700">소개</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{t.bio}</p></section>}
        {t.career && <section className="mt-6"><h2 className="text-sm font-bold text-stone-700">주요 경력</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{t.career}</p></section>}

        <div className="mt-8 border-t border-stone-100 pt-5">
          {me.profile.role === "organization" ? (
            t.allow_messages ? (
              <form action={startConversation.bind(null, t.user_id, undefined)}>
                <button className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700">메시지 보내기</button>
                <p className="mt-2 text-xs text-stone-500">전화번호·이메일은 제공되지 않습니다. 아트잡스 메신저로 대화하세요.</p>
              </form>
            ) : (
              <p className="text-sm text-stone-500">이 예술가는 지금 기관의 메시지를 받지 않습니다.</p>
            )
          ) : (
            <p className="text-xs text-stone-500">메시지는 기관 회원만 보낼 수 있습니다.</p>
          )}
          {sp.blocked && <p className="mt-2 text-sm text-red-600">지금은 메시지를 보낼 수 없습니다.</p>}
        </div>
      </article>
    </main>
  );
}
