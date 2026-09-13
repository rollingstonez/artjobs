import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";
import AuthCard from "@/components/auth/AuthCard";
import { getSocialProviderStatus } from "@/lib/auth-providers";

export const metadata: Metadata = { title: "로그인 | 아트잡스" };

// /login?error=… 로 오는 안내. oauth: 소셜 실패, link_expired: 가입 확인 링크 만료, reset_expired: 재설정 링크 만료
const NOTICES: Record<string, string> = {
  oauth: "소셜 로그인에 실패했습니다. 다시 시도하거나 이메일로 로그인해 주세요.",
  link_expired: "확인 링크가 만료되었거나 이미 사용되었습니다. 로그인하면 확인 메일을 다시 보내 드립니다.",
  reset_expired: "비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 진행해 주세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/me";
  const notice = typeof sp.error === "string" ? NOTICES[sp.error] : undefined;
  const providers = await getSocialProviderStatus();
  return (
    <AuthCard
      title="로그인"
      lead="내 집 근처 공고 알림, 지원, 메시지는 로그인 후 쓸 수 있습니다."
      footer={
        <>
          처음이신가요?{" "}
          <Link href="/signup" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <LoginForm next={next} notice={notice} providers={providers} />
    </AuthCard>
  );
}
