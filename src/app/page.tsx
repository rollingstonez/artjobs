import Link from "next/link";
import NearMeBar from "@/components/NearMeBar";
import PostingCard from "@/components/PostingCard";
import { getUserLocation } from "@/lib/location-server";
import { countByField, getPostings } from "@/lib/postings";
import { FIELDS, genresOf } from "@/types/job";

export const dynamic = "force-dynamic";

// 아트잡스가 지키는 세 가지. 바로쌤에서 검증된 "우리 동네 우선"과 "연락처 비공개 메신저" 원칙을 잇는다.
const PRINCIPLES = [
  {
    icon: "📍",
    title: "내 집 근처 공고부터",
    body: "내 지역을 한 번만 정해두면 채용공고와 오디션·공모를 가까운 순서로 보여드립니다. 위치는 내 브라우저에만 저장됩니다.",
    status: "지금 사용 가능",
  },
  {
    icon: "🎭",
    title: "미술·음악·무용·국악·연극",
    body: "다섯 분야의 채용공고와 오디션·공모를 장르·직무·고용형태로 한 번에 골라볼 수 있습니다.",
    status: "지금 사용 가능",
  },
  {
    icon: "🔒",
    title: "연락처 없이 메신저로",
    body: "인재정보를 열면 전화번호·이메일을 공개하지 않고 사이트 안 메신저로만 연락을 주고받습니다. 개인정보는 사이트 밖으로 나가지 않습니다.",
    status: "2단계 오픈 예정",
  },
] as const;

export default async function HomePage() {
  const location = await getUserLocation();
  const [jobs, auditions, counts] = await Promise.all([
    getPostings({ board: "job", near: location }),
    getPostings({ board: "audition", near: location }),
    countByField("job"),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      <section className="py-12 md:py-20">
        <p className="text-sm font-semibold text-stone-500">순수예술 구인구직</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          미술·음악·무용·국악·연극
          <br />
          일자리를 내 집 근처부터.
        </h1>
        <p className="mt-4 max-w-xl text-base text-stone-600 md:text-lg">
          미술관·공연장·예술단·재단·학교가 공개한 채용공고와 오디션·공모를 매일 모아
          분야·장르·직무별로, 그리고 내가 사는 곳에서 가까운 순서로 보여드립니다.
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
        <div className="mt-6 max-w-2xl">
          <NearMeBar location={location} />
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
          <h2 className="text-lg font-bold">
            {location ? `${location.region} 근처 채용공고` : "최신 채용공고"}
          </h2>
          <Link href="/jobs" className="text-sm text-stone-500 hover:text-stone-900">
            전체 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {jobs.slice(0, 6).map((p) => (
            <PostingCard key={p.id} posting={p} near={location} />
          ))}
        </div>
        {jobs.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">아직 모집중인 채용공고가 없습니다.</p>
        )}
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            {location ? `${location.region} 근처 오디션·공모` : "오디션·공모"}
          </h2>
          <Link href="/auditions" className="text-sm text-stone-500 hover:text-stone-900">
            전체 보기 →
          </Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {auditions.slice(0, 4).map((p) => (
            <PostingCard key={p.id} posting={p} near={location} />
          ))}
        </div>
        {auditions.length === 0 && (
          <p className="mt-6 text-sm text-stone-500">아직 모집중인 오디션·공모가 없습니다.</p>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-bold">아트잡스가 지키는 것</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {PRINCIPLES.map((item) => (
            <li
              key={item.title}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5"
            >
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-2 text-base font-bold">{item.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-stone-600">{item.body}</p>
              <span
                className={`mt-3 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.status === "지금 사용 가능"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
