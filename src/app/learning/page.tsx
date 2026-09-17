import type { Metadata } from "next";
import PostingList from "@/components/PostingList";

export const metadata: Metadata = {
  title: "배움 | 아트잡스",
  description:
    "미술·음악·무용·국악·연극 분야의 워크숍, 강좌, 교육 프로그램, 연수, 아카데미를 모았습니다.",
};

export const dynamic = "force-dynamic";

export default async function LearningPage({ searchParams }: PageProps<"/learning">) {
  const sp = await searchParams;
  return (
    <PostingList
      board="learning"
      searchParams={sp}
      intro="워크숍, 강좌, 교육 프로그램, 연수, 아카데미를 모았습니다."
    />
  );
}
