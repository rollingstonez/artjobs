import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "로그인 | 아트잡스" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/me";
  const oauthError = sp.error === "oauth";
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">로그인</h1>
        <p className="mt-1 text-sm text-stone-600">
          처음이신가요?{" "}
          <Link href="/signup" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
      <LoginForm next={next} oauthError={oauthError} />
    </main>
  );
}
