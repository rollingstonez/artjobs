import type { Metadata } from "next";
import { Suspense } from "react";
import JobsFilter from "@/components/JobsFilter";
import PostingCard from "@/components/PostingCard";
import { DATA_SOURCE, getPostings } from "@/lib/postings";

export const metadata: Metadata = {
  title: "순수예술 채용공고·공모 | 아트잡스",
  description:
    "미술관·문화재단·갤러리·레지던시의 채용공고와 공모를 분야·고용형태·지역으로 골라보세요.",
};

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  const pick = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };

  const postings = await getPostings({
    category: pick("category"),
    employmentType: pick("employmentType"),
    region: pick("region"),
    q: pick("q"),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">채용공고</h1>
        <p className="mt-1 text-sm text-stone-500">
          모집중인 공고 <span className="font-semibold text-stone-800">{postings.length}</span>건
        </p>
      </div>

      {DATA_SOURCE === "sample" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          지금 보이는 공고는 화면 확인용 샘플입니다. 기관명·내용은 실제가 아닙니다.
        </p>
      )}

      <Suspense>
        <JobsFilter />
      </Suspense>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {postings.map((p) => (
          <PostingCard key={p.id} posting={p} />
        ))}
      </div>

      {postings.length === 0 && (
        <p className="mt-10 text-center text-sm text-stone-500">조건에 맞는 공고가 없습니다.</p>
      )}
    </main>
  );
}
