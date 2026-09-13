"use client";
// 회원가입 폼. 순서: 역할 → 이메일 가입(이름·이메일·비밀번호) → 약관 동의 → 가입 → (아래) 소셜 가입.

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type ActionResult } from "@/lib/actions/auth";
import SocialLoginButtons, { OrDivider } from "@/components/SocialLoginButtons";
import PasswordInput from "@/components/forms/PasswordInput";
import { Field, inputClass } from "@/components/forms/ui";
import type { SocialProviderStatus } from "@/lib/auth-providers";
import { ACCOUNT_ROLES, type AccountRole } from "@/types/account";

export default function SignupForm({
  initialRole,
  providers,
}: {
  initialRole: AccountRole | null;
  providers: SocialProviderStatus;
}) {
  const [role, setRole] = useState<AccountRole | null>(initialRole);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUp, null);
  const agreed = agreeTerms && agreePrivacy;
  const isOrg = role === "organization";

  function setAll(v: boolean) {
    setAgreeTerms(v);
    setAgreePrivacy(v);
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        <fieldset>
          <legend className="text-sm font-bold text-stone-800">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[11px] text-white">1</span>
            어떤 회원으로 가입하나요?
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ACCOUNT_ROLES.map((r) => (
              <label
                key={r.code}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  role === r.code ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-stone-400"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r.code}
                  required
                  checked={role === r.code}
                  onChange={() => setRole(r.code)}
                  className="sr-only"
                />
                <span className="block text-base font-bold">{r.label}</span>
                <span className={`mt-1 block text-xs leading-snug ${role === r.code ? "text-stone-300" : "text-stone-500"}`}>
                  {r.note}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <p className="text-sm font-bold text-stone-800">
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-[11px] text-white">2</span>
            이메일로 가입
          </p>
          {isOrg && (
            <Field label="기관명">
              <input name="org_name" required className={inputClass} placeholder="예: 가상시립미술관" />
            </Field>
          )}
          <Field
            label={isOrg ? "담당자 이름" : "이름 또는 활동명"}
            hint={isOrg ? undefined : "인재정보에 공개되는 이름입니다. 본명 대신 활동명을 써도 됩니다."}
          >
            <input name="display_name" required className={inputClass} placeholder={isOrg ? "예: 김담당" : "예: 김예술"} />
          </Field>
          <Field label="이메일" hint="로그인과 알림에만 씁니다. 다른 회원에게 공개되지 않습니다.">
            <input name="email" type="email" required autoComplete="email" inputMode="email" className={inputClass} placeholder="name@example.com" />
          </Field>
          <Field label="비밀번호" hint="8자 이상. 영문·숫자를 섞으면 더 안전합니다.">
            <PasswordInput name="password" autoComplete="new-password" minLength={8} placeholder="8자 이상" />
          </Field>
          <Field label="비밀번호 확인">
            <PasswordInput name="password_confirm" autoComplete="new-password" minLength={8} placeholder="한 번 더 입력" />
          </Field>
        </div>

        <div className="space-y-1.5 rounded-lg bg-stone-100 p-3 text-sm">
          <label className="flex items-center gap-2 border-b border-stone-200 pb-2 font-semibold">
            <input type="checkbox" checked={agreed} onChange={(e) => setAll(e.target.checked)} />
            전체 동의
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="agree_terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5" />
            <span>
              <Link href="/terms" target="_blank" className="underline underline-offset-2">이용약관</Link>에 동의합니다 (필수)
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="agree_privacy" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5" />
            <span>
              <Link href="/privacy" target="_blank" className="underline underline-offset-2">개인정보처리방침</Link>에 동의합니다 (필수)
            </span>
          </label>
          <p className="pt-1 text-xs text-stone-500">
            전화번호는 받지 않습니다. 회원 간 연락은 아트잡스 메신저로만 이루어집니다.
          </p>
        </div>

        {state && !state.ok && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending || !agreed || !role}
          className="h-12 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "가입 중…" : "이메일로 가입하기"}
        </button>
        {(!agreed || !role) && (
          <p className="-mt-3 text-center text-xs text-stone-500">
            {!role ? "회원 종류를 고르고 " : ""}약관에 동의하면 가입할 수 있습니다.
          </p>
        )}
      </form>

      <OrDivider label="또는 소셜 계정으로 가입" />

      <SocialLoginButtons
        status={providers}
        role={role}
        disabled={!agreed || !role}
        disabledHint={`${!role ? "회원 종류를 고르고 " : ""}위 약관에 동의하면 소셜 계정으로 바로 가입할 수 있습니다.`}
      />
    </div>
  );
}
