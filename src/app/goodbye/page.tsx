import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "탈퇴 완료 | 아트잡스", robots: { index: false } };

// 탈퇴 처리를 마친 사람이 오는 안내. 로그아웃된 상태라 로그인 없이 열린다.
export default function GoodbyePage() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 md:px-6">
      <div className="py-14 text-center">
        <p className="text-4xl">👋</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">탈퇴가 완료되었습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          그동안 아트잡스를 써 주셔서 고맙습니다.
          <br />
          프로필과 저장한 공고, 알림 조건은 지웠습니다. 이미 넣은 지원서와 주고받은 대화는 상대방의 기록이라 남고,
          지원서에 담긴 개인정보는 보관 기간이 지나면 자동으로 지워집니다.
        </p>
        <p className="mt-3 text-sm text-stone-600">
          공고는 로그인 없이도 계속 보실 수 있습니다. 다시 쓰고 싶어지면{" "}
          <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 알려 주세요.
        </p>
        <div className="mt-7 flex justify-center gap-2">
          <Link href="/jobs" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white">채용공고 보기</Link>
          <Link href="/" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold">홈으로</Link>
        </div>
      </div>
    </main>
  );
}
