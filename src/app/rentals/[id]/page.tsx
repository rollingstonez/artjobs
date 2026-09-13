import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PostingDetail from "@/components/PostingDetail";
import { getPosting } from "@/lib/postings";
import { getViewerState } from "@/lib/viewer";
import { postingHref } from "@/types/job";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/rentals/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) return { title: "공고를 찾을 수 없습니다 | 아트잡스" };
  return {
    title: `${p.title} | ${p.organization ?? "아트잡스"}`,
    description: p.description ?? undefined,
  };
}

export default async function RentalDetailPage({ params }: PageProps<"/rentals/[id]">) {
  const { id } = await params;
  const p = await getPosting(id);
  if (!p) notFound();
  if (p.board !== "rental") redirect(postingHref(p));
  const viewer = await getViewerState(p.id);
  // 대관은 일자리가 아니므로 구글 일자리(JobPosting) 구조화 데이터를 넣지 않는다.
  // 채용이 아닌 글에 JobPosting 을 붙이면 구글 일자리 정책 위반이다.
  return <PostingDetail p={p} viewer={viewer} />;
}
