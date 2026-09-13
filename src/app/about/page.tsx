import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아트잡스는 | About",
};

// 지원자(예술가·구직자) 쪽 장점. 바로쌤처럼 하나씩, 구체적으로.
const FOR_ARTIST = [
  {
    icon: "📍",
    title: "집에서 가까운 공고부터",
    body: "미술·음악·무용·국악·연극 다섯 분야의 채용공고와 오디션·공모·대관을 한곳에서, 내가 사는 곳에서 가까운 순서로 봅니다. 출퇴근·레슨·리허설처럼 몸이 가야 하는 일이 많으니까요. 위치는 내 브라우저에만 저장됩니다.",
  },
  {
    icon: "🔔",
    title: "알림 설정으로 새 공고 바로 받기",
    body: "분야·장르·직무·고용형태에 내 집 근처(또는 원하는 지역)까지 조건을 정해두면, 맞는 공고가 올라오는 대로 사이트 알림·이메일로 받습니다. 즉시·하루 한 번·주 1회 중 원하는 빈도로.",
  },
  {
    icon: "📁",
    title: "서류는 내 프로필에 저장, 지원은 한 번에",
    body: "경력·학력과 포트폴리오 링크(영상·이미지·음원·문서)를 프로필에 한 번 정리해두면, 공고마다 다시 쓸 필요 없이 지원 버튼 한 번으로 그 사본이 기관에 전달됩니다. 나중에 프로필을 고쳐도 이미 낸 서류는 그대로 남습니다.",
  },
  {
    icon: "⭐",
    title: "관심 공고 저장 · 지원 내역 관리",
    body: "마음에 드는 공고는 저장해두고, 어디에 언제 지원했는지 한곳에서 봅니다. 마감이 다가오는 공고도 놓치지 않습니다.",
  },
  {
    icon: "📶",
    title: "진행 상황을 알림으로",
    body: "접수 → 확인 → 서류 통과 → 오디션·면접 → 최종 선발까지, 내 지원이 지금 어느 단계인지 알림으로 받습니다.",
  },
  {
    icon: "🔒",
    title: "연락처 비공개, 메신저로만",
    body: "전화번호·이메일을 화면에 드러내지 않고 사이트 안 메신저로만 기관과 대화합니다. 개인정보는 내가 원할 때 대화 안에서 직접 알려줍니다.",
  },
  {
    icon: "🙋",
    title: "구직 글로 먼저 찾아오게",
    body: "\"이런 일을 찾습니다\"를 공개 글로 올려 기관이 먼저 연락하게 할 수 있습니다. 크롤링으로 모은 공고는 기관 원문 접수처도 함께 안내합니다.",
  },
];

