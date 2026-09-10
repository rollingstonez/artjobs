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
            미술·음악·무용·국악·연극, 다섯 분야 순수예술의 일자리를 모읍니다. 미술관·공연장·
            예술단·문화재단·학교가 각자 홈페이지에 올리는 채용공고와 오디션·공모를 한곳에
            모아 분야·장르·직무·지역으로 골라볼 수 있고, 각 공고는 원문 링크를 함께
            보여드립니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">내 집 근처 공고부터 보여드립니다</h2>
          <p className="mt-1">
            예술 일자리는 출퇴근·레슨·리허설처럼 몸이 가야 하는 일이 많아서, 멀리 있는 공고는
            아무리 좋아도 지원하기 어렵습니다. 그래서 아트잡스는 내 지역을 한 번 정해두면
            채용공고와 오디션·공모를 <strong>같은 시·도 → 인접 지역·전국 → 그 밖</strong> 순서로
            보여드립니다. 현재 위치 버튼을 누르면 가까운 시·도를 자동으로 골라 드립니다.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            위치 정보는 내 브라우저에만 저장되고 아트잡스 서버로 보내지 않습니다. 언제든
            해제할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">연락처를 공개하지 않고 메신저로 소통합니다</h2>
          <p className="mt-1">
            구직자가 프로필(인재정보)을 올리는 단계가 열리면, 전화번호·이메일은 화면에
            노출하지 않습니다. 기관과 예술가는 <strong>사이트 안 메신저</strong>로만 연락을
            주고받고, 개인정보는 본인이 원할 때만 상대에게 알려줍니다. 크롤링으로 모으는
            공고는 기관이 공개한 접수 창구를 그대로 안내하되, 구직자 개인정보가 담긴 인력풀·
            이력서 게시판은 수집하지 않습니다.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            인재정보와 메신저는 로그인·개인정보 처리방침을 갖춘 뒤 2단계에서 엽니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">어디까지 다루나요</h2>
          <p className="mt-1">
            예술의전당과 국립국악원 무대·전시장에 오르는 장르, 학교 교과의 음악·미술·무용·국악·
            연극에 해당하는 일자리를 다룹니다. 실용음악·디자인·영상 같은 산업예술 분야는
            별도 서비스(모던아트잡)에서 다룰 예정입니다.
          </p>
        </section>

        <section>
          <h2 className="font-bold">어디서 가져오나요</h2>
          <p className="mt-1">
            자동 수집을 명시적으로 허용했거나(robots.txt 또는 서면 협의) 공공데이터로
            공개된 기관의 게시판만 대상으로 합니다. 허용되지 않은 사이트는 수집하지
            않습니다.
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
