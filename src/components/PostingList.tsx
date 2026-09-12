// 채용공고·오디션 게시판이 함께 쓰는 목록 화면. 게시판 종류(board)만 다르다.
import { Suspense } from "react";
import JobsFilter from "@/components/JobsFilter";
import NearMeBar from "@/components/NearMeBar";
import PostingCard from "@/components/PostingCard";
import { getSavedIds } from "@/lib/bookmarks";
import { getUserLocation } from "@/lib/location-server";
import { isLivingPosting } from "@/lib/living";
import { DATA_SOURCE, getPostings, type PostingFilters } from "@/lib/postings";
import { boardLabel, type BoardCode } from "@/types/job";

// 마감 공고를 지우지 않고 이 기간(일) 안쪽까지 목록 뒤에 남겨 둔다. 너무 오래된 건 감춘다.
const CLOSED_WINDOW_DAYS = 60;

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
  const [location, { savedIds, loggedIn }] = await Promise.all([getUserLocation(), getSavedIds()]);
  const filters = pickFilters(searchParams);
  // 오디션·공모는 직무·고용형태 필터를 쓰지 않는다(채용 개념이라 맞지 않음).
  if (board !== "job") {
    filters.role = undefined;
    filters.employmentType = undefined;
  }
  // 모집중 + 최근 마감(아카이브)을 함께 불러온 뒤, 모집중은 위에·마감은 뒤로 나눠 보여준다.
  const all = await getPostings({
    board,
    near: location,
    ...filters,
    status: "all",
    closedWithinDays: CLOSED_WINDOW_DAYS,
  });
  const postings = all.filter((p) => isLivingPosting(p.applyEnd, p.createdAt));
  const closed = all.filter((p) => !isLivingPosting(p.applyEnd, p.createdAt));

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
        <JobsFilter board={board} />
      </Suspense>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {postings.map((p) => (
          <PostingCard key={p.id} posting={p} near={location} savedIds={savedIds} loggedIn={loggedIn} />
        ))}
      </div>

      {postings.length === 0 && (
        <p className="mt-10 text-center text-sm text-stone-500">
          {closed.length > 0
            ? "지금 모집중인 공고는 없습니다. 아래 지난 공고를 참고하세요."
            : "조건에 맞는 공고가 없습니다."}
        </p>
      )}

      {/* 지난 공고(마감) — 지우지 않고 참고용으로 남겨 둔다. 카드는 흐리게 표시된다. */}
      {closed.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="shrink-0 text-sm font-bold text-stone-500">지난 공고 · 마감</h2>
            <span className="text-xs text-stone-400">{closed.length}건</span>
            <span className="h-px flex-1 bg-stone-200" />
          </div>
          <p className="mt-1 text-xs text-stone-400">
            최근 {CLOSED_WINDOW_DAYS}일 안에 마감된 공고입니다. 접수는 끝났지만 원문은 참고할 수 있습니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {closed.map((p) => (
              <PostingCard key={p.id} posting={p} near={location} savedIds={savedIds} loggedIn={loggedIn} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
