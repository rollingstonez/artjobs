import Link from "next/link";

// Supabase 가 연결되기 전에 회원 페이지를 열면 보이는 안내.
export default function AccountUnavailablePage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 md:px-6">
      <div className="py-12 text-center">
        <p className="text-4xl">🔧</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">회원 기능 준비 중</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          회원가입·프로필·지원·메신저는 데이터베이스 연결이 끝나면 열립니다.
          <br />
          채용공고와 오디션·공모는 로그인 없이 지금도 볼 수 있습니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/jobs" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white">
            채용공고 보기
          </Link>
          <Link href="/" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold">
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
