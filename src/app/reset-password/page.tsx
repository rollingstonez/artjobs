import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";
import AuthCard from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "새 비밀번호 정하기 | 아트잡스", robots: { index: false } };
// 링크로 만들어진 세션(쿠키)을 읽어야 하므로 항상 요청 때 그린다.
export const dynamic = "force-dynamic";

// 비밀번호 재설정 메일의 링크가 /auth/callback(또는 /auth/confirm)을 거쳐 여기로 온다.
// 링크로 만들어진 세션이 있어야 하고, 없으면 만료 안내.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user) {
    return (
      <AuthCard
        title="링크가 만료되었습니다"
        lead="비밀번호 재설정 링크는 한 번만 쓸 수 있고, 시간이 지나면 만료됩니다."
        footer={
          <Link href="/login" className="font-semibold text-stone-900 underline-offset-2 hover:underline">로그인으로 돌아가기</Link>
        }
      >
        <div className="space-y-4 text-sm text-stone-700">
          <p>아래 버튼으로 비밀번호 찾기를 다시 진행하면 새 링크를 보내 드립니다.</p>
          <Link href="/forgot-password" className="block h-11 w-full rounded-lg bg-stone-900 text-center text-sm font-semibold leading-[44px] text-white hover:bg-stone-700">
            비밀번호 찾기 다시 하기
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="새 비밀번호 정하기" lead={<>{user.email} 계정의 비밀번호를 새로 정합니다.</>}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
