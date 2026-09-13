import type { Metadata } from "next";
import PostingList from "@/components/PostingList";

export const metadata: Metadata = {
  title: "대관 | 아트잡스",
  description:
    "갤러리 전시실, 연습실, 공연장을 기간을 정해 신청받는 대관 공모·대관 지원사업을 분야·지역별로 모아 보여드립니다.",
};

export const dynamic = "force-dynamic";

export default async function RentalsPage({ searchParams }: PageProps<"/rentals">) {
  const sp = await searchParams;
  return (
    <PostingList
      board="rental"
      searchParams={sp}
      intro="갤러리 전시실·연습실·공연장을 기간을 정해 신청받는 대관 공모와 대관 지원사업을 모았습니다. 상시 유료 대여는 다루지 않습니다."
    />
  );
}
