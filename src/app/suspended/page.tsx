import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "이용 제한 | 아트잡스" };
export const dynamic = "force-dynamic";

// 정지된 계정이 회원 페이지를 열면 오는 안내. 공고 보기는 계속 된다.
export default async function SuspendedPage() {
  const me = await getCurrentUser();
  const deleted = me?.profile.status === "deleted";
  if (deleted) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pb-16 md:px-6">
        <div className="py-12 text-center">
          <p className="text-4xl">👋</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">탈퇴 처리된 계정입니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            이 계정은 탈퇴 처리되어 회원 기능을 쓸 수 없습니다.
            <br />
            공고와 오디션·공모는 로그인 없이도 계속 보실 수 있습니다.
            <br />
            다시 이용하고 싶으시면 <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 알려 주세요.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/jobs" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white">채용공고 보기</Link>
            <form action={signOut}>
              <button className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold">로그아웃</button>
            </form>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 md:px-6">
      <div className="py-12 text-center">
        <p className="text-4xl">⛔</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">계정 이용이 제한되었습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          신고 또는 이용약관 위반으로 운영자가 이 계정을 정지했습니다.
          <br />
          메시지·지원·공고 등록은 막히고, 채용공고와 오디션·공모는 계속 볼 수 있습니다.
          <br />
          문의는 <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 보내주세요.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/jobs" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white">채용공고 보기</Link>
          {me && (
            <form action={signOut}>
              <button className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold">로그아웃</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
