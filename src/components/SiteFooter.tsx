import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-stone-500 md:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-bold text-stone-700">아트잡스</span>
          <Link href="/about" className="hover:text-stone-900">
            소개
          </Link>
          <Link href="/jobs" className="hover:text-stone-900">
            채용공고
          </Link>
          <Link href="/auditions" className="hover:text-stone-900">
            오디션·공모
          </Link>
        </div>
        <p className="mt-3 leading-relaxed">
          아트잡스는 미술·음악·무용·국악·연극 기관이 공개한 채용·공모 정보를 허용된 범위에서
          모아 보여주는 서비스입니다. 각 공고의 상세 내용과 접수는 반드시 원문 링크에서
          확인하세요. 내 위치는 브라우저에만 저장되며 서버로 보내지 않습니다.
        </p>
      </div>
    </footer>
  );
}
