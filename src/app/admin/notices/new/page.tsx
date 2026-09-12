import NoticeForm from "@/components/admin/NoticeForm";
import { Flash, PageHeader } from "@/components/admin/ui";
import { sp } from "@/lib/admin/queries";
import { saveNotice } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";

export default async function AdminNoticeNewPage({ searchParams }: PageProps<"/admin/notices/new">) {
  await requireAdmin("/admin/notices");
  const s = await searchParams;
  return (
    <div className="space-y-4">
      <PageHeader back={{ href: "/admin/notices", label: "공지사항으로" }} title="새 공지" description="공개를 켜지 않으면 초안으로 저장됩니다." />
      <Flash err={sp(s.err) || null} />
      <NoticeForm action={saveNotice.bind(null, null)} values={{ title: "", body: "", kind: "notice", is_pinned: false, is_published: false }} submitLabel="공지 만들기" />
    </div>
  );
}
