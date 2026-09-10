import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PostingDetail from "@/components/PostingDetail";
import { getPosting } from "@/lib/postings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/auditions/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) return { title: "공고를 찾을 수 없습니다 | 아트잡스" };
  return {
    title: `${p.title} | ${p.organization ?? "아트잡스"}`,
    description: p.description ?? undefined,
  };
}

export default async function AuditionDetailPage({ params }: PageProps<"/auditions/[id]">) {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) notFound();
  if (p.board !== "audition") redirect(`/jobs/${p.id}`);
  return <PostingDetail p={p} />;
}
