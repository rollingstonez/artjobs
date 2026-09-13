import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "./SignupForm";
import AuthCard from "@/components/auth/AuthCard";
import { getSocialProviderStatus } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "회원가입 | 아트잡스" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const role = sp.role === "organization" ? "organization" : sp.role === "artist" ? "artist" : null;
  const providers = await getSocialProviderStatus();
  return (
    <AuthCard
      title="회원가입"
      lead="전화번호 없이 이메일만으로 가입합니다. 1분이면 끝나요."
      wide
      footer={
        <>
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
            로그인
          </Link>
        </>
      }
    >
      <SignupForm initialRole={role} providers={providers} />
    </AuthCard>
  );
}
