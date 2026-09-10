import Link from "next/link";
import PostingCard from "@/components/PostingCard";
import { countByField, getPostings } from "@/lib/postings";
import { FIELDS, genresOf } from "@/types/job";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [jobs, auditions, counts] = await Promise.all([
    getPostings({ board: "job" }),
    getPostings({ board: "audition" }),
    countByField("job"),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <section className="py-12 md:py-20">
        <p className="text-sm font-semibold text-stone-500">순수예술 구인구직</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          미술·음악·무용·국악·연극
          <br />
          일자리를 한곳에서.
        </h1>
        <p className="mt-4 max-w-xl text-base text-stone-600 md:text-lg">
          미술관·공연장·예술단·재단·학교가 공개한 채용공고와 오디션·공모를 매일 모아
          분야·장르·직무·지역별로 보여드립니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/jobs"
            className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700"
          >
            채용공고 보기
          </Link>
          <Link
            href="/auditions"
            className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:border-stone-500"
          >
            오디션·공모 보기
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">분야별 채용공고</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5">
          {FIELDS.map((f) => (
            <li key={f.code}>
              <Link
                href={`/jobs?field=${f.code}`}
                className="flex h-full flex-col rounded-xl border border-stone-200 bg-white px-3.5 py-3 hover:border-stone-400"
              >
                <span className="flex items-center justify-between">
                  <span className="text-base font-bold">{f.label}</span>
                  <span className="text-xs text-stone-400">{counts[f.code] ?? 0}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-stone-500">
                  {genresOf(f.code)
                    .map((g) => g.label.replace(/\(.*\)/, ""))
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">최신 채용공고</h2>
          <Link href="/jobs" className="text-sm text-stone-500 hover:text-stone-900">
            전체 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {jobs.slice(0, 6).map((p) => (
            <PostingCard key={p.id} posting={p} />
          ))}
        </div>
        {jobs.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">아직 모집중인 채용공고가 없습니다.</p>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">오디션·공모</h2>
          <Link href="/auditions" className="text-sm text-stone-500 hover:text-stone-900">
            전체 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {auditions.slice(0, 4).map((p) => (
            <PostingCard key={p.id} posting={p} />
          ))}
        </div>
        {auditions.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">아직 모집중인 오디션·공모가 없습니다.</p>
        )}
      </section>
    </main>
  );
}
