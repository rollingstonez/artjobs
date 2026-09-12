import type { Metadata } from "next";
import Link from "next/link";
import { Field, Notice, inputClass, primaryBtn, textareaClass } from "@/components/forms/ui";
import { FEEDBACK_CATEGORY, feedbackCategory, maskName } from "@/lib/admin/labels";
import { submitFeedback } from "@/lib/actions/feedback";
import { getCurrentUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "의견 올리기 | 아트잡스",
  description: "아트잡스에 바라는 점, 불편한 점을 남겨 주세요. 운영팀이 답글로 답합니다.",
};
export const dynamic = "force-dynamic";

type Row = {
  id: string; user_id: string | null; name: string; category: string; content: string; is_public: boolean;
  admin_reply: string | null; admin_reply_at: string | null; created_at: string;
};

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const sp = await searchParams;
  const ok = sp.ok === "1";
  const err = typeof sp.err === "string" ? sp.err : null;
  const me = HAS_SUPABASE ? await getCurrentUser() : null;

  let rows: Row[] = [];
  let missing = false;
  if (HAS_SUPABASE) {
    const supabase = (await createClient())!;
    const { data, error } = await supabase
      .from("feedback")
      .select("id, user_id, name, category, content, is_public, admin_reply, admin_reply_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as Row[];
    missing = Boolean(error && /does not exist|could not find|schema cache/i.test(error.message));
  }
  const replied = rows.filter((r) => r.admin_reply).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">의견 올리기</h1>
        <p className="mt-1 text-sm text-stone-600">
          아트잡스에 바라는 점, 불편한 점, 있었으면 하는 기능을 짧게 남겨 주세요. 운영팀이 읽고 답글을 답니다.
          급하게 답이 필요한 일은 <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 보내 주세요.
        </p>
        {rows.length > 0 && <p className="mt-1 text-sm text-stone-500">의견 {rows.length}건 · 운영팀 답글 {replied}건</p>}
      </div>

      {ok && <div className="mb-4"><Notice kind="success">의견을 남겼습니다. 읽고 반영할 수 있는 것부터 챙기겠습니다.</Notice></div>}
      {err && <div className="mb-4"><Notice kind="error">{err}</Notice></div>}

      {!HAS_SUPABASE ? (
        <Notice>지금은 의견을 받을 수 없습니다. support@artjobs.kr 로 메일 주세요.</Notice>
      ) : missing ? (
        <Notice kind="error">의견 게시판 준비가 아직 끝나지 않았습니다(0012 마이그레이션 필요). 잠시 뒤 다시 시도해 주세요.</Notice>
      ) : (
        <form action={submitFeedback} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <Field label="의견 종류">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
              {FEEDBACK_CATEGORY.map((c, i) => (
                <label key={c.code} className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-center text-xs font-semibold has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                  <input type="radio" name="category" value={c.code} defaultChecked={i === 0} className="sr-only" />
                  <span aria-hidden>{c.emoji}</span> {c.label}
                </label>
              ))}
            </div>
          </Field>
          {me ? (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
              <b>{me.profile.display_name}</b> 님으로 남깁니다. 목록에는 <b>{maskName(me.profile.display_name)}</b> 처럼 가려서 보입니다.
            </p>
          ) : (
            <Field label="이름 또는 활동명" hint="목록에는 가운데를 가려서 보여 드립니다. 전화번호·이메일은 받지 않습니다.">
              <input name="name" required maxLength={20} placeholder="예: 김예술" className={inputClass} />
            </Field>
          )}
          <Field label="의견 (5~500자)" hint="구체적일수록 좋습니다. 예: ‘국악 공고를 지역으로 거를 때 인접 지역도 같이 보고 싶어요.’">
            <textarea name="content" required minLength={5} maxLength={500} rows={5} className={textareaClass} />
          </Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <div className="flex flex-wrap items-center gap-3">
            <button className={primaryBtn}>의견 남기기</button>
            <span className="text-xs text-stone-500">남긴 의견과 이름(가림)은 이 페이지에 공개됩니다.</span>
          </div>
        </form>
      )}

      {rows.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">모두의 의견</h2>
          <ul className="mt-3 space-y-2">
            {rows.map((f) => {
              const cat = feedbackCategory(f.category);
              const mine = me && f.user_id === me.id;
              return (
                <li key={f.id} className={`rounded-2xl border bg-white p-4 ${f.is_public ? "border-stone-200" : "border-dashed border-amber-300 bg-amber-50/40"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{cat.emoji} {cat.label}</span>
                    <span className="font-bold">{maskName(f.name)}</span>
                    {mine && <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white">내 의견</span>}
                    {!f.is_public && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">비공개 처리됨(나만 보임)</span>}
                    <span className="ml-auto text-xs text-stone-400">{fmtDate(f.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-stone-800">{f.content}</p>
                  {f.admin_reply && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-bold text-emerald-800">아트잡스 운영팀{f.admin_reply_at ? ` · ${fmtDate(f.admin_reply_at)}` : ""}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{f.admin_reply}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
