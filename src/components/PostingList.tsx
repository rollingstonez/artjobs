// 채용공고·오디션 게시판이 함께 쓰는 목록 화면. 게시판 종류(board)만 다르다.
import { Suspense } from "react";
import JobsFilter from "@/components/JobsFilter";
import NearMeBar from "@/components/NearMeBar";
import PostingCard from "@/components/PostingCard";
import { getUserLocation } from "@/lib/location-server";
import { DATA_SOURCE, getPostings, type PostingFilters } from "@/lib/postings";
import { boardLabel, type BoardCode } from "@/types/job";

type SearchParams = Record<string, string | string[] | undefined>;

export function pickFilters(sp: SearchParams): Omit<PostingFilters, "board"> {
  const pick = (k: string) => {
    const v = sp[k];
    return typeof v === "string" && v ? v : undefined;
  };
  return {
    field: pick("field"),
    genre: pick("genre"),
    role: pick("role"),
    employmentType: pick("employmentType"),
    region: pick("region"),
    q: pick("q"),
  };
}

export default async function PostingList({
  board,
  searchParams,
  intro,
}: {
  board: BoardCode;
  searchParams: SearchParams;
  intro?: string;
}) {
  const location = await getUserLocation();
  const postings = await getPostings({ board, near: location, ...pickFilters(searchParams) });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{boardLabel(board)}</h1>
        {intro && <p className="mt-1 text-sm text-stone-600">{intro}</p>}
        <p className="mt-1 text-sm text-stone-500">
          모집중 <span className="font-semibold text-stone-800">{postings.length}</span>건
        </p>
      </div>

      {DATA_SOURCE === "sample" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          지금 보이는 공고는 화면 확인용 샘플입니다. 기관명·내용은 실제가 아닙니다.
        </p>
      )}

      <div className="mb-4">
        <NearMeBar location={location} compact />
      </div>

      <Suspense>
        <JobsFilter />
      </Suspense>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {postings.map((p) => (
          <PostingCard key={p.id} posting={p} near={location} />
        ))}
      </div>

      {postings.length === 0 && (
        <p className="mt-10 text-center text-sm text-stone-500">조건에 맞는 공고가 없습니다.</p>
      )}
    </main>
  );
}
