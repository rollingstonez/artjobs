"use client";

import { useActionState } from "react";
import { resendConfirmation, type ActionResult } from "@/lib/actions/auth";
import { inputClass, secondaryBtn } from "@/components/forms/ui";

export default function ResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(resendConfirmation, null);
  return (
    <form action={action} className="space-y-2 border-t border-stone-200 pt-4">
      <p className="text-xs font-semibold text-stone-700">메일이 오지 않았나요? 다시 보내 드릴게요.</p>
      <div className="flex gap-2">
        <input name="email" type="email" required defaultValue={email} autoComplete="email" className={inputClass} placeholder="가입한 이메일" />
        <button type="submit" disabled={pending} className={`${secondaryBtn} shrink-0`}>
          {pending ? "보내는 중…" : "다시 보내기"}
        </button>
      </div>
      {state?.ok && <p className="text-xs text-emerald-700">다시 보냈습니다. 메일함을 확인해 주세요.</p>}
      {state && !state.ok && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
