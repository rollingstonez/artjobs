"use client";

// 홈 히어로 옆 "실시간 수집 현황" 현황판 — 바로쌤의 수집 현황판을 아트잡스에 맞게 옮긴 것.
// 매일 예술기관·미술관·재단 게시판에서 모아 온 "지금 모집 중" 공고 수를 한눈에 보여주고,
// 현재 시각을 초 단위로 째깍이게 해 "살아 있는" 느낌으로 방문자의 관심을 끈다.
// 건수·목록은 서버(src/app/page.tsx)에서 실제 공고로 계산해 넘기고, 시계만 브라우저에서 돈다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDeadline } from "@/lib/format";

export interface DashboardItem {
  id: string;
  board: "job" | "audition";
  region: string | null;
  organization: string | null;
  title: string;
  applyEnd: string | null;
}

interface Props {
  jobCount: number;
  auditionCount: number;
  orgCount: number;
  sourceCount: number;
  lastCollected: string | null; // 가장 최근에 수집된 공고 날짜(YYYY-MM-DD)
  items: DashboardItem[];
}

const fmtClock = (d: Date) =>
  d.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function CollectionDashboard({
  jobCount,
  auditionCount,
  orgCount,
  sourceCount,
  lastCollected,
  items,
}: Props) {
  // 서버·클라이언트 시각이 달라 생기는 hydration 경고를 피하려고, 마운트 후에만 시계를 그린다.
  const [clock, setClock] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setClock(fmtClock(new Date()));
    const first = setTimeout(tick, 0); // 마운트 직후 한 번(효과 본문에서 곧바로 setState 하지 않는다)
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const total = jobCount + auditionCount;

  return (
    <div className="rounded-3xl bg-stone-900 p-5 text-white shadow-xl md:p-6">
      {/* 헤더: 살아 있는 초록 점 + 현재 시각 */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-stone-200">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          실시간 수집 현황
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-bold tabular-nums text-emerald-300 md:text-2xl" suppressHydrationWarning>
            {clock ?? "--:--:--"}
          </span>
          <span className="text-[11px] text-stone-400">현재 시각</span>
        </span>
      </div>

      {/* 총 모집 건수 */}
      <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-4xl font-extrabold tabular-nums md:text-5xl">{total.toLocaleString("ko-KR")}</span>
        <span className="text-sm text-stone-300">
          건 모집 중{sourceCount > 0 && <> · {sourceCount.toLocaleString("ko-KR")}곳에서 수집</>}
        </span>
      </div>

      {/* 게시판별 건수 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/jobs"
          className="rounded-xl bg-white/5 px-3.5 py-3 transition hover:bg-white/10"
        >
          <span className="block text-[11px] font-medium text-stone-400">채용공고</span>
          <span className="mt-0.5 block text-2xl font-bold tabular-nums">
            {jobCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-sm font-normal text-stone-400">건</span>
          </span>
        </Link>
        <Link
          href="/auditions"
          className="rounded-xl bg-white/5 px-3.5 py-3 transition hover:bg-white/10"
        >
          <span className="block text-[11px] font-medium text-stone-400">오디션·공모</span>
          <span className="mt-0.5 block text-2xl font-bold tabular-nums">
            {auditionCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-sm font-normal text-stone-400">건</span>
          </span>
        </Link>
      </div>

      {/* 공항 전광판처럼 공고가 아래에서 위로 끝없이 흘러 올라가는 세로 전광판.
          목록을 두 벌 이어 붙이고 CSS 로 -50% 지점까지 올려 이음매 없이 반복한다.
          한 항목당 약 3.4초가 흐르도록 개수에 맞춰 속도를 잡고, 마우스를 올리면 멈춘다. */}
      {items.length > 0 && (
        <div className="artjobs-marquee-viewport mt-4 h-52 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
          <ul
            className="artjobs-marquee space-y-1.5"
            style={{ ["--marquee-duration" as string]: `${Math.max(items.length * 3.4, 20)}s` }}
          >
            {[...items, ...items].map((it, i) => {
              const d = getDeadline(it.applyEnd);
              return (
                <li key={`${it.id}-${i}`} aria-hidden={i >= items.length ? true : undefined}>
                  <Link
                    href={`/${it.board === "job" ? "jobs" : "auditions"}/${encodeURIComponent(it.id)}`}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 transition hover:bg-white/10"
                    tabIndex={i >= items.length ? -1 : undefined}
                  >
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        it.board === "job" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {it.board === "job" ? "채용" : "공모"}
                    </span>
                    <span className="shrink-0 rounded-md bg-stone-700 px-1.5 py-0.5 text-[11px] font-semibold text-stone-100">
                      {it.region ?? "전국"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {it.organization || it.title}
                      </span>
                      <span className="block truncate text-[11px] text-stone-400">{it.title}</span>
                    </span>
                    {d.label && (
                      <span
                        className={`shrink-0 text-xs font-bold tabular-nums ${
                          d.kind === "soon" ? "text-amber-300" : "text-stone-300"
                        }`}
                      >
                        {d.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 꼬리말 */}
      <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-500">
        예술기관·미술관·재단·학교 게시판에서 자동 수집
        {orgCount > 0 && <> · {orgCount.toLocaleString("ko-KR")}개 기관</>}
        {lastCollected && <> · 최근 수집 {lastCollected.replaceAll("-", ".")}</>}
        {" · 원문 링크 그대로 연결"}
      </p>
    </div>
  );
}
