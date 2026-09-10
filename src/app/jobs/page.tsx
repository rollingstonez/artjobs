import type { Metadata } from "next";
import PostingList from "@/components/PostingList";

export const metadata: Metadata = {
  title: "순수예술 채용공고 | 아트잡스",
  description:
    "미술·음악·무용·국악·연극 기관과 단체의 채용공고를 분야·장르·직무·지역으로 골라보세요.",
};

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  return (
    <PostingList
      board="job"
      searchParams={sp}
      intro="미술관·공연장·예술단·재단·학교가 올린 채용공고입니다."
    />
  );
}
