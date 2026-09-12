import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import JobPostingJsonLd from "@/components/JobPostingJsonLd";
import PostingDetail from "@/components/PostingDetail";
import { isLivingPosting } from "@/lib/living";
import { getPosting } from "@/lib/postings";
import { getViewerState } from "@/lib/viewer";

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
  const viewer = await getViewerState(p.id);
  // 구글 일자리 노출용 구조화 데이터 — 모집중인 공고에만 넣는다.
  return (
    <>
      <JobPostingJsonLd posting={p} living={isLivingPosting(p.applyEnd, p.createdAt)} />
      <PostingDetail p={p} viewer={viewer} />
    </>
  );
}
