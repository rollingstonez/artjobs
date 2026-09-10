"use client";

import { useActionState } from "react";
import { signIn, type ActionResult } from "@/lib/actions/auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-semibold text-stone-800">이메일</span>
        <input name="email" type="email" required autoComplete="email" className={`${input} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-stone-800">비밀번호</span>
        <input name="password" type="password" required autoComplete="current-password" className={`${input} mt-1`} />
      </label>
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
