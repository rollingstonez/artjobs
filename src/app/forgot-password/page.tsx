import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "비밀번호 찾기 | 아트잡스", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="비밀번호 찾기"
      lead="가입한 이메일로 새 비밀번호를 정할 수 있는 링크를 보내 드립니다."
      footer={
        <>
          <Link href="/login" className="font-semibold text-stone-900 underline-offset-2 hover:underline">로그인으로 돌아가기</Link>
          <span className="mx-2 text-stone-300">·</span>
          <Link href="/signup" className="underline-offset-2 hover:underline">회원가입</Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
