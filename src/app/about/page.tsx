import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아트잡스는 | About",
};

// 지원자(예술가·구직자) 쪽 장점.
const FOR_ARTIST = [
  {
    title: "내 집 근처 공고부터",
    body: "미술·음악·무용·국악·연극 다섯 분야의 채용공고와 오디션·공모·대관을 한곳에서, 내가 사는 곳에서 가까운 순서로 봅니다. 위치는 내 브라우저에만 저장됩니다.",
  },
  {
    title: "프로필 하나로 지원",
    body: "영상·이미지·음원 포트폴리오 링크를 한 번 정리해두면, 지원할 때 그 사본이 심사 자료로 전달됩니다. 나중에 프로필을 고쳐도 이미 낸 심사 자료는 그대로 남습니다.",
  },
  {
    title: "연락처 비공개, 메신저로만",
    body: "전화번호·이메일을 화면에 드러내지 않고 사이트 안 메신저로만 기관과 대화합니다. 개인정보는 내가 원할 때 대화 안에서 직접 알려줍니다.",
  },
  {
    title: "진행 상황을 알림으로",
    body: "접수 → 확인 → 서류 통과 → 오디션·면접 → 최종 선발까지, 내 지원이 어느 단계인지 알림으로 받습니다. 새 공고 알림·관심 공고 저장·지원 내역 관리도 한곳에서.",
  },
  {
    title: "구직 글 직접 올리기",
    body: "\"이런 일을 찾습니다\"를 공개 글로 올려 기관이 먼저 찾아오게 할 수 있습니다. 이름·경력·글 내용만 공개되고, 상세 프로필은 로그인한 기관에게만 보입니다.",
  },
];

// 채용자(기관·구인자) 쪽 장점. 핵심은 여럿이 함께 보는 심사 작업대.
const FOR_ORG = [
  {
    title: "여러 명이 함께 심사",
    body: "담당자·구성원은 물론 외부 심사위원까지 이메일로 초청하면, 각자 로그인해 같은 지원자를 봅니다. 심사위원은 그 공고의 지원자만 보고, 자기 점수·메모만 남깁니다.",
  },
  {
    title: "지원자를 화면에서 즉석 확인",
    body: "유튜브·비메오·사운드클라우드·이미지 포트폴리오는 새 탭 없이 화면 안에서 바로 재생됩니다. 프로필·지원 메시지·경력까지 한 화면에서, 이전/다음으로 넘기며 봅니다.",
  },
  {
    title: "보면서 바로 점수·메모",
    body: "0~100점과 메모를 그 자리에서 남깁니다. 입력이 멈추면 자동 저장되고, 지원자 목록이 점수순으로 다시 정렬됩니다.",
  },
  {
    title: "아트잡스가 결과로 정리",
    body: "심사위원끼리는 서로 점수를 볼 수 없고(블라인드), 기관만 전원의 점수와 평균을 봅니다. 지원자별 점수·평균·단계·메모를 한 표로 묶어 엑셀(CSV)로 내려받습니다.",
  },
  {
    title: "선발 단계 관리와 자동 알림",
    body: "접수부터 최종 선발까지 단계를 바꾸면 지원자에게 자동으로 알림이 갑니다. 미술관·공연장·예술단·재단·학교·학원 누구나 공고를 무료로 올릴 수 있습니다.",
  },
];

