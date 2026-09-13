"use client";
// 로그인 폼. 순서: 이메일 로그인 → 비밀번호 찾기 → (아래) 소셜 로그인.

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type ActionResult } from "@/lib/actions/auth";
import SocialLoginButtons, { OrDivider } from "@/components/SocialLoginButtons";
import PasswordInput from "@/components/forms/PasswordInput";
import { Field, inputClass } from "@/components/forms/ui";
import type { SocialProviderStatus } from "@/lib/auth-providers";

export default function LoginForm({
  next,
  notice,
  providers,
}: {
  next: string;
  notice?: string;
  providers: SocialProviderStatus;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signIn, null);
  return (
    <div className="space-y-6">
      {notice && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <Field label="이메일">
          <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} placeholder="name@example.com" />
        </Field>
        <Field label="비밀번호">
          <PasswordInput name="password" autoComplete="current-password" />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline">
            비밀번호를 잊으셨나요?
          </Link>
        </div>
        {state && !state.ok && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {pending ? "확인 중…" : "로그인"}
        </button>
      </form>

      <OrDivider label="또는 소셜 계정으로" />
      <SocialLoginButtons status={providers} next={next} />
    </div>
  );
}
