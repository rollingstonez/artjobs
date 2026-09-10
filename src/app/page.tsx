import Link from "next/link";
import PostingCard from "@/components/PostingCard";
import { countByCategory, getPostings } from "@/lib/postings";
import { CATEGORIES } from "@/types/job";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latest, counts] = await Promise.all([getPostings(), countByCategory()]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <section className="py-12 md:py-20">
        <p className="text-sm font-semibold text-stone-500">순수예술 구인구직</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          미술관·재단·갤러리 채용공고를
          <br />
          한곳에서.
        </h1>
        <p className="mt-4 max-w-xl text-base text-stone-600 md:text-lg">
          회화·조각·미디어아트·큐레이션·예술교육까지. 공공 예술기관이 공개한 채용과 공모를 매일
          모아 분야·지역별로 보여드립니다.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href="/jobs"
            className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700"
          >
            채용공고 보기
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:border-stone-500"
          >
            서비스 소개
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">분야별 공고</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li key={c.code}>
              <Link
                href={`/jobs?category=${c.code}`}
                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium hover:border-stone-400"
              >
                <span>{c.label}</span>
                <span className="text-xs text-stone-400">{counts[c.code] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">최신 공고</h2>
          <Link href="/jobs" className="text-sm text-stone-500 hover:text-stone-900">
            전체 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {latest.slice(0, 6).map((p) => (
            <PostingCard key={p.id} posting={p} />
          ))}
        </div>
        {latest.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">아직 모집중인 공고가 없습니다.</p>
        )}
      </section>
    </main>
  );
}
