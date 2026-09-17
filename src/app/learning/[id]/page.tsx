import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PostingDetail from "@/components/PostingDetail";
import { getPosting } from "@/lib/postings";
import { getViewerState } from "@/lib/viewer";
import { postingHref } from "@/types/job";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/learning/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) return { title: "공고를 찾을 수 없습니다 | 아트잡스" };
  return {
    title: `${p.title} | ${p.organization ?? "아트잡스"}`,
    description: p.description ?? undefined,
  };
}

export default async function LearningDetailPage({ params }: PageProps<"/learning/[id]">) {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) notFound();
  if (p.board !== "learning") redirect(postingHref(p));
  const viewer = await getViewerState(p.id);
  return <PostingDetail p={p} viewer={viewer} />;
}
