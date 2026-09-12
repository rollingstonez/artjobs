import type { Metadata } from "next";
import Link from "next/link";
import { noticeKindLabel } from "@/lib/admin/labels";
import { fmtDate } from "@/lib/format";
import { HAS_SUPABASE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "공지사항 | 아트잡스" };
export const dynamic = "force-dynamic";

type Row = { id: string; kind: string; title: string; is_pinned: boolean; published_at: string | null; created_at: string };

export default async function NoticesPage() {
  let rows: Row[] = [];
  if (HAS_SUPABASE) {
    const supabase = (await createClient())!;
    const { data } = await supabase.from("site_notices").select("id, kind, title, is_pinned, published_at, created_at").eq("is_published", true).order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(100);
    rows = (data ?? []) as Row[];
  }
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">공지사항</h1>
        <p className="mt-1 text-sm text-stone-600">아트잡스의 새 기능, 점검, 수집 소스 변경 소식입니다.</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">아직 공지가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
          {rows.map((n) => (
            <li key={n.id}>
              <Link href={`/notices/${n.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{noticeKindLabel(n.kind)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{n.is_pinned && <span className="mr-1">📌</span>}{n.title}</span>
                <span className="shrink-0 text-xs text-stone-400">{fmtDate(n.published_at ?? n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-stone-500">궁금한 점은 <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 남겨 주세요.</p>
    </main>
  );
}