// 채용자가 겪는 실제 흐름 — 사용자가 그린 그림을 4단계로.
const ORG_FLOW = [
  { n: "1", label: "함께 로그인", body: "담당자·구성원·심사위원을 초청" },
  { n: "2", label: "즉석 확인", body: "포트폴리오 링크를 화면 안에서 재생" },
  { n: "3", label: "점수·메모", body: "보면서 그 자리에서 채점" },
  { n: "4", label: "결과 정리", body: "점수·평균·단계를 표·CSV로" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      {/* 히어로 */}
      <div className="py-10 md:py-14">
        <p className="text-sm font-semibold text-stone-500">About · 아트잡스는</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight [word-break:keep-all] md:text-4xl">
          순수예술의 일자리를 모으고,
          <br className="hidden sm:block" /> 채용을 한 화면에서 끝내는 곳입니다.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-stone-600 md:text-base">
          미술·음악·무용·국악·연극, 다섯 분야 순수예술의 채용공고와 오디션·공모·대관을 한곳에 모읍니다.
          예술가는 내 집 근처 공고부터 골라 지원하고, 기관은 여러 명이 함께 지원자를 보고 점수를 매겨 결과까지 정리합니다.
        </p>
      </div>

      {/* ── 지원자 / 채용자 좌우 분할 ── */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {/* 지원자 */}
        <section className="flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 bg-emerald-50 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">For Artists</p>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900 md:text-2xl">예술가 · 구직자</h2>
            <p className="mt-1 text-sm text-emerald-800/80">가까운 일자리를 찾고, 프로필 하나로 지원합니다.</p>
          </div>
          <ul className="flex-1 divide-y divide-stone-100 px-6">
            {FOR_ARTIST.map((it) => (
              <li key={it.title} className="py-4">
                <h3 className="flex items-start gap-2 text-[15px] font-bold text-stone-900">
                  <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
                  {it.title}
                </h3>
                <p className="mt-1 pl-6 text-sm leading-relaxed text-stone-600">{it.body}</p>
              </li>
            ))}
          </ul>
          <div className="px-6 pb-6 pt-2">
            <Link
              href="/signup?role=artist"
              className="inline-block rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
            >
              예술가로 가입
            </Link>
            <Link href="/jobs" className="ml-3 text-sm font-semibold text-stone-500 hover:text-stone-900">
              공고 먼저 보기 →
            </Link>
          </div>
        </section>

        {/* 채용자 */}
        <section className="flex flex-col overflow-hidden rounded-3xl border border-stone-900 bg-stone-900 text-white">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">For Organizations</p>
            <h2 className="mt-1 text-xl font-extrabold md:text-2xl">기관 · 구인자</h2>
            <p className="mt-1 text-sm text-stone-300">여러 명이 함께 보고, 점수를 매기고, 결과를 정리합니다.</p>
          </div>

          {/* 심사 흐름 4단계 */}
          <div className="border-b border-white/10 px-6 py-4">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ORG_FLOW.map((s) => (
                <li key={s.n} className="rounded-xl bg-white/5 px-3 py-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-extrabold text-stone-900">
                    {s.n}
                  </span>
                  <p className="mt-1.5 text-[13px] font-bold">{s.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-stone-400">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <ul className="flex-1 divide-y divide-white/10 px-6">
            {FOR_ORG.map((it) => (
              <li key={it.title} className="py-4">
                <h3 className="flex items-start gap-2 text-[15px] font-bold">
                  <span aria-hidden className="mt-0.5 text-emerald-400">✓</span>
                  {it.title}
                </h3>
                <p className="mt-1 pl-6 text-sm leading-relaxed text-stone-300">{it.body}</p>
              </li>
            ))}
          </ul>
          <div className="px-6 pb-6 pt-2">
            <Link
              href="/signup?role=organization"
              className="inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-200"
            >
              기관으로 가입
            </Link>
            <Link href="/post" className="ml-3 text-sm font-semibold text-stone-400 hover:text-white">
              공고 올리기 →
            </Link>
          </div>
        </section>
      </div>

      {/* ── 공통: 어떻게 다르고, 어디까지 다루나 ── */}
      <div className="mt-14 space-y-6 text-[15px] leading-relaxed text-stone-800">
        <h2 className="text-lg font-bold">아트잡스가 지키는 것</h2>

        <section>
          <h3 className="font-bold">숫자가 아니라, 직접 보고 정합니다</h3>
          <p className="mt-1 text-stone-600">
            예술 분야는 공연 영상 한 편이 경력 10년보다 결정적일 때가 많습니다. 그래서 아트잡스는 자동으로 순위를 매기는 대신,
            <strong className="text-stone-800"> 보기 → 메모 → 점수</strong>라는 검토 행위가 한 화면에서 끊기지 않도록 만들었습니다.
            여러 심사위원의 눈을 모아 기관이 최종 결정을 내립니다.
          </p>
        </section>

        <section>
          <h3 className="font-bold">연락처를 공개하지 않고 메신저로 소통합니다</h3>
          <p className="mt-1 text-stone-600">
            기관과 예술가는 사이트 안 메신저로만 연락을 주고받고, 개인정보는 본인이 원할 때만 상대에게 알려줍니다.
            지원하는 순간 프로필·포트폴리오 사본이 심사 자료로 전달되며, 기관이 정한 보관 기간이 지나면 사본은 자동으로 파기되고 점수·단계만 남습니다.
            크롤링으로 모으는 공고는 기관이 공개한 접수 창구를 그대로 안내하되, 구직자 개인정보가 담긴 인력풀·이력서 게시판은 수집하지 않습니다.
          </p>
        </section>

        <section>
          <h3 className="font-bold">어디까지 다루나요</h3>
          <p className="mt-1 text-stone-600">
            예술의전당과 국립국악원 무대·전시장에 오르는 장르, 학교 교과의 음악·미술·무용·국악·연극에 해당하는 일자리를 다룹니다.
            실용음악·디자인·영상 같은 산업예술 분야는 별도 서비스(모던아트잡)에서 다룰 예정입니다.
          </p>
        </section>

        <section>
          <h3 className="font-bold">어디서 가져오나요</h3>
          <p className="mt-1 text-stone-600">
            자동 수집을 명시적으로 허용했거나(robots.txt 또는 서면 협의) 공공데이터로 공개된 기관의 게시판만 대상으로 합니다.
            허용되지 않은 사이트는 수집하지 않습니다. 공고 내용은 수집 시점 기준이며 기관 사정에 따라 바뀔 수 있으니, 접수 전 반드시 원문에서 최신 내용을 확인하세요.
          </p>
        </section>
      </div>
    </main>
  );
}
