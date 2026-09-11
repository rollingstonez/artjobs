"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp, type ActionResult } from "@/lib/actions/auth";
import SocialLoginButtons, { OrDivider } from "@/components/SocialLoginButtons";
import { ENABLED_SOCIAL_PROVIDERS } from "@/lib/auth-providers";
import { ACCOUNT_ROLES, type AccountRole } from "@/types/account";

const input =
  "h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

export default function SignupForm({ initialRole }: { initialRole: AccountRole | null }) {
  const [role, setRole] = useState<AccountRole | null>(initialRole);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUp, null);
  const agreed = agreeTerms && agreePrivacy;
  const hasSocial = ENABLED_SOCIAL_PROVIDERS.length > 0;

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-bold text-stone-800">어떤 회원으로 가입하나요?</legend>
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

      {role && (
        <div className="space-y-3">
          <div className="space-y-1.5 rounded-lg bg-stone-100 p-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="agree_terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5" />
              <span>
                <Link href="/about" className="underline underline-offset-2">이용약관</Link>에 동의합니다 (필수)
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="agree_privacy" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="mt-0.5" />
              <span>
                <Link href="/about" className="underline underline-offset-2">개인정보 처리방침</Link>에 동의합니다 (필수)
              </span>
            </label>
            <p className="pt-1 text-xs text-stone-500">
              전화번호는 받지 않습니다. 회원 간 연락은 아트잡스 메신저로만 이루어집니다.
            </p>
          </div>

          {hasSocial && (
            <>
              <SocialLoginButtons
                role={role}
                disabled={!agreed}
                disabledHint={`위 두 항목에 동의하면 ${ENABLED_SOCIAL_PROVIDERS.map((p) => p.shortLabel).join("·")} 계정으로 바로 가입할 수 있습니다.`}
              />
              <OrDivider label="또는 이메일로 가입" />
            </>
          )}

          {role === "organization" && (
            <label className="block">
              <span className="text-sm font-semibold text-stone-800">기관명</span>
              <input name="org_name" required className={`${input} mt-1`} placeholder="예: 가상시립미술관" />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">
              {role === "artist" ? "이름 또는 활동명" : "담당자 이름"}
            </span>
            <input name="display_name" required className={`${input} mt-1`} />
            {role === "artist" && (
              <span className="mt-1 block text-xs text-stone-500">
                인재정보에 공개되는 이름입니다. 본명 대신 활동명을 써도 됩니다.
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">이메일</span>
            <input name="email" type="email" required autoComplete="email" className={`${input} mt-1`} />
            <span className="mt-1 block text-xs text-stone-500">
              로그인과 알림에만 씁니다. 다른 회원에게 공개되지 않습니다.
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-stone-800">비밀번호 (8자 이상)</span>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={`${input} mt-1`} />
          </label>

          {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-lg bg-stone-900 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {pending ? "가입 중…" : "가입하기"}
          </button>
        </div>
      )}
    </form>
  );
}
