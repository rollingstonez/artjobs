import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { noticeKindLabel } from "@/lib/admin/labels";
import { fmtDate } from "@/lib/format";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = { id: string; kind: string; title: string; body: string; is_pinned: boolean; published_at: string | null; created_at: string };

async function load(id: string): Promise<Row | null> {
  if (!HAS_SUPABASE) return null;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("site_notices").select("id, kind, title, body, is_pinned, published_at, created_at").eq("id", id).eq("is_published", true).maybeSingle();
  return (data as Row | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/notices/[id]">): Promise<Metadata> {
  const { id } = await params;
  const n = await load(id);
  return { title: n ? `${n.title} | 아트잡스 공지` : "공지사항 | 아트잡스" };
}

/** 본문의 https:// 주소를 링크로. 그 외는 그대로(HTML 아님). */
function renderBody(body: string) {
  return body.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="whitespace-pre-wrap">
      {para.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
        /^https?:\/\//.test(part) ? <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">{part}</a> : part,
      )}
    </p>
  ));
}

export default async function NoticeDetailPage({ params }: PageProps<"/notices/[id]">) {
  const { id } = await params;
  const n = await load(id);
  if (!n) notFound();
  const supabase = await createClient();
  if (supabase) await supabase.rpc("bump_notice_view", { p_id: id });
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-6"><Link href="/notices" className="text-sm text-stone-500 hover:text-stone-900">← 공지사항</Link></div>
      <article className="rounded-2xl border border-stone-200 bg-white p-5 md:p-8">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{noticeKindLabel(n.kind)}</span>
        <h1 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">{n.title}</h1>
        <p className="mt-1 text-xs text-stone-400">{fmtDate(n.published_at ?? n.created_at)}</p>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-stone-800">{renderBody(n.body)}</div>
      </article>
    </main>
  );
}
