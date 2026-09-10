import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "회원가입 | 아트잡스" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const role = sp.role === "organization" ? "organization" : sp.role === "artist" ? "artist" : null;
  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 md:px-6">
      <div className="py-8">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">회원가입</h1>
        <p className="mt-1 text-sm text-stone-600">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-stone-900 underline-offset-2 hover:underline">
            로그인
          </Link>
        </p>
      </div>
      <SignupForm initialRole={role} />
    </main>
  );
}
