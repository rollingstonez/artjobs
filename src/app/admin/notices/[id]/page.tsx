import Link from "next/link";
import { notFound } from "next/navigation";
import NoticeForm from "@/components/admin/NoticeForm";
import { Badge, Flash, PageHeader, btn } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { deleteNotice, saveNotice } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; kind: string; title: string; body: string; is_pinned: boolean; is_published: boolean; published_at: string | null; view_count: number; created_at: string; updated_at: string };

export default async function AdminNoticeEditPage({ params, searchParams }: PageProps<"/admin/notices/[id]">) {
  await requireAdmin("/admin/notices");
  const { id } = await params;
  const s = await searchParams;
  const supabase = (await createClient())!;
  const { data } = await supabase.from("site_notices").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const n = data as Row;
  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/notices", label: "공지사항으로" }}
        title="공지 수정"
        description={<span className="flex flex-wrap items-center gap-2">{n.is_published ? <Badge tone="green">공개</Badge> : <Badge tone="stone">초안</Badge>}<span>만듦 {fmtDateTime(n.created_at)} · 수정 {fmtDateTime(n.updated_at)} · 조회 {n.view_count}</span></span>}
        actions={
          <>
            {n.is_published && <Link href={`/notices/${n.id}`} className={btn.secondary}>공개 화면 ↗</Link>}
            <form action={deleteNotice.bind(null, n.id)}><button className={btn.danger}>삭제</button></form>
          </>
        }
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      <NoticeForm action={saveNotice.bind(null, n.id)} values={{ title: n.title, body: n.body, kind: n.kind, is_pinned: n.is_pinned, is_published: n.is_published }} />
    </div>
  );
}