// 채용자(기관·구인자) 쪽 장점. 공동심사는 여럿 중 하나 — '원하면 함께'.
const FOR_ORG = [
  {
    icon: "🆓",
    title: "공고 무료 등록",
    body: "미술관·공연장·예술단·재단·학교·학원 누구나 무료로 올립니다. 분야·장르·직무·지역·고용형태로 정확히 걸어두면 맞는 사람에게 닿습니다.",
  },
  {
    icon: "⚡",
    title: "조건 맞는 예술가에게 즉시 알림",
    body: "공고를 올리면, 그 조건을 알림으로 걸어둔 예술가에게 바로 전달됩니다. 공고를 낸 그날 지원이 들어오기 시작합니다.",
  },
  {
    icon: "🔎",
    title: "기다리지 않고 먼저 찾기",
    body: "조건으로 예술가 프로필(인재정보)을 검색하고, \"이런 일을 찾습니다\" 구직 글도 열람합니다. 필요한 사람에게 메신저로 먼저 제안할 수 있습니다.",
  },
  {
    icon: "🗂️",
    title: "지원자를 한 화면에서 관리",
    body: "지원이 들어오면 프로필·포트폴리오·지원 메시지를 바로 확인합니다. 유튜브·비메오·사운드클라우드·이미지 포트폴리오는 새 탭 없이 화면 안에서 바로 재생됩니다.",
  },
  {
    icon: "👥",
    title: "원하면 여러 명이 함께 심사",
    body: "혼자 봐도 되고, 담당자·구성원·외부 심사위원을 이메일로 초청해 각자 로그인해 봐도 됩니다. 보면서 0~100 점수·메모를 남기면 자동 저장되고 순위대로 정렬됩니다. 심사위원끼리는 서로 점수를 못 보고, 기관만 전원 점수와 평균을 봅니다.",
  },
  {
    icon: "📊",
    title: "결과를 표·엑셀로 정리",
    body: "지원자별 점수·평균·선발 단계·메모를 한 표로 묶어 보고, 엑셀(CSV)로 내려받습니다. 회의 자료도 결재도 그대로 씁니다.",
  },
  {
    icon: "🔔",
    title: "선발 단계 관리와 자동 알림",
    body: "접수부터 최종 선발까지 단계를 바꾸면 지원자에게 자동으로 알림이 갑니다. 연락은 연락처 공개 없이 메신저로.",
  },
  {
    icon: "🧹",
    title: "개인정보 자동 파기",
    body: "기관이 정한 보관 기간이 지나면 지원 서류 사본을 자동으로 지우고 점수·단계 기록만 남깁니다. 개인정보 관리 부담을 덜어줍니다.",
  },
];

function BenefitList({ items, dark }: { items: typeof FOR_ARTIST; dark?: boolean }) {
  return (
    <ul className={`flex-1 divide-y px-6 ${dark ? "divide-white/10" : "divide-stone-100"}`}>
      {items.map((it) => (
        <li key={it.title} className="flex gap-3 py-4">
          <span aria-hidden className="mt-0.5 text-xl leading-none">{it.icon}</span>
          <div className="min-w-0">
            <h3 className={`text-[15px] font-bold ${dark ? "text-white" : "text-stone-900"}`}>{it.title}</h3>
            <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-stone-300" : "text-stone-600"}`}>{it.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:px-6">
      {/* 히어로 */}
      <div className="py-10 md:py-14">
        <p className="text-sm font-semibold text-stone-500">About · 아트잡스는</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight [word-break:keep-all] md:text-4xl">
          순수예술의 일자리를 모으는 곳,
          <br className="hidden sm:block" /> 찾는 사람과 뽑는 사람 모두를 위해서.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-stone-600 md:text-base">
          미술·음악·무용·국악·연극, 다섯 분야 순수예술의 채용공고와 오디션·공모·대관을 한곳에 모읍니다.
          아래에서 <strong className="text-stone-800">예술가·구직자</strong>와 <strong className="text-stone-800">기관·구인자</strong>가
          각각 아트잡스에서 무엇을 얻는지 하나씩 정리했습니다.
        </p>
      </div>

      {/* ── 지원자 / 채용자 좌우 분할 ── */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {/* 지원자 */}
        <section className="flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className="border-b border-stone-100 bg-emerald-50 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">For Artists</p>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900 md:text-2xl">예술가 · 구직자</h2>
            <p className="mt-1 text-sm text-emerald-800/80">가까운 일자리를 찾고, 서류 한 번 저장해 바로 지원합니다.</p>
          </div>
          <BenefitList items={FOR_ARTIST} />
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
            <p className="mt-1 text-sm text-stone-300">맞는 사람에게 바로 닿고, 지원자를 편하게 가려냅니다.</p>
          </div>
          <BenefitList items={FOR_ORG} dark />
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
            예술 분야는 공연 영상 한 편이 경력 10년보다 결정적일 때가 많습니다. 그래서 아트잡스는 자동으로 순위를 매기지 않고,
            기관이 지원자를 직접 보고 판단하도록 <strong className="text-stone-800">보기 → 메모 → 점수</strong>가 한 화면에서 끊기지 않게 만들었습니다.
            혼자 봐도, 여럿이 함께 봐도 됩니다.
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
