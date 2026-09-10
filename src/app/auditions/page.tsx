import type { Metadata } from "next";
import PostingList from "@/components/PostingList";

export const metadata: Metadata = {
  title: "오디션·공모 | 아트잡스",
  description:
    "단원 모집 오디션, 콩쿠르, 공모전, 레지던시, 창작지원사업을 분야·장르별로 모아 보여드립니다.",
};

export const dynamic = "force-dynamic";

export default async function AuditionsPage({ searchParams }: PageProps<"/auditions">) {
  const sp = await searchParams;
  return (
    <PostingList
      board="audition"
      searchParams={sp}
      intro="단원 모집 오디션, 콩쿠르, 공모전, 레지던시, 창작지원사업을 모았습니다."
    />
  );
}
