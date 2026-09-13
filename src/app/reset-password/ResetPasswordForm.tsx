"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ActionResult } from "@/lib/actions/auth";
import PasswordInput from "@/components/forms/PasswordInput";
import { Field } from "@/components/forms/ui";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(resetPassword, null);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-sm text-stone-700">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800">
          <p className="font-semibold">비밀번호를 바꿨습니다.</p>
          <p className="mt-1 text-xs">지금부터 새 비밀번호로 로그인하면 됩니다. 이미 로그인된 상태입니다.</p>
        </div>
        <Link href="/me" className="block h-11 w-full rounded-lg bg-stone-900 text-center text-sm font-semibold leading-[44px] text-white hover:bg-stone-700">
          마이페이지로
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="새 비밀번호" hint="8자 이상. 영문·숫자를 섞으면 더 안전합니다.">
        <PasswordInput name="password" autoComplete="new-password" minLength={8} placeholder="8자 이상" />
      </Field>
      <Field label="새 비밀번호 확인">
        <PasswordInput name="password_confirm" autoComplete="new-password" minLength={8} placeholder="한 번 더 입력" />
      </Field>
      {state && !state.ok && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {pending ? "바꾸는 중…" : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
