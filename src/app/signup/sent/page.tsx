import type { Metadata } from "next";
import Link from "next/link";
import ResendForm from "./ResendForm";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "메일을 확인해 주세요 | 아트잡스", robots: { index: false } };

// 이메일 가입 직후(Supabase 의 "이메일 확인" 이 켜져 있을 때) 또는
// 확인을 아직 안 한 계정으로 로그인하려 했을 때 오는 안내.
export default async function SignupSentPage({ searchParams }: PageProps<"/signup/sent">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const unconfirmed = sp.unconfirmed === "1";
  return (
    <AuthCard
      title={unconfirmed ? "이메일 확인이 아직입니다" : "확인 메일을 보냈어요"}
      lead={
        <>
          <span className="font-semibold text-stone-900">{email || "가입한 이메일"}</span> 로 보낸 메일의{" "}
          <span className="font-semibold text-stone-900">확인 링크</span>를 누르면 가입이 끝납니다.
        </>
      }
      footer={
        <>
          <Link href="/login" className="font-semibold text-stone-900 underline-offset-2 hover:underline">로그인</Link>
          <span className="mx-2 text-stone-300">·</span>
          <Link href="/support" className="underline-offset-2 hover:underline">문의하기</Link>
        </>
      }
    >
      <div className="space-y-4 text-sm text-stone-700">
        <ol className="list-decimal space-y-1 pl-5">
          <li>메일함(네이버·다음·지메일 등)에서 <b>아트잡스</b> 메일을 엽니다.</li>
          <li>메일 안의 <b>확인 버튼(링크)</b>을 누릅니다.</li>
          <li>프로필 작성 화면으로 자동 이동합니다.</li>
        </ol>
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
          메일이 안 보이면 <b>스팸함·프로모션함</b>을 확인해 주세요. 도착까지 1~2분 걸릴 수 있습니다.
        </p>
        <ResendForm email={email} />
      </div>
    </AuthCard>
  );
}
