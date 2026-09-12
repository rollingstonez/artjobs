"use client";

// 전 페이지 공통 푸터 — 바로쌤 구조를 아트잡스에 맞게 옮겼다.
//   · 홈("/"): 사업자·운영 정보 전체(전자상거래법 제10조의 표시 의무는 초기화면 기준)
//   · 그 밖의 페이지: 공통 링크 + 상호 한 줄만 (시선을 끌지 않게)
//   사업자 정보는 src/lib/site.ts 의 BUSINESS 한 곳에서만 관리한다. 값이 비어 있으면 그 줄은 그리지 않는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUSINESS } from "@/lib/site";

const LINKS = [
  { href: "/about", label: "서비스 소개" },
  { href: "/notices", label: "공지사항" },
  { href: "/support", label: "문의하기" },
  { href: "/feedback", label: "의견 올리기" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침", strong: true },
];

function LinkRow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs font-semibold text-stone-500">
      {LINKS.map((l, i) => (
        <span key={l.href} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden className="text-stone-300">·</span>}
          <Link href={l.href} className={`hover:text-stone-900 ${l.strong ? "text-stone-700" : ""}`}>
            {l.label}
          </Link>
        </span>
      ))}
    </div>
  );
}

export default function SiteFooter() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-100 print:hidden">
      <div className="mx-auto max-w-5xl px-4 py-7 md:px-6">
        <LinkRow />

        {isHome ? (
          <>
            <div className="mt-5 space-y-1 text-center text-xs leading-relaxed text-stone-500">
              <p className="text-[13px] font-bold text-stone-700">
                {BUSINESS.company}
                <span aria-hidden className="mx-1.5 font-normal text-stone-300">·</span>
                대표 {BUSINESS.owner}
              </p>
              <p>{BUSINESS.address}</p>
              <p className="flex flex-wrap items-center justify-center gap-x-1.5">
                <span>사업자등록번호 {BUSINESS.bizNo}</span>
                {BUSINESS.mailOrderNo && (
                  <>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span>통신판매업신고 {BUSINESS.mailOrderNo}</span>
                  </>
                )}
              </p>
              {BUSINESS.jobInfoNo && <p>직업정보제공사업신고 {BUSINESS.jobInfoNo}</p>}
              <p>
                문의{" "}
                <a href={`mailto:${BUSINESS.email}`} className="underline underline-offset-2 hover:text-stone-900">
                  {BUSINESS.email}
                </a>
              </p>
            </div>

            <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-stone-500">
              아트잡스는 미술·음악·무용·국악·연극 기관이 공개한 채용·공모 정보를 허용된 범위에서 모아 보여주는 서비스입니다.
              공고의 내용과 채용 절차는 각 기관이 정하며, 아트잡스는 채용 당사자가 아닙니다. 접수 전 반드시{" "}
              <span className="font-semibold text-stone-600">원문 링크</span>에서 최신 내용을 확인하세요.
              회원 간 연락은 아트잡스 메시지로만 이루어지고 전화번호·이메일은 공개되지 않습니다. 내 위치는 브라우저에만 저장되며 서버로 보내지 않습니다.
            </p>
          </>
        ) : (
          <p className="mt-4 text-center text-xs text-stone-500">
            {BUSINESS.company}
            <span aria-hidden className="mx-1.5 text-stone-300">·</span>
            사업자 정보는 <Link href="/" className="underline underline-offset-2 hover:text-stone-900">홈 화면</Link> 아래쪽에 있습니다.
          </p>
        )}

        <p className="mt-4 text-center text-[11px] text-stone-400">© {new Date().getFullYear()} {BUSINESS.service}</p>
      </div>
    </footer>
  );
}
