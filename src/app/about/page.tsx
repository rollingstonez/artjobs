import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 소개 | 아트잡스",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">아트잡스 소개</h1>
      </div>

      <div className="space-y-6 text-[15px] leading-relaxed text-stone-800">
        <section>
          <h2 className="font-bold">무엇을 하나요</h2>
          <p className="mt-1">
            미술관·문화재단·갤러리·레지던시·예술교육기관이 각자 홈페이지에 올리는 채용공고와
            공모를 한곳에 모읍니다. 분야·고용형태·지역으로 골라볼 수 있고, 각 공고는 원문
            링크를 함께 보여드립니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">어디서 가져오나요</h2>
          <p className="mt-1">
            자동 수집을 명시적으로 허용했거나(robots.txt 또는 서면 협의) 공공데이터로
            공개된 기관의 게시판만 대상으로 합니다. 허용되지 않은 사이트는 수집하지
            않습니다. 구직자 개인정보가 담긴 인력풀·이력서 게시판은 대상이 아닙니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">주의</h2>
          <p className="mt-1">
            공고 내용은 수집 시점 기준이며 기관 사정에 따라 바뀔 수 있습니다. 접수 전 반드시
            원문에서 최신 내용을 확인하세요.
          </p>
        </section>
      </div>
    </main>
  );
}
