import Link from "next/link";
import { Badge, Chip, ChipRow, Empty, ErrorNote, Flash, PageHeader, Table, Td, Th, btn } from "@/components/admin/ui";
import { noticeKindLabel } from "@/lib/admin/labels";
import { sp } from "@/lib/admin/queries";
import { toggleNoticePublished } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; kind: string; title: string; is_pinned: boolean; is_published: boolean; published_at: string | null; view_count: number; updated_at: string; created_at: string };

export default async function AdminNoticesPage({ searchParams }: PageProps<"/admin/notices">) {
  await requireAdmin("/admin/notices");
  const s = await searchParams;
  const show = ["published", "draft"].includes(sp(s.show)) ? sp(s.show) : "all";
  const supabase = (await createClient())!;
  let q = supabase.from("site_notices").select("id, kind, title, is_pinned, is_published, published_at, view_count, updated_at, created_at").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (show === "published") q = q.eq("is_published", true);
  if (show === "draft") q = q.eq("is_published", false);
  const { data, error } = await q;
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <PageHeader
        title="공지사항"
        count={rows.length}
        description="회원과 방문자에게 보이는 공지입니다(/notices). 공개를 끄면 초안으로 남고, 상단 고정은 목록 맨 위에 둡니다. 새 기능 안내·점검·수집 소스 변경 등을 알릴 때 쓰세요."
        actions={<Link href="/admin/notices/new" className={btn.primary}>＋ 새 공지</Link>}
      />
      <Flash ok={sp(s.ok) || null} err={sp(s.err) || null} />
      {error && <ErrorNote message={error.message} missing />}
      <ChipRow>
        <Chip href="/admin/notices" active={show === "all"}>전체</Chip>
        <Chip href="/admin/notices?show=published" active={show === "published"}>공개</Chip>
        <Chip href="/admin/notices?show=draft" active={show === "draft"}>초안</Chip>
      </ChipRow>
      {!error && rows.length === 0 ? (
        <Empty icon="📢">공지가 없습니다. <Link href="/admin/notices/new" className="underline underline-offset-2">첫 공지 쓰기</Link></Empty>
      ) : (
        <Table>
          <thead className="bg-stone-50"><tr><Th>제목</Th><Th>종류</Th><Th>상태</Th><Th>게시</Th><Th>조회</Th><Th>수정</Th><Th></Th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((n) => (
              <tr key={n.id} className="hover:bg-stone-50">
                <Td>
                  {n.is_pinned && <span className="mr-1" title="상단 고정">📌</span>}
                  <Link href={`/admin/notices/${n.id}`} className="font-semibold underline-offset-2 hover:underline">{n.title}</Link>
                  {n.is_published && <Link href={`/notices/${n.id}`} className="ml-2 text-[11px] text-stone-400 hover:underline">공개 화면 ↗</Link>}
                </Td>
                <Td><Badge>{noticeKindLabel(n.kind)}</Badge></Td>
                <Td>{n.is_published ? <Badge tone="green">공개</Badge> : <Badge tone="stone">초안</Badge>}</Td>
                <Td className="text-xs text-stone-500">{n.published_at ? fmtDateTime(n.published_at) : "—"}</Td>
                <Td className="text-xs text-stone-500">{n.view_count}</Td>
                <Td className="text-xs text-stone-500">{fmtDateTime(n.updated_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <form action={toggleNoticePublished.bind(null, n.id, !n.is_published)}><button className={btn.secondary}>{n.is_published ? "비공개로" : "공개하기"}</button></form>
                    <Link href={`/admin/notices/${n.id}`} className={btn.secondary}>수정</Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
