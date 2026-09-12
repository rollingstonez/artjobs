import type { Metadata } from "next";
import Link from "next/link";
import { Field, Notice, inputClass, primaryBtn, textareaClass } from "@/components/forms/ui";
import { submitContact } from "@/lib/actions/contact";
import { CONTACT_CATEGORY, CONTACT_STATUS, contactCategoryLabel } from "@/lib/admin/labels";
import { getCurrentUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "문의하기 | 아트잡스" };
export const dynamic = "force-dynamic";

type Mine = { id: string; category: string; subject: string; body: string; status: string; admin_reply: string | null; replied_at: string | null; created_at: string };

export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const sp = await searchParams;
  const ok = sp.ok === "1";
  const err = typeof sp.err === "string" ? sp.err : null;
  const me = HAS_SUPABASE ? await getCurrentUser() : null;
  let mine: Mine[] = [];
  if (me) {
    const supabase = (await createClient())!;
    const { data } = await supabase.from("contact_messages").select("id, category, subject, body, status, admin_reply, replied_at, created_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(20);
    mine = (data ?? []) as Mine[];
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">문의하기</h1>
        <p className="mt-1 text-sm text-stone-600">
          계정·공고 등록·수집 협의·오류 제보 등 무엇이든 남겨 주세요. 답변은 적어 주신 이메일로 드리고,
          로그인한 회원이면 아트잡스 알림에도 답변이 뜹니다. 공고 내용 자체에 대한 질문은 각 공고의 원문 기관에 문의해 주세요.
        </p>
      </div>

      {ok && <div className="mb-4"><Notice kind="success">문의를 접수했습니다. 확인 후 이메일로 답변드리겠습니다.</Notice></div>}
      {err && <div className="mb-4"><Notice kind="error">{err}</Notice></div>}

      {!HAS_SUPABASE ? (
        <Notice>지금은 문의 폼을 쓸 수 없습니다. support@artjobs.kr 로 메일 주세요.</Notice>
      ) : (
        <form action={submitContact} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름"><input name="name" required maxLength={60} defaultValue={me?.profile.display_name ?? ""} className={inputClass} /></Field>
            <Field label="답변받을 이메일"><input name="email" type="email" required maxLength={120} defaultValue={me?.email ?? ""} className={inputClass} /></Field>
          </div>
          <Field label="문의 유형">
            <select name="category" defaultValue="other" className={inputClass}>
              {CONTACT_CATEGORY.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="제목"><input name="subject" required minLength={2} maxLength={120} className={inputClass} /></Field>
          <Field label="내용" hint="공고 주소, 화면에 뜬 오류 문구 등 구체적으로 적어 주시면 빨리 도와드릴 수 있습니다.">
            <textarea name="body" required minLength={5} maxLength={4000} rows={7} className={textareaClass} />
          </Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <button className={primaryBtn}>문의 보내기</button>
        </form>
      )}

      {me && mine.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">내 문의 내역</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((m) => (
              <li key={m.id} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold">{contactCategoryLabel(m.category)}</span>
                  <span className="font-bold">{m.subject}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONTACT_STATUS[m.status]?.tone ?? ""}`}>{m.status === "new" ? "접수됨" : CONTACT_STATUS[m.status]?.label ?? m.status}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{fmtDateTime(m.created_at)}</p>
                <p className="mt-2 whitespace-pre-wrap text-stone-700">{m.body}</p>
                {m.admin_reply && (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-800">아트잡스 운영팀 답변 · {m.replied_at ? fmtDateTime(m.replied_at) : ""}</p>
                    <p className="mt-1 whitespace-pre-wrap text-stone-800">{m.admin_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-stone-500">
        공지사항은 <Link href="/notices" className="underline underline-offset-2">여기</Link>에서 볼 수 있습니다.
      </p>
    </main>
  );
}
