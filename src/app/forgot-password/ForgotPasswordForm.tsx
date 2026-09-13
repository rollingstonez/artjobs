"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset, type ActionResult } from "@/lib/actions/auth";
import { Field, inputClass } from "@/components/forms/ui";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div className="space-y-4 text-sm text-stone-700">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800">
          <p className="font-semibold">메일을 보냈습니다.</p>
          <p className="mt-1 text-xs">
            <b>{email}</b> 이 가입된 주소라면 1~2분 안에 재설정 링크가 도착합니다. 링크는 한 번만 쓸 수 있고 시간이 지나면 만료됩니다.
          </p>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-600">
          <li>메일이 안 보이면 스팸함·프로모션함을 확인해 주세요.</li>
          <li>카카오·구글·애플로 가입한 계정은 비밀번호가 없습니다. 로그인 화면에서 그 버튼으로 들어오세요.</li>
          <li>가입한 주소가 기억나지 않으면 <Link href="/support" className="underline underline-offset-2">문의하기</Link>로 알려 주세요.</li>
        </ul>
        <Link href="/login" className="block h-11 w-full rounded-lg bg-stone-900 text-center text-sm font-semibold leading-[44px] text-white hover:bg-stone-700">
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="가입한 이메일">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="name@example.com"
        />
      </Field>
      {state && !state.ok && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {pending ? "보내는 중…" : "재설정 링크 보내기"}
      </button>
      <p className="text-xs text-stone-500">
        카카오·구글·애플로 가입한 계정은 비밀번호가 없습니다. 로그인 화면에서 해당 버튼으로 들어오세요.
      </p>
    </form>
  );
}
