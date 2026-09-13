"use client";
// 설정 > 비밀번호 변경. 소셜로만 가입한 계정(hasPassword=false)은 처음 만드는 것이라 현재 비밀번호를 묻지 않는다.

import { useActionState } from "react";
import { Field, Notice, primaryBtn } from "@/components/forms/ui";
import PasswordInput from "@/components/forms/PasswordInput";
import { changePassword, type ActionResult } from "@/lib/actions/auth";

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-bold">{hasPassword ? "비밀번호 변경" : "비밀번호 만들기"}</h3>
      {!hasPassword && (
        <p className="text-xs text-stone-500">소셜 계정으로 가입하셨네요. 비밀번호를 만들어 두면 이메일로도 로그인할 수 있습니다.</p>
      )}
      {hasPassword && (
        <Field label="현재 비밀번호">
          <PasswordInput name="current_password" autoComplete="current-password" />
        </Field>
      )}
      <Field label="새 비밀번호" hint="8자 이상">
        <PasswordInput name="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="새 비밀번호 확인">
        <PasswordInput name="password_confirm" autoComplete="new-password" minLength={8} />
      </Field>
      {state && !state.ok && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="success">비밀번호를 바꿨습니다.</Notice>}
      <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "저장 중…" : "저장"}</button>
    </form>
  );
}
